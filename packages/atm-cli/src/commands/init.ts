import fs from 'fs-extra';
import path from 'path';

const TEMPLATE_PATH = path.join(__dirname, '../template/clock');
const DEFAULT_TOOL_NAME = 'clock';

export async function initTool(folderName?: string) {
  // If no folder name provided, use default
  const targetFolder = folderName || DEFAULT_TOOL_NAME;
  
  const ora = (await import('ora')).default;
  const spinner = ora('Initializing ATM Tool: Clock').start();

  try {
    // Create target directory
    const targetDir = path.join(process.cwd(), targetFolder);
    if (fs.existsSync(targetDir)) {
      spinner.fail(`Error: Directory '${targetFolder}' already exists`);
      process.exit(1);
    }

    // Copy the clock folder to the target directory
    await fs.copy(TEMPLATE_PATH, targetDir);

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