import { Tool } from './tool';
import { 
  ToolkitOptions, 
  OpenAIChatCompletionTool, 
  OpenAIChatCompletionMessage, 
  OpenAIChatCompletion,
  OpenAIChatCompletionToolMessageParam 
} from './types';

export class Toolkit {
  private tools: Tool[];

  constructor(options: ToolkitOptions) {
    this.tools = options.tools;
  }

  /**
   * Get all tools in the toolkit
   */
  getTools(): Tool[] {
    return this.tools;
  }

  /**
   * Add a tool to the toolkit
   */
  addTool(tool: Tool): Toolkit {
    this.tools.push(tool);
    return this;
  }

  /**
   * Flattens all tool capabilities into a single array of OpenAI function schemas
   */
  openai(): OpenAIChatCompletionTool[] {
    // Filter out empty tools and then flatten all capabilities
    const tools = this.tools.filter(tool => tool.getCapabilities().length > 0);
    
    // Make sure we have at least one tool
    if (tools.length === 0) {
      return [];
    }
    
    return tools.flatMap(tool => tool.openai());
  }

  /**
   * Handles messages by finding and executing the appropriate tool capability
   * @param params Object containing a single message or ChatCompletion object
   * @returns The formatted tool response messages or null if no tool calls found
   */
  async handler(params: 
    | { message: OpenAIChatCompletionMessage } 
    | { chatCompletion: OpenAIChatCompletion }
  ): Promise<OpenAIChatCompletionToolMessageParam[] | null> {
    let messageToProcess: OpenAIChatCompletionMessage | undefined;
    
    if ('chatCompletion' in params) {
      // Handle ChatCompletion object - extract first choice
      const { chatCompletion } = params;
      if (chatCompletion.choices && chatCompletion.choices.length > 0) {
        messageToProcess = chatCompletion.choices[0].message;
      }
    } else if ('message' in params) {
      // Handle single message
      messageToProcess = params.message;
    }
    
    // Silently skip if no tool calls found
    if (!messageToProcess?.tool_calls?.length) {
      return null;
    }

    // Process all tool calls
    const toolCalls = messageToProcess.tool_calls;
    const results: OpenAIChatCompletionToolMessageParam[] = [];
    
    // Process each tool call in parallel
    await Promise.all(
      toolCalls.map(async (toolCall) => {
        const { id, function: { name, arguments: argsString } } = toolCall;
        
        try {
          const args = JSON.parse(argsString);
          const result = await this.executeTool(name, args);
          
          // Format result as a tool message
          results.push({
            role: 'tool',
            content: typeof result === 'string' ? result : JSON.stringify(result),
            tool_call_id: id
          });
        } catch (error: any) {
          // Add error as a tool message
          results.push({
            role: 'tool',
            content: `Error: ${error.message}`,
            tool_call_id: id
          });
        }
      })
    );
    
    return results;
  }
  
  /**
   * Executes a tool capability by name with provided arguments
   */
  private async executeTool(name: string, args: any): Promise<any> {
    // Extract tool name and capability name from the function name (format: tool-capability)
    const [toolPrefix, ...capabilityNameParts] = name.split('-');
    const capabilityName = capabilityNameParts.join('-');

    // Find the matching tool and capability
    for (const tool of this.tools) {
      const toolNameSnakeCase = tool.getName().toLowerCase().replace(/\s+/g, '_');
      
      if (toolNameSnakeCase === toolPrefix) {
        const capabilities = tool.getCapabilities();
        
        // If there are no capability name parts, it might be a single-capability tool
        if (capabilityNameParts.length === 0 && (tool as any).isSingleCapability?.()) {
          // This is a single-capability tool - execute its capability
          return await capabilities[0].runner(args);
        }
        
        // Otherwise, look for a capability with the matching name
        for (const capability of capabilities) {
          const capabilityNameSnakeCase = capability.name.toLowerCase().replace(/\s+/g, '_');
          
          if (capabilityNameSnakeCase === capabilityName) {
            // Execute the capability with the provided arguments
            return await capability.runner(args);
          }
        }
      }
    }

    throw new Error(`Function ${name} not found in toolkit`);
  }
}

export default Toolkit; 