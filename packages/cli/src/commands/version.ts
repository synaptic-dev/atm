import fs from 'fs';
import path from 'path';

export async function version() {
  try {
    // Read package.json from the package root
    const packageJsonPath = path.join(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    
    console.log(`OpenKit CLI version ${packageJson.version}`);
  } catch (error: any) {
    console.error('Failed to read version:', error?.message || error);
    process.exit(1);
  }
} 