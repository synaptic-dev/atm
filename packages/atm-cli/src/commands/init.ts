import fs from 'fs-extra';
import path from 'path';
import tar from 'tar';

const DEFAULT_TOOL_NAME = 'toolkit';
const TAR_URL = 'https://hnibcchiknipqongruty.supabase.co/storage/v1/object/public/atm_templates//toolkit.tar.gz';

export async function initTool(folderName?: string) {
  // If no folder name provided, use default
  const targetFolder = folderName || DEFAULT_TOOL_NAME;
  
  const ora = (await import('ora')).default;
  const spinner = ora('Initializing...').start();

  try {
    // Create target directory
    // const targetDir = path.join(process.cwd(), targetFolder);
    // if (fs.existsSync(targetDir)) {
    //   spinner.fail(`Error: Directory '${targetFolder}' already exists`);
    //   process.exit(1);
    // }

    // Create target directory
    // fs.mkdirSync(targetDir, { recursive: true });

    // Define the final directory
    const finalDir = path.join(process.cwd(), targetFolder);

    // Check if the final directory already exists
    if (fs.existsSync(finalDir)) {
      spinner.fail(`Error: Directory '${targetFolder}' already exists`);
      process.exit(1)
    }

    // Ensure the final directory is created before extraction
    fs.mkdirSync(finalDir, { recursive: true });

    // Download the tarball
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(TAR_URL);
    if (!response.ok) throw new Error(`Failed to download tarball: ${response.statusText}`);

    if (!response.body) throw new Error('Response body is null');

    // Define a temporary directory for extraction
    const tempDir = path.join(process.cwd(), '.temp-atm-init');
    fs.mkdirSync(tempDir, { recursive: true });

    // Extract the tarball to the temporary directory
    await new Promise((resolve, reject) => {
      response.body?.pipe(tar.extract({ cwd: tempDir }))
        .on('finish', resolve)
        .on('error', reject);
    });

    // Move contents from the nested directory to the final directory
    const extractedDir = path.join(tempDir, 'toolkit');
    if (fs.existsSync(extractedDir)) {
      fs.readdirSync(extractedDir).forEach(file => {
        fs.renameSync(path.join(extractedDir, file), path.join(finalDir, file));
      });
    }

    // Remove the temporary directory
    fs.removeSync(tempDir);

    // Remove unwanted files
    fs.readdirSync(finalDir).forEach(file => {
      if (file.startsWith('._')) {
        fs.removeSync(path.join(finalDir, file));
      }
    });

    spinner.succeed(`ATM Tool initialized successfully in '${targetFolder}'`);
    console.log('\nNext steps:');
    console.log(`1. cd ${targetFolder}`);
    console.log('2. Run "pnpm install" to install dependencies');
    console.log('3. Run "atm build" to build your tool');
    console.log('4. Run "atm publish" to publish your tool');
  } catch (error: any) {
    spinner.fail('Failed to initialize ATM Tool: Clock');
    console.error('Failed to initialize ATM Tool: Clock:', error?.message || error);
    process.exit(1);
  }
} 