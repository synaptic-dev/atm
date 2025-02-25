import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL='https://hnibcchiknipqongruty.supabase.co'
const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaWJjY2hpa25pcHFvbmdydXR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE4NDA3MTksImV4cCI6MjA0NzQxNjcxOX0.ocOf570HeHOoc8ZgKyXeLAJEO90BJ-yQfnPtgBiINKs'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export interface Tool {
  id: string;
  handle: string;
  name: string;
  description: string;
  owner_id: string;
  file_path: string;
  capabilities: Array<Capability>;
}

export interface Capability {
  id: string;
  name: string;
  description: string;
  key: string;
  schema: string;
}

export async function getTools(): Promise<Tool[]> {
  try {
    console.log('Fetching tools from Supabase...');
    
    // Fetch all tools
    const { data: tools, error: toolsError } = await supabase
      .from('atm_tools')
      .select('*');

    if (toolsError) {
      console.error('Error fetching tools:', toolsError);
      return [];
    }

    if (!tools?.length) {
      console.log('No tools found');
      return [];
    }

    console.log('Found tools:', tools);

    // Fetch capabilities for each tool
    const toolsWithCapabilities = await Promise.all(
      tools.map(async (tool: Tool) => {
        try {
          const { data: capabilities, error: capsError } = await supabase
            .from('atm_tool_capabilities')
            .select('*')
            .eq('tool_id', tool.id);

          if (capsError) {
            console.error(`Error fetching capabilities for tool ${tool.handle}:`, capsError);
            return {
              ...tool,
              capabilities: []
            };
          }

          return {
            ...tool,
            capabilities: capabilities || []
          };
        } catch (error) {
          console.error(`Error processing tool ${tool.handle}:`, error);
          return {
            ...tool,
            capabilities: []
          };
        }
      })
    );

    console.log('Final tools list:', toolsWithCapabilities);
    return toolsWithCapabilities;
  } catch (error) {
    console.error('Error fetching tools:', error);
    return [];
  }
}

export async function getTool(owner: string, handle: string): Promise<Tool | null> {
  try {
    // Fetch tool metadata
    const { data: tool, error: toolError } = await supabase
      .from('atm_tools')
      .select('*')
      .eq('owner_id', owner)
      .eq('handle', handle)
      .single();

    if (toolError) {
      console.error('Error fetching tool:', toolError);
      return null;
    }

    if (!tool) {
      console.log('Tool not found');
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

    // Process capabilities with their schema and runner code
    const processedCapabilities = capabilities?.map((cap: Capability) => ({
      id: cap.id,
      name: cap.name,
      description: cap.description,
      key: cap.key,
      schema: cap.schema
    })) || [];

    return {
      ...tool,
      capabilities: processedCapabilities
    };
  } catch (error) {
    console.error('Error fetching tool:', error);
    return null;
  }
} 