#!/usr/bin/env node
import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import os from 'os';
import { buildTool } from './commands/build';
import { publishTool } from './commands/publish';
import { login } from './commands/login';
import { initTool } from './commands/init';
import { version } from './commands/version';

const SUPABASE_URL='https://hnibcchiknipqongruty.supabase.co'
const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaWJjY2hpa25pcHFvbmdydXR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE4NDA3MTksImV4cCI6MjA0NzQxNjcxOX0.ocOf570HeHOoc8ZgKyXeLAJEO90BJ-yQfnPtgBiINKs'

const CONFIG_DIR = path.join(os.homedir(), '.atm');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Get initial access token
let initialAccessToken = '';
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    initialAccessToken = config.access_token;
  }
} catch (error) {
  console.error('Error reading config file:', error);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  accessToken: () => {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
        return config.access_token;
      }
    } catch (error) {
      console.error('Error reading config file:', error);
    }
    return null;
  }
});

const program = new Command();

program
  .name('atm')
  .description('ATM (Agent Tool Manager) CLI')
  .version(require('../package.json').version);

program
  .command('init')
  .description('Initialize a new ATM tool from template')
  .argument('[folder]', 'Folder name to create the tool in')
  .action(initTool);

program
  .command('login')
  .description('Login to ATM')
  .action(login);

program
  .command('build')
  .description('Build an ATM tool')
  .argument('[path]', 'Path to tool entry file', 'index.ts')
  .action(buildTool);

program
  .command('publish')
  .description('Publish tool to ATM registry')
  .argument('[path]', 'Path to tool directory', '.')
  .action(publishTool);

program
  .command('version')
  .description('Show ATM CLI version')
  .action(version);

program.parse(); 