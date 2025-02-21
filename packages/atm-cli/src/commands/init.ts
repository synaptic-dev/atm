import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const TEMPLATE_REPO = 'synaptic-dev/atm';
const TEMPLATE_PATH = 'packages/templates/hello-world';
const DEFAULT_TOOL_NAME = 'hello-world';

export async function initTool(folderName?: string) {
  // If no folder name provided, use default
  const targetFolder = folderName || DEFAULT_TOOL_NAME;
  
  console.log('Downloading ATM tool template...');

  try {
    // Create target directory
    const targetDir = path.join(process.cwd(), targetFolder);
    if (fs.existsSync(targetDir)) {
      console.error(`Error: Directory '${targetFolder}' already exists`);
      process.exit(1);
    }
    fs.mkdirSync(targetDir);

    // Create a temporary directory
    const tempDir = path.join(process.cwd(), '.temp-atm-init');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    // Clone the template repository
    console.log('Downloading template...');
    execSync(`git clone --depth 1 https://github.com/${TEMPLATE_REPO}.git ${tempDir}`);

    // Copy template files to target directory
    const templateDir = path.join(tempDir, TEMPLATE_PATH);
    console.log('Copying template files...');
    fs.cpSync(templateDir, targetDir, { recursive: true });

    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });

    console.log(`\n✨ Template downloaded successfully to '${targetFolder}'`);
    console.log('\nNext steps:');
    console.log(`1. cd ${targetFolder}`);
    console.log('2. Run "pnpm install" to install dependencies');
    console.log('3. Edit atm.json to update tool metadata');
    console.log('4. Modify index.ts to add your tool capabilities');
  } catch (error: any) {
    console.error('Failed to download template:', error?.message || error);
    process.exit(1);
  }
} 