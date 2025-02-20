import path from 'path';
import os from 'os';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL='https://hnibcchiknipqongruty.supabase.co'
const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaWJjY2hpa25pcHFvbmdydXR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE4NDA3MTksImV4cCI6MjA0NzQxNjcxOX0.ocOf570HeHOoc8ZgKyXeLAJEO90BJ-yQfnPtgBiINKs'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CONFIG_DIR = path.join(os.homedir(), '.atm');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export async function publishTool(toolPath: string) {
  try {
    // Read metadata from dist/metadata.json
    const metadataPath = path.join(process.cwd(), 'dist', 'metadata.json');
    if (!fs.existsSync(metadataPath)) {
      console.error('No metadata.json found in dist folder');
      process.exit(1);
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    const { handle, name, description, capabilities } = metadata;

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

    // Read capabilities from the dist folder
    const distPath = path.join(process.cwd(), 'dist');
    const capabilitiesPath = path.join(distPath, 'capabilities');
    if (!fs.existsSync(capabilitiesPath)) {
      console.error('No capabilities found in dist folder');
      process.exit(1);
    }

    const capabilityDirs = fs.readdirSync(capabilitiesPath);
    const capabilitiesData = capabilities.map((capability: any) => {
      const capDir = capability.name.toLowerCase().replace(/\s+/g, '-');
      const capabilityPath = path.join(capabilitiesPath, capDir);
      const schemaPath = path.join(capabilityPath, 'schema.json');
      const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
      console.log('schema', schema);
      return { name: capability.name, schema, description: capability.description };
    });

    // Save capabilities to atm_tool_capabilities table
    for (const capability of capabilitiesData) {
      const { name, schema, description } = capability;
      const runnerUrl = ''; // Keep runner URL empty for now

      const { error: capabilityError } = await supabase
        .from('atm_tool_capabilities')
        .upsert({
          tool_id: toolId,
          name,
          schema,
          runner_url: runnerUrl,
          description
        }, { onConflict: 'tool_id, name' });

      if (capabilityError) {
        console.error('Failed to save capability:', capabilityError.message);
        process.exit(1);
      }
    }

    console.log(`Tool ${handle} published successfully!`);
  } catch (error) {
    console.error('Error publishing tool:', error);
    process.exit(1);
  }
}
