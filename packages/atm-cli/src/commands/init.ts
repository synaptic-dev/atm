import fs from 'fs-extra';
import path from 'path';
import tar from 'tar';

const DEFAULT_TOOL_NAME = 'clock';
const TAR_URL = 'https://pub-ee758d275cb148019713d28a6f6e37d3.r2.dev/clock.tar.gz';

export async function initTool(folderName?: string) {
  // If no folder name provided, use default
  const targetFolder = folderName || DEFAULT_TOOL_NAME;
  
  const ora = (await import('ora')).default;
  const spinner = ora('Downloading ATM Tool: Clock').start();

  try {
    // Create target directory
    const targetDir = path.join(process.cwd(), targetFolder);
    if (fs.existsSync(targetDir)) {
      spinner.fail(`Error: Directory '${targetFolder}' already exists`);
      process.exit(1);
    }

    // Create target directory
    fs.mkdirSync(targetDir, { recursive: true });

    // Download the tarball
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(TAR_URL);
    if (!response.ok) throw new Error(`Failed to download tarball: ${response.statusText}`);

    if (!response.body) throw new Error('Response body is null');

    // Create a temporary directory for extraction
    const tempDir = path.join(process.cwd(), '.temp-atm-init');
    fs.mkdirSync(tempDir, { recursive: true });

    // Extract the tarball to the temporary directory
    await new Promise((resolve, reject) => {
      response.body?.pipe(tar.extract({ cwd: tempDir }))
        .on('finish', resolve)
        .on('error', reject);
    });

    // Move contents from the nested directory to the target directory
    const extractedDir = path.join(tempDir, 'clock');
    fs.copySync(extractedDir, targetDir);

    // Remove the temporary directory
    fs.removeSync(tempDir);

    // Remove unwanted files
    fs.readdirSync(targetDir).forEach(file => {
      if (file.startsWith('._')) {
        fs.removeSync(path.join(targetDir, file));
      }
    });

    spinner.succeed(`ATM Tool: Clock initialized successfully in '${targetFolder}'`);
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