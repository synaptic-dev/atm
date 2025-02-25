import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hnibcchiknipqongruty.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaWJjY2hpa25pcHFvbmdydXR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE4NDA3MTksImV4cCI6MjA0NzQxNjcxOX0.ocOf570HeHOoc8ZgKyXeLAJEO90BJ-yQfnPtgBiINKs';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export interface Tool {
  id: string;
  name: string;
  handle: string;
  owner_id: string;
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
}

export async function getTools(): Promise<Tool[]> {
  try {
    // Fetch all tools
    const { data: tools, error: toolsError } = await supabase
      .from('atm_tools')
      .select('*');

    if (toolsError) {
      console.error('Error fetching tools:', toolsError);
      return [];
    }

    if (!tools) {
      return [];
    }

    // Fetch capabilities for each tool
    const toolsWithCapabilities = await Promise.all(
      tools.map(async (tool) => {
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
      })
    );

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

    return {
      ...tool,
      capabilities: capabilities || []
    };
  } catch (error) {
    console.error('Error fetching tool:', error);
    return null;
  }
} 