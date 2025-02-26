import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hnibcchiknipqongruty.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaWJjY2hpa25pcHFvbmdydXR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE4NDA3MTksImV4cCI6MjA0NzQxNjcxOX0.ocOf570HeHOoc8ZgKyXeLAJEO90BJ-yQfnPtgBiINKs';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export interface Tool {
  id: string;
  name: string;
  handle: string;
  owner_username: string;
  description: string;
  file_path: string;
  capabilities: Capability[];
}

export interface Capability {
  id: string;
  tool_id: string;
  name: string;
  description: string;
  key: string;
  schema: string;
  runner: string;
}

async function downloadFileContent(supabase: SupabaseClient, path: string): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from('atm_tools')
      .download(path);

    if (error) {
      console.error('Error downloading file:', path, error);
      return '';
    }

    return await data.text();
  } catch (error) {
    console.error('Error downloading file:', path, error);
    return '';
  }
}

export async function getTools(): Promise<Tool[]> {
  try {
    // Fetch all tools with explicit field selection
    const { data: tools } = await supabase
      .from('atm_tools')
      .select(`
        id,
        name,
        handle,
        owner_username,
        description,
        file_path
      `);

    if (!tools) {
      return [];
    }

    // Fetch capabilities for each tool
    const toolsWithData = await Promise.all(
      tools.map(async (tool) => {
        // Get capabilities
        const { data: capabilities, error: capsError } = await supabase
          .from('atm_tool_capabilities')
          .select('*')
          .eq('tool_id', tool.id);

        if (capsError) {
          console.error(`Error fetching capabilities for tool ${tool.handle}:`, capsError);
          return null;
        }

        return {
          ...tool,
          capabilities: capabilities || []
        };
      })
    );

    // Filter out any null results and return
    return toolsWithData.filter((tool): tool is Tool => tool !== null);
  } catch (error) {
    console.error('Error fetching tools:', error);
    return [];
  }
}

export async function getTool(username: string, handle: string): Promise<Tool | null> {
  try {
    // Fetch tool metadata using the username and handle with explicit field selection
    const { data: tool, error: toolError } = await supabase
      .from('atm_tools')
      .select(`
        id,
        name,
        handle,
        owner_username,
        description,
        file_path
      `)
      .eq('owner_username', username)
      .eq('handle', handle)
      .single();

    if (toolError || !tool) {
      console.error('Error fetching tool:', toolError);
      return null;
    }

    // Fetch tool capabilities
    const { data: capabilities, error: capsError } = await supabase
      .from('atm_tool_capabilities')
      .select('*')
      .eq('tool_id', tool.id);

    if (capsError) {
      console.error('Error fetching capabilities:', capsError);
      return null;
    }

    // Get capability files
    const capabilitiesWithFiles = await Promise.all(
      (capabilities || []).map(async (cap) => {
        // Construct paths for schema and runner files
        const schemaPath = `${tool.file_path}/capabilities/${cap.key}/schema.ts`;
        const runnerPath = `${tool.file_path}/capabilities/${cap.key}/runner.ts`;

        // Download both files using Supabase storage API
        const [schema, runner] = await Promise.all([
          downloadFileContent(supabase, schemaPath),
          downloadFileContent(supabase, runnerPath)
        ]);

        return {
          ...cap,
          schema,
          runner
        };
      })
    );

    return {
      ...tool,
      capabilities: capabilitiesWithFiles
    };
  } catch (error) {
    console.error('Error fetching tool:', error);
    return null;
  }
} 