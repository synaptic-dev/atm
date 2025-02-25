import path from 'path';
import os from 'os';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import tar from 'tar';
import { CONFIG_DIR, CONFIG_FILE } from '../config';

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

export async function publishTool(toolPath: string = '.') {
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

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    const { handle } = metadata;

    // Load JWT from config file
    if (!fs.existsSync(CONFIG_FILE)) {
      throw new Error('Please login first using: atm login');
    }

    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    const userId = config.user_id;

    if (!userId) {
      throw new Error('No user ID found. Please login first using: atm login');
    }

    // Check if tool exists and belongs to the user
    const { data: existingTool, error: toolCheckError } = await supabase
      .from('atm_tools')
      .select('*')
      .eq('handle', handle)
      .single();

    if (toolCheckError && toolCheckError.code !== 'PGRST116') { // PGRST116 is "not found" error
      throw new Error(`Failed to check existing tool: ${toolCheckError.message}`);
    }

    if (existingTool && existingTool.owner_id !== userId) {
      throw new Error('You do not have permission to update this tool');
    }

    // Create a temporary directory for the archive
    const tmpDir = path.join(os.tmpdir(), 'atm-publish');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir);
    }

    // Create the archive path
    const archivePath = path.join(tmpDir, `${handle}.tar.gz`);

    // Create a gzipped tar archive of the dist directory
    console.log('Creating archive...');
    await tar.create(
      {
        gzip: true,
        file: archivePath,
        cwd: process.cwd(),
      },
      ['dist']
    );

    // Upload the archive to Supabase Storage
    console.log('Uploading archive...');
    const filePath = `${userId}/${handle}.tar.gz`;
    const fileBuffer = fs.readFileSync(archivePath);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('atm_tools')
      .upload(filePath, fileBuffer, {
        contentType: 'application/gzip',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Failed to upload archive: ${uploadError.message}`);
    }

    if (!uploadData) {
      throw new Error('Failed to get storage file ID after upload');
    }

    // Clean up temporary files
    fs.unlinkSync(archivePath);
    fs.rmdirSync(tmpDir);

    // Save or update tool metadata to database
    const { data: tool, error: toolError } = await supabase
      .from('atm_tools')
      .upsert({
        handle,
        name: metadata.name,
        description: metadata.description,
        owner_id: userId,
        file_path: uploadData.path
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
    console.log('Tool ID:', tool.id);
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

    console.log(`Tool ${handle} published successfully!`);
    console.log('Metadata:', metadata);
  } catch (error: any) {
    console.error('Error publishing tool:', error?.message || error);
    process.exit(1);
  }
}
