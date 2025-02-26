import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { getUserById, getUserByUsername } from './supabase-admin';

const SUPABASE_URL = 'https://hnibcchiknipqongruty.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaWJjY2hpa25pcHFvbmdydXR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE4NDA3MTksImV4cCI6MjA0NzQxNjcxOX0.ocOf570HeHOoc8ZgKyXeLAJEO90BJ-yQfnPtgBiINKs';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export interface Tool {
  id: string;
  name: string;
  handle: string;
  owner_id: string;
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

async function getBaseUrl() {
  try {
    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    return `${protocol}://${host}`;
  } catch {
    // During static generation, we don't need the base URL
    return null;
  }
}

export async function getTools(): Promise<Tool[]> {
  try {
    // Fetch all tools
    const { data: tools } = await supabase
      .from('atm_tools')
      .select('*');

    if (!tools) {
      return [];
    }

    // Fetch capabilities and user data for each tool
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

        // Get user data - try API first, fall back to direct DB access
        let userData;
        const baseUrl = await getBaseUrl();
        
        if (baseUrl) {
          // During runtime, use API
          const response = await fetch(`${baseUrl}/api/users/${tool.owner_id}`);
          if (response.ok) {
            userData = await response.json();
          }
        }
        
        if (!userData) {
          // During build time or if API fails, use direct DB access
          userData = await getUserById(tool.owner_id);
        }

        if (!userData) {
          console.error(`No user data found for user ${tool.owner_id}`);
          return null;
        }
        
        // Find GitHub identity
        const githubIdentity = userData.identities?.find(
          (identity: { provider: string }) => identity.provider === 'github'
        );
        
        const username = githubIdentity?.identity_data?.user_name;
        if (!username) {
          console.error(`No GitHub username found for user ${tool.owner_id}`, userData);
          return null;
        }

        return {
          ...tool,
          owner_id: tool.owner_id,
          owner_username: username,
          capabilities: capabilities || []
        };
      })
    );

    return toolsWithData.filter((tool): tool is Tool => tool !== null);
  } catch (error) {
    console.error('Error fetching tools:', error);
    return [];
  }
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

export async function getTool(username: string, handle: string): Promise<Tool | null> {
  try {
    // Get user data - try API first, fall back to direct DB access
    let userData;
    const baseUrl = await getBaseUrl();
    
    if (baseUrl) {
      // During runtime, use API
      const response = await fetch(`${baseUrl}/api/users/username/${username}`);
      if (response.ok) {
        userData = await response.json();
      }
    }
    
    if (!userData) {
      // During build time or if API fails, use direct DB access
      userData = await getUserByUsername(username);
    }

    if (!userData) {
      console.error('No user data found for username:', username);
      return null;
    }
    
    // Find GitHub identity to verify username
    const githubIdentity = userData.identities?.find(
      (identity: { provider: string }) => identity.provider === 'github'
    );
    
    if (!githubIdentity?.identity_data?.user_name) {
      console.error(`No GitHub username found for user ${userData.id}`);
      return null;
    }

    // Fetch tool metadata using the Supabase user ID
    const { data: tool, error: toolError } = await supabase
      .from('atm_tools')
      .select('*')
      .eq('owner_id', userData.id)
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
      owner_id: tool.owner_id,
      owner_username: username,
      capabilities: capabilitiesWithFiles
    };
  } catch (error) {
    console.error('Error fetching tool:', error);
    return null;
  }
} 