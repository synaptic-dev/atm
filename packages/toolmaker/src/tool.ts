import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { 
  OpenAIChatCompletionTool, 
  SingleCapabilityToolOptions,
  MultiCapabilityToolOptions
} from './types';
import { ToolCapability } from './tool-capability';

export class Tool {
  private capabilities: ToolCapability<any>[] = [];
  private name: string;
  private description: string;
  private isSingleCapabilityTool: boolean = false;

  /**
   * Create a new tool
   * @param options Tool options with either single capability or multiple capabilities
   */
  constructor(options: SingleCapabilityToolOptions<any> | MultiCapabilityToolOptions) {
    this.name = options.name;
    this.description = options.description;
    
    // Check if this is a SingleCapabilityToolOptions object
    if ('runner' in options) {
      // Single-capability tool
      const singleOptions = options as SingleCapabilityToolOptions<any>;
      this.isSingleCapabilityTool = true;
      
      // Create a ToolCapability with the same name as the tool
      const capability = new ToolCapability({
        name: this.name,
        description: this.description,
        schema: singleOptions.schema,
        runner: singleOptions.runner
      });
      
      this.capabilities = [capability];
    } else {
      // Multi-capability tool
      const multiOptions = options as MultiCapabilityToolOptions;
      this.isSingleCapabilityTool = false;
      
      // Safely initialize capabilities, ensuring we have an array even if none are provided
      if (multiOptions.capabilities && Array.isArray(multiOptions.capabilities)) {
        this.capabilities = [...multiOptions.capabilities];
      } else {
        // Initialize with empty array if no capabilities were provided
        this.capabilities = [];
      }
    }
  }

  getCapabilities(): ToolCapability<any>[] {
    return this.capabilities;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  isSingleCapability(): boolean {
    return this.isSingleCapabilityTool;
  }

  /**
   * Transforms all capabilities into OpenAI function calling format
   * @returns Array of OpenAI function schemas
   */
  openai(): OpenAIChatCompletionTool[] {
    // If no capabilities, return an empty array
    if (this.capabilities.length === 0) {
      return [];
    }

    return this.capabilities.map(capability => {
      let functionName: string;
      
      if (this.isSingleCapabilityTool) {
        // Single-capability tool - just use the tool name in snake_case
        functionName = this.name.toLowerCase().replace(/\s+/g, '_');
      } else {
        // Multi-capability tool - use the tool-capability format
        const toolPrefix = this.name.toLowerCase().replace(/\s+/g, '_');
        const capabilityName = capability.name.toLowerCase().replace(/\s+/g, '_');
        functionName = `${toolPrefix}-${capabilityName}`;
      }

      // Use zod-to-json-schema to convert the Zod schema to JSON Schema
      const parameters = zodToJsonSchema(capability.schema || z.object({}));
      
      // Ensure the parameters object has the correct structure
      const schemaParameters = {
        type: "object",
        properties: {},
        ...parameters
      };

      return {
        type: "function",
        function: {
          name: functionName,
          description: capability.description,
          parameters: schemaParameters
        }
      };
    });
  }
}

export default Tool;
