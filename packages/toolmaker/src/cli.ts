#!/usr/bin/env node
import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { build } from 'esbuild';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { Tool } from './index';
import JSZip from 'jszip';
import { createClient } from '@supabase/supabase-js';
import { generateWorkerCode } from './worker-builder';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { writeFile } from 'fs/promises';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import http from 'http';
import os from 'os';

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

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Worker API endpoint
const WORKER_API = process.env.WORKER_API || '';

function toSnakeCase(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '_');
}

async function execWrangler(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const wrangler = spawn('npx', ['wrangler', ...args], {
      stdio: ['inherit', 'pipe', 'pipe']  // Capture both stdout and stderr
    });

    let output = '';
    let errorOutput = '';

    wrangler.stdout?.on('data', (data) => {
      const str = data.toString();
      output += str;
      process.stdout.write(str);  // Show output in real-time
    });

    wrangler.stderr?.on('data', (data) => {
      const str = data.toString();
      errorOutput += str;
      process.stderr.write(str);  // Show errors in real-time
    });

    wrangler.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Wrangler command failed with code ${code}\nError: ${errorOutput}`));
      }
    });
  });
}

async function buildTool(toolPath: string) {
  try {
    // Read atm.json for metadata
    const atmJsonPath = path.join(process.cwd(), 'atm.json');
    if (!fs.existsSync(atmJsonPath)) {
      console.error('No atm.json found in current directory');
      process.exit(1);
    }

    const metadata = JSON.parse(fs.readFileSync(atmJsonPath, 'utf-8'));
    const { handle } = metadata;

    if (!handle) {
      console.error('No handle found in atm.json');
      process.exit(1);
    }

    // Build the TypeScript file to get capabilities
    const outfile = path.join(process.cwd(), '.temp.mjs');
    await build({
      entryPoints: [path.resolve(toolPath)],
      bundle: true,
      format: 'esm',
      outfile,
      platform: 'node',
    });

    // Import the built tool
    const toolModule = await import(outfile + '?t=' + Date.now());
    const tool: Tool = toolModule.default;
    const { capabilities } = tool.toJSON();

    // Cleanup temp file
    fs.unlinkSync(outfile);

    // Create dist directory
    const distPath = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(distPath)) {
      fs.mkdirSync(distPath);
    }

    // Create capabilities directory
    const capabilitiesPath = path.join(distPath, 'capabilities');
    if (!fs.existsSync(capabilitiesPath)) {
      fs.mkdirSync(capabilitiesPath);
    }

    // Write metadata.json (combining atm.json metadata with capabilities info)
    fs.writeFileSync(
      path.join(distPath, 'metadata.json'),
      JSON.stringify({
        ...metadata,
        capabilities: capabilities.map(({ name, description }) => ({
          name,
          description
        }))
      }, null, 2)
    );

    // Write each capability
    capabilities.forEach((capability) => {
      const capabilityDir = path.join(capabilitiesPath, capability.name.toLowerCase().replace(/\s+/g, '-'));
      if (!fs.existsSync(capabilityDir)) {
        fs.mkdirSync(capabilityDir);
      }

      // Write schema.json
      const jsonSchema = (capability.schema as any).type === 'function'
        ? capability.schema
        : {
            type: 'function',
            function: {
              name: toSnakeCase(capability.name),
              parameters: zodToJsonSchema(capability.schema as z.ZodType),
              description: capability.description
            }
          };
      fs.writeFileSync(
        path.join(capabilityDir, 'schema.json'),
        JSON.stringify(jsonSchema, null, 2)
      );

      // Write runner.ts
      const runnerCode = `export const runner = ${capability.runner.toString()};`;
      fs.writeFileSync(path.join(capabilityDir, 'runner.ts'), runnerCode);
    });

    // Create zip file with handle as name
    const zip = new JSZip();
    const files = fs.readdirSync(distPath, { recursive: true }) as string[];

    // Add all files to the zip
    for (const file of files) {
      const filePath = path.join(distPath, file);
      if (fs.statSync(filePath).isFile()) {
        const fileContent = fs.readFileSync(filePath);
        zip.file(file, fileContent);
      }
    }

    // Generate zip file
    const zipContent = await zip.generateAsync({ type: "nodebuffer" });
    const zipPath = path.join(process.cwd(), `${handle}.zip`);
    fs.writeFileSync(zipPath, zipContent);

    console.log(`Tool built successfully as ${handle}.zip`);
  } catch (error) {
    console.error('Error building tool:', error);
    process.exit(1);
  }
}

async function publishTool(toolPath: string) {
  try {
    // Read atm.json for handle
    const atmJsonPath = path.join(process.cwd(), 'atm.json');
    if (!fs.existsSync(atmJsonPath)) {
      console.error('No atm.json found in current directory');
      process.exit(1);
    }

    const metadata = JSON.parse(fs.readFileSync(atmJsonPath, 'utf-8'));
    const { handle, name } = metadata;
    if (!handle) {
      console.error('No handle found in atm.json');
      process.exit(1);
    }

    const zipPath = path.join(process.cwd(), `${handle}.zip`);
    if (!fs.existsSync(zipPath)) {
      console.error(`No ${handle}.zip found. Run \`atm build\` first.`);
      process.exit(1);
    }

    console.log(`Publishing ${handle}.zip to s3://${BUCKET_NAME}/...`);
    
    // Upload the zip file directly to bucket root
    const zipContent = fs.readFileSync(zipPath);
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `${handle}.zip`,
      Body: zipContent,
      ContentType: 'application/zip'
    }));

    console.log('Tool uploaded to S3 successfully!');

    // Read capabilities from dist
    const distPath = path.join(process.cwd(), 'dist');
    const capabilitiesPath = path.join(distPath, 'capabilities');
    const capabilityDirs = fs.readdirSync(capabilitiesPath);

    // Deploy each capability as a worker
    console.log('Deploying workers...');
    const capabilityUrls = new Map<string, string>();
    
    for (const capDir of capabilityDirs) {
      const capabilityPath = path.join(capabilitiesPath, capDir);
      const runnerPath = path.join(capabilityPath, 'runner.ts');
      const runnerCode = fs.readFileSync(runnerPath, 'utf-8');
      
      console.log(`Building worker for ${capDir}...`);
      // Generate worker code that wraps the runner
      const workerCode = generateWorkerCode();
      const workerPath = path.join(capabilityPath, 'worker.js');
      fs.writeFileSync(workerPath, workerCode);

      // Bundle the worker code with the runner
      const bundlePath = path.join(capabilityPath, 'bundle.js');
      await build({
        entryPoints: [workerPath],
        bundle: true,
        format: 'esm',
        outfile: bundlePath,
        platform: 'browser',
      });

      // Create wrangler.toml for the worker
      const workerName = `${handle}-${toSnakeCase(capDir)}`;
      const WORKERS_DOMAIN = 'me-98b.workers.dev';
      const wranglerConfig = `
name = "${workerName}"
main = "${path.relative(process.cwd(), bundlePath)}"
compatibility_date = "2024-02-14"
workers_dev = true

[build]
command = ""
`;
      const wranglerPath = path.join(process.cwd(), 'wrangler.toml');
      await writeFile(wranglerPath, wranglerConfig);

      // Deploy the worker using wrangler
      console.log(`Deploying worker for ${capDir}...`);
      try {
        await execWrangler(['deploy']);  // Simplified deployment command
        const workerUrl = `https://${workerName}.${WORKERS_DOMAIN}`;
        capabilityUrls.set(capDir, workerUrl);
        console.log(`Worker for ${capDir} deployed to ${workerUrl}`);
      } catch (error) {
        console.error(`Failed to deploy worker for ${capDir}:`, error);
        throw error;
      }

      // Clean up temporary files
      fs.unlinkSync(workerPath);
      fs.unlinkSync(bundlePath);
      fs.unlinkSync(wranglerPath);
    }

    // Check if provider exists in Supabase
    console.log('Checking provider in Supabase...');
    const { data: existingProvider, error: selectError } = await supabase
      .from('providers')
      .select('*')
      .eq('provider_key', handle)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {  // PGRST116 is "not found"
      console.error('Error checking provider:', selectError);
      throw selectError;
    }

    // Add or update provider
    console.log(existingProvider ? 'Updating provider...' : 'Adding new provider...');
    const { error: upsertError } = await supabase
      .from('providers')
      .upsert({
        name,
        provider_key: handle,
        scope: [],
        capabilities: capabilityDirs.map(dir => toSnakeCase(dir))
      }, {
        onConflict: 'provider_key',
        ignoreDuplicates: false
      });

    if (upsertError) {
      console.error('Error upserting provider:', upsertError);
      throw upsertError;
    }

    // Add or update tool schemas
    console.log('Adding tool schemas to Supabase...');
    for (const capDir of capabilityDirs) {
      const schemaPath = path.join(capabilitiesPath, capDir, 'schema.json');
      const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
      const capabilityName = toSnakeCase(capDir);
      
      const { error } = await supabase
        .from('tool_schemas')
        .upsert({
          provider: handle,
          name: capabilityName,
          schema,
          runner_url: capabilityUrls.get(capDir)
        }, {
          onConflict: 'name,provider'
        });

      if (error) {
        console.error('Error upserting tool schema:', error);
        throw error;
      }
      console.log(`Schema for ${capabilityName} added/updated`);
    }

    console.log('Tool published successfully!');
  } catch (error) {
    console.error('Error publishing tool:', error);
    process.exit(1);
  }
}

async function login() {
  const loginUrl = `http://localhost:3000/api/atm/login?next=${encodeURIComponent(`http://localhost:${AUTH_PORT}`)}`;
  
  console.log('\nTo login to ATM, please visit:');
  console.log('\x1b[36m%s\x1b[0m', loginUrl); // Cyan color for URL
  console.log('\nWaiting for authentication...');

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url!, `http://localhost:${AUTH_PORT}`);
    const accessToken = url.searchParams.get('access_token');
    const refreshToken = url.searchParams.get('refresh_token');

    if (accessToken && refreshToken) {
      // Create config directory if it doesn't exist
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }

      // Save tokens to config file
      const config = {
        access_token: accessToken,
        refresh_token: refreshToken,
        updated_at: new Date().toISOString()
      };

      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

      // Send success response
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body>
            <h1>Authentication Successful!</h1>
            <p>You can now close this window and return to the terminal.</p>
            <script>window.close()</script>
          </body>
        </html>
      `);

      // Close server after successful authentication
      server.close(() => {
        console.log('\n✨ Authentication successful! You can now use ATM commands.');
        process.exit(0);
      });
    } else {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body>
            <h1>Authentication Failed</h1>
            <p>Missing required tokens. Please try again.</p>
          </body>
        </html>
      `);
    }
  });

  server.listen(AUTH_PORT, () => {
    console.log(`Local server started on port ${AUTH_PORT}`);
  });

  // Handle server errors
  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${AUTH_PORT} is already in use. Please try again later.`);
    } else {
      console.error('Server error:', error);
    }
    process.exit(1);
  });
}

// Helper function to get stored tokens
export function getStoredTokens(): { access_token?: string, refresh_token?: string } {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      return {
        access_token: config.access_token,
        refresh_token: config.refresh_token
      };
    }
  } catch (error) {
    console.error('Error reading config file:', error);
  }
  return {};
}

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