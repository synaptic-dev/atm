import path from 'path';
import os from 'os';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL='https://hnibcchiknipqongruty.supabase.co'
const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaWJjY2hpa25pcHFvbmdydXR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE4NDA3MTksImV4cCI6MjA0NzQxNjcxOX0.ocOf570HeHOoc8ZgKyXeLAJEO90BJ-yQfnPtgBiINKs'

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

const CONFIG_DIR = path.join(os.homedir(), '.atm');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

async function uploadCapabilityCode(userId: string, handle: string, capabilityName: string, code: string) {
  const filePath = `${userId}/${handle}/${capabilityName}/runner.ts`;
  const { error } = await supabase.storage
    .from('atm_tools')
    .upload(filePath, Buffer.from(code), {
      contentType: 'text/typescript',
      upsert: true
    });

  if (error) {
    throw new Error(`Failed to upload runner code for ${capabilityName}: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('atm_tools')
    .getPublicUrl(filePath);

  return publicUrl;
}

export async function publishTool(toolPath: string) {
  try {
    // Read metadata from atm-tool/metadata.json
    const metadataPath = path.join(process.cwd(), 'atm-tool', 'metadata.json');
    if (!fs.existsSync(metadataPath)) {
      console.error('No metadata.json found in atm-tool folder');
      process.exit(1);
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    const { handle, name, description, capabilities = [] } = metadata;

    if (!handle) {
      console.error('No handle found in metadata.json');
      process.exit(1);
    }

    // Load JWT from config file
    if (!fs.existsSync(CONFIG_FILE)) {
      console.error('Please login first using: atm login');
      process.exit(1);
    }

    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    const jwt = config.access_token;
    const userId = config.user_id;

    if (!jwt || !userId) {
      console.error('No access token found. Please login first using: atm login');
      process.exit(1);
    }

    // Check if tool already exists in atm_tools table
    const { data: existingTool, error: toolError } = await supabase
      .from('atm_tools')
      .select('*')
      .eq('handle', handle)
      .eq('owner_id', userId)
      .single();

    if (toolError && toolError.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Error checking existing tool:', toolError.message);
      process.exit(1);
    }

    let toolId;
    if (!existingTool) {
      // Save new tool to atm_tools table
      const { data: newTool, error: insertError } = await supabase
        .from('atm_tools')
        .insert({
          name,
          handle,
          description,
          owner_id: userId
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Failed to save tool:', insertError.message);
        process.exit(1);
      }

      toolId = newTool.id;
      console.log('Tool registered successfully in atm_tools');
    } else {
      toolId = existingTool.id;
      console.log('Tool already registered in atm_tools');
    }

    // Read capabilities from the atm-tool folder
    const atmToolPath = path.join(process.cwd(), 'atm-tool');
    const capabilitiesPath = path.join(atmToolPath, 'capabilities');
    if (!fs.existsSync(capabilitiesPath)) {
      console.error('No capabilities found in atm-tool folder');
      process.exit(1);
    }

    // Process each capability
    for (const capability of capabilities) {
      const capDir = capability.name.toLowerCase().replace(/\s+/g, '-');
      const capabilityPath = path.join(capabilitiesPath, capDir);
      const schemaPath = path.join(capabilityPath, 'schema.json');
      const runnerPath = path.join(capabilityPath, 'runner.ts');
      
      if (!fs.existsSync(schemaPath)) {
        console.error(`Schema not found for capability: ${capability.name}`);
        continue;
      }

      if (!fs.existsSync(runnerPath)) {
        console.error(`Runner code not found for capability: ${capability.name}`);
        continue;
      }

      const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
      const runnerCode = fs.readFileSync(runnerPath, 'utf-8');

      // Upload runner code to Supabase Storage
      console.log(`Uploading runner code for ${capability.name}...`);
      const runnerUrl = await uploadCapabilityCode(userId, handle, capDir, runnerCode);
      console.log(`Runner code uploaded: ${runnerUrl}`);

      const { error: capabilityError } = await supabase
        .from('atm_tool_capabilities')
        .upsert({
          tool_id: toolId,
          name: capability.name,
          schema,
          runner_url: runnerUrl,
          description: capability.description
        }, { onConflict: 'tool_id, name' });

      if (capabilityError) {
        console.error(`Failed to save capability ${capability.name}:`, capabilityError.message);
        continue;
      }

      console.log(`Capability ${capability.name} published successfully`);
    }

    // Upload the built tool code
    const builtToolPath = path.join(atmToolPath, 'index.js');
    if (fs.existsSync(builtToolPath)) {
      const toolCode = fs.readFileSync(builtToolPath);
      const toolFilePath = `${userId}/${handle}/index.js`;
      
      console.log('Uploading built tool code...');
      const { error: uploadError } = await supabase.storage
        .from('atm_tools')
        .upload(toolFilePath, toolCode, {
          contentType: 'application/javascript',
          upsert: true
        });

      if (uploadError) {
        console.error('Failed to upload built tool code:', uploadError.message);
      } else {
        console.log('Built tool code uploaded successfully');
      }
    }

    console.log(`Tool ${handle} published successfully!`);
  } catch (error) {
    console.error('Error publishing tool:', error);
    process.exit(1);
  }
}
