import { supabase } from './client';

export interface Tool {
  id: number;
  name: string;
  tool_handle: string;
  owner_id: string;
  owner_username: string;
  description: string | null;
  type: string;
  created_at: string;
  capabilities: Capability[];
}

export interface Capability {
  id: number;
  tool_id: number | null;
  name: string;
  description: string;
  created_at: string;
  key?: string;
  schema?: string;
  runner?: string;
}

// Fetch capability content from HTTP endpoint
async function fetchCapabilityContent(ownerid: string, toolName: string, capName: string): Promise<{ schema: string, runner: string }> {
  try {
    // Normalize names for URL
    const normalizedToolName = toolName.toLowerCase().replace(/\s+/g, '-');
    const normalizedCapName = capName.toLowerCase().replace(/\s+/g, '-');
    
    // Construct the URL to the single file
    const apiUrl = process.env.NEXT_PUBLIC_COOPER_API || 'http://localhost:8787';
    const url = `${apiUrl}/${ownerid}/${normalizedToolName}-${normalizedCapName}`;
    
    console.log(`Fetching capability content from: ${url}`);
    
    // Fetch the file content with no cache to ensure fresh content during debugging
    const response = await fetch(url, { 
      cache: 'no-store',
      next: { revalidate: 0 } 
    });
    
    if (response.ok) {
      // Get the content as text
      const content = await response.text();
      console.log(`Successfully fetched content (${content.length} bytes)`);
      
      // Use the content for both schema and runner with a prefix to identify source
      return { 
        schema: `// Fetched from API (${url})\n${content}`,
        runner: `// Fetched from API (${url})\n${content}`
      };
    } else {
      console.error(`Failed to fetch capability content: ${response.status} ${response.statusText} from ${url}`);
      return { 
        schema: `// Capability content not available - API returned ${response.status}\n// URL attempted: ${url}`,
        runner: `// Capability content not available - API returned ${response.status}\n// URL attempted: ${url}`
      };
    }
  } catch (error) {
    console.error('Error fetching capability content:', error);
    return { 
      schema: `// Error loading capability content: ${error instanceof Error ? error.message : 'Unknown error'}\n// This is a fallback message to ensure something displays.`,
      runner: `// Error loading capability content: ${error instanceof Error ? error.message : 'Unknown error'}\n// This is a fallback message to ensure something displays.`
    };
  }
}

export async function getTools(limit?: number, search?: string): Promise<Tool[]> {
  try {
    // Base query
    let query = supabase
      .from('atm_tools')
      .select()
      .order('created_at', { ascending: false });

    // Apply search if provided
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    if (limit) {
      query.limit(limit);
    }

    const { data: tools, error } = await query;

    if (error || !tools) {
      console.error('Error fetching tools:', error);
      return [];
    }

    console.log('tools', tools)

    // Fetch capabilities for each tool
    const toolsWithData = await Promise.all(
      tools.map(async (tool) => {
        console.log('tool', typeof tool.id)
        // Get capabilities
        const { data: capabilities, error: capsError } = await supabase
          .from('atm_tool_capabilities')
          .select('*')
          .eq('tool_id', tool.id);

        if (capsError) {
          console.error(`Error fetching capabilities for tool ${tool.tool_handle}:`, capsError);
          return null;
        }

        console.log('cap', capabilities)

        return {
          id: tool.id,
          name: tool.name,
          tool_handle: tool.tool_handle,
          owner_id: tool.owner_id,
          owner_username: tool.owner_username,
          description: tool.description,
          type: tool.type,
          created_at: tool.created_at,
          capabilities: capabilities || []
        } as Tool;
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
  console.log(`Fetching tool: ${username}/${handle}`);
  
  try {
    // Fetch tool metadata using the username and handle with explicit field selection
    const { data: tool, error: toolError } = await supabase
      .from('atm_tools')
      .select(`
        id,
        name,
        tool_handle,
        owner_id,
        owner_username,
        description,
        type,
        created_at
      `)
      .eq('owner_username', username)
      .eq('tool_handle', handle)
      .single();

    if (toolError || !tool) {
      console.error('Error fetching tool:', toolError);
      return null;
    }

    console.log(`Found tool: ${tool.name} (ID: ${tool.id})`);

    // For single-capability tools, skip capability fetching
    if (tool.type === 'single-capability') {
      console.log('Single capability tool - skipping capability fetching');
      return {
        ...tool,
        capabilities: []
      } as Tool;
    }

    // Fetch tool capabilities for multi-capability tools
    const { data: capabilities, error: capsError } = await supabase
      .from('atm_tool_capabilities')
      .select('*')
      .eq('tool_id', tool.id);

    if (capsError) {
      console.error('Error fetching capabilities:', capsError);
      return null;
    }

    console.log(`Found ${capabilities?.length || 0} capabilities for tool`);
    
    // If no capabilities, return tool with empty capabilities array
    if (!capabilities || capabilities.length === 0) {
      console.log('No capabilities found for this tool');
      return {
        ...tool,
        capabilities: []
      } as Tool;
    }

    // Get capability files for each capability
    console.log('Fetching capability content...');
    const capabilitiesWithFiles = await Promise.all(
      capabilities.map(async (cap) => {
        console.log(`Processing capability: ${cap.name} (ID: ${cap.id})`);
        
        // Generate a key for the capability based on its name
        const key = cap.name.toLowerCase().replace(/\s+/g, '-');
        
        try {
          // Fetch capability content from the HTTP endpoint
          const { schema, runner } = await fetchCapabilityContent(
            tool.owner_id,
            tool.name,
            cap.name
          );

          return {
            ...cap,
            key,
            schema,
            runner
          };
        } catch (error) {
          console.error(`Error processing capability ${cap.name}:`, error);
          // Return capability with error messages
          return {
            ...cap,
            key,
            schema: `// Error processing capability: ${error instanceof Error ? error.message : 'Unknown error'}`,
            runner: `// Error processing capability: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      })
    );

    console.log('Successfully processed all capabilities');
    
    return {
      ...tool,
      capabilities: capabilitiesWithFiles
    } as Tool;
  } catch (error) {
    console.error('Error fetching tool:', error);
    return null;
  }
} 