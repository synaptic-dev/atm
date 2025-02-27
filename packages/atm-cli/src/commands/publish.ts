import path from 'path';
import fs from 'fs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CONFIG_FILE } from '../config';

interface Config {
  access_token: string;
  user_id: string;
  username: string;
  supabase_url: string;
  supabase_key: string;
}

interface ToolMetadata {
  name: string;
  handle: string;
  description: string;
  capabilities: Array<{
    name: string;
    description: string;
    key: string;
  }>;
}

interface Tool {
  id: string;
  handle: string;
  name: string;
  description: string;
  owner_id: string;
  owner_username: string;
  file_path: string;
}

function getConfig(): Config {
  if (!fs.existsSync(CONFIG_FILE)) {
    throw new Error('Please login first using: atm login');
  }
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
}

function createSupabaseClient(config: Config): SupabaseClient {
  return createClient(config.supabase_url, config.supabase_key, {
    accessToken: () => Promise.resolve(config.access_token)
  });
}

async function uploadDirectory(config: Config, userId: string, handle: string, dirPath: string): Promise<string> {
  const supabase = createSupabaseClient(config);
  const files: string[] = [];
  
  // Recursively get all files in the directory
  function getAllFiles(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        getAllFiles(fullPath);
      } else {
        files.push(fullPath);
      }
    }
  }
  
  getAllFiles(dirPath);
  
  // Upload each file
  const uploads = files.map(async (filePath) => {
    const relativePath = path.relative(dirPath, filePath);
    const storagePath = `${userId}/${handle}/${relativePath}`;
    const fileContent = fs.readFileSync(filePath);
    
    const { error: uploadError } = await supabase.storage
      .from('atm_tools')
      .upload(storagePath, fileContent, {
        contentType: 'text/plain',
        upsert: true
      });
      
    if (uploadError) {
      throw new Error(`Failed to upload ${relativePath}: ${uploadError.message}`);
    }
    
    return storagePath;
  });
  
  await Promise.all(uploads);
  return `${userId}/${handle}`;
}

export async function publishTool(toolPath: string = '.'): Promise<void> {
  try {
    // Check if dist directory exists
    const distPath = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(distPath)) {
      throw new Error('No dist directory found. Please run `atm build` first.');
    }

    // Read metadata.json
    const metadataPath = path.join(distPath, 'metadata.json');
    if (!fs.existsSync(metadataPath)) {
      throw new Error('No metadata.json found in dist directory');
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8')) as ToolMetadata;
    const { handle } = metadata;

    const config = getConfig();
    const supabase = createSupabaseClient(config);
    const userId = config.user_id;
    const username = config.username;

    if (!userId || !username) {
      throw new Error('No user ID or username found. Please login first using: atm login');
    }

    // Check if tool exists and belongs to the user
    const { data: existingTool, error: toolCheckError } = await supabase
      .from('atm_tools')
      .select('*')
      .eq('handle', handle)
      .single();

    if (toolCheckError && toolCheckError.code !== 'PGRST116') {
      throw new Error(`Failed to check existing tool: ${toolCheckError.message}`);
    }

    if (existingTool && existingTool.owner_username !== username) {
      throw new Error('You do not have permission to update this tool');
    }

    console.log(`Publishing ${metadata.name} to ATM...`);

    // Upload the dist directory contents
    const basePath = await uploadDirectory(config, userId, handle, distPath);

    // Save or update tool metadata to database
    const { data: tool, error: toolError } = await supabase
      .from('atm_tools')
      .upsert({
        handle,
        name: metadata.name,
        description: metadata.description,
        owner_username: username,
        file_path: basePath
      }, {
        onConflict: 'handle'
      })
      .select()
      .single();

    if (toolError) {
      throw new Error(`Failed to save tool metadata: ${toolError.message}`);
    }

    if (!tool) {
      throw new Error('Failed to get tool ID after saving metadata');
    }

    // Delete existing capabilities for this tool
    const { error: deleteError } = await supabase
      .from('atm_tool_capabilities')
      .delete()
      .eq('tool_id', tool.id);

    if (deleteError) {
      throw new Error(`Failed to delete existing capabilities: ${deleteError.message}`);
    }

    // Save capabilities metadata to database
    for (const capability of metadata.capabilities) {
      const { error: capabilityError } = await supabase
        .from('atm_tool_capabilities')
        .upsert({
          tool_id: tool.id,
          name: capability.name,
          description: capability.description,
          key: capability.key
        }, {
          onConflict: 'tool_id,key'
        });

      if (capabilityError) {
        throw new Error(`Failed to save capability metadata: ${capabilityError.message}`);
      }
    }

    console.log(`✨ Successfully published ${metadata.name} to ATM`);
    console.log(`🔗 View your tool at: https://try-synaptic.ai/tools/${username}/${handle}`);
  } catch (error) {
    console.error('❌ Failed to publish tool:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
