import path from 'path';
import fs from 'fs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CONFIG_FILE } from '../config';

interface Config {
  access_token: string;
  user_id: string;
  username: string;
  supabase_url: string;
  supabase_key: string;
}

interface ToolMetadata {
  name: string;
  handle: string;
  description: string;
  capabilities: Array<{
    name: string;
    description: string;
    key: string;
  }>;
}

interface Tool {
  id: string;
  handle: string;
  name: string;
  description: string;
  owner_id: string;
  owner_username: string;
  file_path: string;
}

function getConfig(): Config {
  if (!fs.existsSync(CONFIG_FILE)) {
    throw new Error('Please login first using: atm login');
  }
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
}

function createSupabaseClient(config: Config): SupabaseClient {
  return createClient(config.supabase_url, config.supabase_key, {
    accessToken: () => Promise.resolve(config.access_token)
  });
}

// Helper function to check if an error is related to authentication
function isAuthError(error: any): boolean {
  // Check if the error message contains common auth-related terms
  if (error && error.message) {
    const message = error.message.toLowerCase();
    return (
      message.includes('unauthorized') ||
      message.includes('authentication') ||
      message.includes('auth') ||
      message.includes('permission') ||
      message.includes('token') ||
      message.includes('expired') ||
      message.includes('jwt') ||
      message.includes('401')
    );
  }
  
  // Check for Supabase specific error codes
  if (error && error.code) {
    return (
      error.code === 401 ||
      error.code === '401' ||
      error.code === 'PGRST401' ||
      error.code === 'authenticated' ||
      error.code.toString().includes('auth')
    );
  }
  
  return false;
}

async function uploadDirectory(config: Config, userId: string, handle: string, dirPath: string): Promise<string | null> {
  const supabase = createSupabaseClient(config);
  const files: string[] = [];
  
  // Recursively get all files in the directory
  function getAllFiles(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        getAllFiles(fullPath);
      } else {
        files.push(fullPath);
      }
    }
  }
  
  try {
    getAllFiles(dirPath);
  } catch (err) {
    return null;
  }
  
  // Upload each file without showing progress
  const uploads = files.map(async (filePath) => {
    const relativePath = path.relative(dirPath, filePath);
    const pathParts = relativePath.split(path.sep);
    
    // Initialize storage path
    let storagePath;
    
    // Check if this is metadata.json (directly in atm-dist)
    if (pathParts.length === 1) {
      storagePath = `${userId}/${handle}/${relativePath}`;
    } else {
      // For files in tool subdirectories (atm-dist/[tool-name]/...)
      // Skip the first level directory which is the tool name
      // This prevents duplication since 'handle' already has the tool name
      const modifiedPath = pathParts.slice(1).join('/');
      storagePath = `${userId}/${handle}/${modifiedPath}`;
    }
    
    try {
      const fileContent = fs.readFileSync(filePath);
      
      const { error: uploadError } = await supabase.storage
        .from('atm_tools')
        .upload(storagePath, fileContent, {
          contentType: 'text/plain',
          upsert: true
        });
        
      if (uploadError) {
        return null;
      }
      
      return storagePath;
    } catch (err) {
      return null;
    }
  });
  
  try {
    const results = await Promise.all(uploads);
    
    // Check if any upload failed
    if (results.includes(null)) {
      return null;
    }
    
    return `${userId}/${handle}`;
  } catch (error) {
    return null;
  }
}

export async function publishTool(toolPath: string = '.'): Promise<void> {
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
    // Check if atm-dist directory exists
    const distPath = path.join(process.cwd(), 'atm-dist');
    if (!fs.existsSync(distPath)) {
      spinner.fail('No atm-dist directory found');
      console.error('Please run `atm build` first.');
      process.exit(1);
    }
    
    let config;
    try {
      config = getConfig();
    } catch (error) {
      spinner.fail('Failed to load configuration');
      console.error('Authentication failed or expired. Please login again:');
      console.error('Run: atm login');
      process.exit(1);
    }
    
    const supabase = createSupabaseClient(config);
    const userId = config.user_id;
    const username = config.username;

    if (!userId || !username) {
      spinner.fail('User information missing');
      console.error('Authentication failed or expired. Please login again:');
      console.error('Run: atm login');
      process.exit(1);
    }

    // Find all tool directories in atm-dist
    let entries;
    try {
      entries = fs.readdirSync(distPath, { withFileTypes: true });
    } catch (error) {
      spinner.fail('Failed to read directory contents');
      console.error('Authentication failed or expired. Please login again:');
      console.error('Run: atm login');
      process.exit(1);
    }
    
    const toolDirs = entries.filter(entry => 
      entry.isDirectory() && 
      fs.existsSync(path.join(distPath, entry.name, 'metadata.json'))
    );

    if (toolDirs.length === 0) {
      spinner.fail('No tools found');
      console.error('No tool directories with metadata.json found in atm-dist');
      process.exit(1);
    }

    // Show how many tools were found
    spinner.succeed(`Found ${toolDirs.length} tools to publish`);
    
    // Log directly for visibility of initial tool publishing
    const firstToolName = toolDirs[0].name;
    console.log(`Publishing tool: ${firstToolName}`);
    
    // Create a new spinner for uploading
    spinner = ora('').start();

    // Upload the entire dist directory contents silently (done in the background)
    const basePath = await uploadDirectory(config, userId, toolDirs[0].name, distPath);
    
    if (!basePath) {
      spinner.fail('Upload failed. Please login first using: atm login');
      process.exit(1);
    }

    // Process each tool
    for (const toolDir of toolDirs) {
      let toolMetadata, toolMetadataPath;
      try {
        const toolDirPath = path.join(distPath, toolDir.name);
        toolMetadataPath = path.join(toolDirPath, 'metadata.json');
        
        // Read the tool-specific metadata
        toolMetadata = JSON.parse(fs.readFileSync(toolMetadataPath, 'utf-8')) as ToolMetadata;
      } catch (error) {
        spinner.fail('Failed to read tool metadata');
        console.error('Authentication failed or expired. Please login again:');
        console.error('Run: atm login');
        process.exit(1);
      }
      
      const { handle, name, description } = toolMetadata;
      
      // Update spinner text for subsequent tools
      if (toolDir !== toolDirs[0]) {
        spinner = ora('').stop();
        console.log(`Publishing tool: ${name}`);
        spinner = ora('').start();
      }

      // Check if tool exists and belongs to the user
      try {
        const { data: existingTool, error: toolCheckError } = await supabase
          .from('atm_tools')
          .select('*')
          .eq('handle', handle)
          .eq('owner_username', username)
          .single();

        if (toolCheckError && toolCheckError.code !== 'PGRST116') {
          if (isAuthError(toolCheckError)) {
            spinner.fail(`Authentication failed for tool: ${name}`);
            console.error('Authentication failed or expired. Please login again:');
            console.error('Run: atm login');
            process.exit(1);
          }
          spinner.fail(`Failed to check tool: ${name}`);
          console.error('Authentication failed or expired. Please login again:');
          console.error('Run: atm login');
          process.exit(1);
        }

        if (existingTool && existingTool.owner_username !== username) {
          spinner.fail(`Permission error for tool: ${name}`);
          console.error(`You do not have permission to update tool: ${name}`);
          process.exit(1);
        }
      } catch (error) {
        spinner.fail(`Failed to check tool: ${name}`);
        console.error('Authentication failed or expired. Please login again:');
        console.error('Run: atm login');
        process.exit(1);
      }

      // Save or update tool metadata to database
      let tool;
      try {
        const { data, error: toolError } = await supabase
          .from('atm_tools')
          .upsert({
            handle,
            name,
            description,
            owner_username: username,
            file_path: basePath,
            owner_id: userId
          }, {
            onConflict: 'handle,owner_username,owner_id'
          })
          .select()
          .single();

        if (toolError) {
          if (isAuthError(toolError)) {
            spinner.fail(`Authentication failed for tool: ${name}`);
            console.error('Authentication failed or expired. Please login again:');
            console.error('Run: atm login');
            process.exit(1);
          }
          spinner.fail(`Failed to save metadata for tool: ${name}`);
          console.error('Authentication failed or expired. Please login again:');
          console.error('Run: atm login');
          process.exit(1);
        }

        if (!data) {
          spinner.fail(`Failed to get tool ID for: ${name}`);
          console.error('Authentication failed or expired. Please login again:');
          console.error('Run: atm login');
          process.exit(1);
        }
        
        tool = data;
      } catch (error) {
        spinner.fail(`Failed to save metadata for tool: ${name}`);
        console.error('Authentication failed or expired. Please login again:');
        console.error('Run: atm login');
        process.exit(1);
      }

      // Delete existing capabilities for this tool
      try {
        const { error: deleteError } = await supabase
          .from('atm_tool_capabilities')
          .delete()
          .eq('tool_id', tool.id);

        if (deleteError) {
          if (isAuthError(deleteError)) {
            spinner.fail(`Authentication failed for tool: ${name}`);
            console.error('Authentication failed or expired. Please login again:');
            console.error('Run: atm login');
            process.exit(1);
          }
          spinner.fail(`Failed to update capabilities for tool: ${name}`);
          console.error('Authentication failed or expired. Please login again:');
          console.error('Run: atm login');
          process.exit(1);
        }
      } catch (error) {
        spinner.fail(`Failed to update capabilities for tool: ${name}`);
        console.error('Authentication failed or expired. Please login again:');
        console.error('Run: atm login');
        process.exit(1);
      }

      // Save capabilities metadata to database
      try {
        for (const capability of toolMetadata.capabilities) {
          const { error: capabilityError } = await supabase
            .from('atm_tool_capabilities')
            .upsert({
              tool_id: tool.id,
              name: capability.name,
              description: capability.description,
              key: capability.key
            }, {
              onConflict: 'tool_id,key'
            });

          if (capabilityError) {
            if (isAuthError(capabilityError)) {
              spinner.fail(`Authentication failed for tool: ${name}`);
              console.error('Authentication failed or expired. Please login again:');
              console.error('Run: atm login');
              process.exit(1);
            }
            spinner.fail(`Failed to save capability for tool: ${name}`);
            console.error('Authentication failed or expired. Please login again:');
            console.error('Run: atm login');
            process.exit(1);
          }
        }
      } catch (error) {
        spinner.fail(`Failed to save capability for tool: ${name}`);
        console.error('Authentication failed or expired. Please login again:');
        console.error('Run: atm login');
        process.exit(1);
      }
      
      // Show publish success and URL
      spinner.stop();
      console.log(`Publish success: https://try-synaptic.ai/atm/tools/${username}/${handle}`);
    }

    // Final success message
    spinner = ora('').start();
    spinner.succeed(`All tools published successfully`);
  } catch (error) {
    spinner.fail('Publish failed');
    console.error('Authentication failed or expired. Please login again:');
    console.error('Run: atm login');
    process.exit(1);
  }
}
