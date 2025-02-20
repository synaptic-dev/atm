#!/usr/bin/env node
import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { S3Client } from '@aws-sdk/client-s3';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { createClient } from '@supabase/supabase-js';
import http from 'http';
import os from 'os';
import { buildTool } from './commands/build';
import { publishTool } from './commands/publish';
import { login } from './commands/login';

const SUPABASE_URL='https://hnibcchiknipqongruty.supabase.co'
const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaWJjY2hpa25pcHFvbmdydXR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE4NDA3MTksImV4cCI6MjA0NzQxNjcxOX0.ocOf570HeHOoc8ZgKyXeLAJEO90BJ-yQfnPtgBiINKs'

const s3Client = new S3Client({ 
  region: 'us-west-2',
  credentials: fromNodeProviderChain()
});
const BUCKET_NAME = 'atm-tools';
const AUTH_PORT = 42420;
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
  .version('1.0.0');

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
  .description('Publish tool to S3')
  .argument('[path]', 'Path to tool directory', '.')
  .action(publishTool);

program.parse();
