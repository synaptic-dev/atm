import path from 'path';
import fs from 'fs';
import { CONFIG_FILE } from '../config';
import os from 'os';
import tar from 'tar';
import fetch from 'node-fetch';

interface Config {
  refresh_token: string;
  access_token: string;
  user_id: string;
  username: string;
  supabase_url: string;
  supabase_key: string;
}

interface PublishOptions {
  target?: string;
  userid?: string;
}

function getConfig(): Config {
  if (!fs.existsSync(CONFIG_FILE)) {
    throw new Error('Please login first using: atm login');
  }
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
}

// Helper function to find all tool files recursively
function findToolFiles(directory: string): { path: string, name: string }[] {
  const result: { path: string, name: string }[] = [];
  
  // Get all entries in the directory
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  
  // Process each entry
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    
    if (entry.isDirectory()) {
      // Recursively process subdirectories
      const subDirTools = findToolFiles(entryPath);
      result.push(...subDirTools);
    } else if (entry.name.endsWith('.ts')) {
      // Add TypeScript files to the result
      result.push({ 
        path: entryPath,
        name: entry.name.slice(0, -3) // Remove .ts extension
      });
    }
  }
  
  return result;
}

// Upload a tool as a tarball to the API
async function uploadToolTarball(userId: string, toolName: string, targetDir: string, accessToken: string, refreshToken: string, spinner: any): Promise<boolean> {
  const tarballPath = path.join(os.tmpdir(), `${toolName}.tar.gz`);
  
  try {
    // Create a tarball of the directory
    await tar.create(
      {
        gzip: true,
        file: tarballPath,
        cwd: path.dirname(targetDir),
      },
      [path.basename(targetDir)]
    );
    
    // Upload the tarball to the API
    const fileContent = fs.readFileSync(tarballPath);
    
    spinner.text = `Uploading ${toolName} to API...`;
    const response = await fetch(`http://localhost:8787/upload?userId=${encodeURIComponent(userId)}&refreshToken=${encodeURIComponent(refreshToken)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-gzip',
        'Tool-Name': toolName,
        'Authorization': `Bearer ${accessToken}`,
      },
      body: fileContent
    });
    
    // Clean up the temporary file
    fs.unlinkSync(tarballPath);
    
    if (response.ok) {
      return true;
    } else {
      console.error('Upload failed:', response.statusText);
      return false;
    }
  } catch (err) {
    console.error('Error creating or uploading tarball:', err);
    // Clean up if file exists
    if (fs.existsSync(tarballPath)) {
      fs.unlinkSync(tarballPath);
    }
    return false;
  }
}

export async function publishTool(options: PublishOptions = {}): Promise<void> {
  // Dynamically import ora
  let ora;
  try {
    ora = (await import('ora')).default;
  } catch (error) {
    console.error('Failed to initialize. Please try again.');
    process.exit(1);
  }
  
  // Log directly first to ensure visibility
  console.log('Publishing to ATM...');
  
  let spinner = ora('').start();
  
  try {
    // Get the target directory
    const targetDir = options.target || 'atm-dist';
    const targetPath = path.resolve(process.cwd(), targetDir);
    
    // Check if target directory exists
    if (!fs.existsSync(targetPath)) {
      spinner.fail(`No ${targetDir} directory found`);
      console.error(`Directory ${targetDir} does not exist.`);
      process.exit(1);
    }
    
    // Get config information
    let config;
    try {
      config = getConfig();
      console.log('config', config)
    } catch (error) {
      spinner.fail('Failed to load configuration');
      console.error('Authentication failed or expired. Please login again:');
      console.error('Run: atm login');
      process.exit(1);
    }
    
    // Get user ID from options or config
    let userId = options.userid;
    if (!userId) {
      if (config && config.user_id) {
        userId = config.user_id;
      } else {
        spinner.fail('User ID is required');
        console.error('Please provide a user ID with --userid or login using: atm login');
        process.exit(1);
      }
    }
    
    // Get access token from config
    const accessToken = config.access_token;
    const refreshToken = config.refresh_token;
    if (!accessToken) {
      spinner.fail('Access token is required');
      console.error('Please login using: atm login');
      process.exit(1);
    }

    // Find all tool files in target directory and its subdirectories
    let toolFiles;
    try {
      toolFiles = findToolFiles(targetPath);
    } catch (error) {
      spinner.fail('Failed to read directory contents');
      console.error(`Error reading ${targetDir} directory:`, error);
      process.exit(1);
    }
    
    if (toolFiles.length === 0) {
      spinner.fail('No tools found');
      console.error(`No tool files found in ${targetDir} or its subdirectories`);
      process.exit(1);
    }

    // Show how many tools were found
    spinner.succeed(`Found ${toolFiles.length} tools to publish`);
    
    // Process each tool
    for (const toolFile of toolFiles) {
      // Extract tool name from path
      const toolName = toolFile.name;
      const toolPath = path.dirname(toolFile.path);
      
      // Log directly for visibility of tool publishing
      console.log(`Publishing tool: ${toolName} from ${toolPath}`);
      
      // Create a new spinner for uploading
      spinner = ora('').start();

      // Upload the tool file as a tarball
      const success = await uploadToolTarball(userId, toolName, toolPath, accessToken, refreshToken, spinner);
      
      if (!success) {
        spinner.fail(`Failed to publish tool: ${toolName}`);
        process.exit(1);
      }

      // Success!
      spinner.succeed(`Published tool: ${toolName}`);
    }

    console.log(`\nTools published successfully! 🚀`);
    
  } catch (error: any) {
    spinner.fail('Publishing failed');
    console.error(error?.message || error);
    process.exit(1);
  }
}
