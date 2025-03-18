import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  ToolBuilderOptions,
  CapabilityBuilderOptions,
  HandlerFunction,
  MiddlewareFunction,
  ToolBuilderObject,
  CapabilityBuilderObject,
  ToolRunResult,
  Context,
  LLMFormatterOptions,
  OpenAIFunctionDefinition,
} from "./types";
import { CapabilityBuilder } from "./capability-builder";

/**
 * Builder for creating Tool instances with a fluent API
 */
export class ToolBuilder implements ToolBuilderObject {
  public name: string;
  public description: string;
  public capabilities: CapabilityBuilderObject[] = [];
  private isSingleCapabilityTool: boolean = false;
  private singleCapability: CapabilityBuilder | null = null;

  /**
   * Create a new ToolBuilder
   * @param options Tool configuration options
   */
  constructor(options: ToolBuilderOptions) {
    this.name = options.name;
    this.description = options.description || "";
  }

  /**
   * Add a capability to the tool
   * @param options Capability configuration
   * @returns CapabilityBuilder for the new capability
   */
  capability(options: CapabilityBuilderOptions): CapabilityBuilder {
    const capabilityBuilder = new CapabilityBuilder(this, options);
    this.capabilities.push(capabilityBuilder);
    return capabilityBuilder;
  }

  /**
   * Set the input schema for a single-capability tool
   * @param schema Zod schema for input validation
   * @returns this ToolBuilder instance
   */
  input<T extends z.ZodType>(schema: T): ToolBuilder {
    if (this.capabilities.length > 0 && !this.isSingleCapabilityTool) {
      throw new Error(
        "Cannot set input schema directly on a multi-capability tool",
      );
    }

    this.isSingleCapabilityTool = true;

    if (!this.singleCapability) {
      // Create an implicit capability with the same name as the tool
      this.singleCapability = this.capability({
        name: this.name,
        description: this.description,
      });
    }

    this.singleCapability.input(schema);
    return this;
  }

  /**
   * Set the output schema for a single-capability tool
   * @param schema Zod schema for output validation
   * @returns this ToolBuilder instance
   */
  output<T extends z.ZodType>(schema: T): ToolBuilder {
    if (this.capabilities.length > 0 && !this.isSingleCapabilityTool) {
      throw new Error(
        "Cannot set output schema directly on a multi-capability tool",
      );
    }

    this.isSingleCapabilityTool = true;

    if (!this.singleCapability) {
      // Create an implicit capability with the same name as the tool
      this.singleCapability = this.capability({
        name: this.name,
        description: this.description,
      });
    }

    this.singleCapability.output(schema);
    return this;
  }

  /**
   * Add middleware to a single-capability tool
   * @param middleware Middleware function
   * @returns this ToolBuilder instance
   */
  use(middleware: MiddlewareFunction): ToolBuilder {
    if (this.capabilities.length > 0 && !this.isSingleCapabilityTool) {
      throw new Error(
        "Cannot add middleware directly to a multi-capability tool",
      );
    }

    this.isSingleCapabilityTool = true;

    if (!this.singleCapability) {
      // Create an implicit capability with the same name as the tool
      this.singleCapability = this.capability({
        name: this.name,
        description: this.description,
      });
    }

    this.singleCapability.use(middleware);
    return this;
  }

  /**
   * Set the handler function for a single-capability tool
   * @param handler Handler function
   * @returns this ToolBuilder instance
   */
  handler<I = any, O = any>(handler: HandlerFunction<I, O>): ToolBuilder {
    if (this.capabilities.length > 0 && !this.isSingleCapabilityTool) {
      throw new Error("Cannot set handler directly on a multi-capability tool");
    }

    this.isSingleCapabilityTool = true;

    if (!this.singleCapability) {
      // Create an implicit capability with the same name as the tool
      this.singleCapability = this.capability({
        name: this.name,
        description: this.description,
      });
    }

    // Apply the handler
    this.singleCapability.handler(handler);

    // Apply default LLM formatter to stringify results if none is set
    const capBuilder = this.singleCapability as CapabilityBuilder;
    if (!(capBuilder as any)._llmFormatter) {
      this.singleCapability.llm({
        success: (result) => {
          return typeof result === "string" ? result : JSON.stringify(result);
        },
        error: (error) => {
          return `Error: ${error.message}`;
        },
      });
    }

    return this;
  }

  /**
   * Create a runner for direct invocation of a capability
   * @param capabilityName Name of the capability to run
   * @returns Object with handler function for executing the capability
   */
  run<T = any>(capabilityName?: string): ToolRunResult<T> {
    // If no capability name is provided and this is a single-capability tool
    if (
      !capabilityName &&
      this.isSingleCapabilityTool &&
      this.singleCapability
    ) {
      return this.singleCapability.run();
    }

    // Find the capability by name
    const nameToFind = capabilityName || this.name;
    const capability = this.capabilities.find(
      (c) =>
        c.name.toLowerCase() === nameToFind.toLowerCase() ||
        c.name.toLowerCase().replace(/\s+/g, "_") ===
          nameToFind.toLowerCase().replace(/\s+/g, "_"),
    );

    if (!capability) {
      throw new Error(`Capability "${nameToFind}" not found`);
    }

    return {
      handler: async ({
        input = {},
        context = {},
      }: {
        input?: any;
        context?: Context;
      }) => {
        try {
          // Validate input
          const validatedInput = capability._validateInput(input);

          // Create middleware chain
          let index = -1;
          const middlewares = [...capability.middleware];

          const dispatch = async (i: number): Promise<any> => {
            if (i === middlewares.length) {
              // End of middleware chain, execute handler
              if (!capability._handler) {
                throw new Error(
                  `No handler defined for capability "${capability.name}"`,
                );
              }
              return capability._handler({ input: validatedInput, context });
            }

            // Execute next middleware
            const middleware = middlewares[i];
            return middleware(context, () => dispatch(i + 1));
          };

          // Start middleware chain
          const result = await dispatch(0);

          // Validate output
          const validatedOutput = capability._validateOutput(result);

          // Always apply LLM formatting if configured
          const capBuilder = capability as CapabilityBuilder;
          const formatter =
            (capBuilder as any).llmFormatter ||
            (capBuilder as any)._llmFormatter;
          if (formatter?.success) {
            const formatted = formatter.success(
              validatedOutput,
              input,
              context,
            );
            // Return stringified result
            return typeof formatted === "string"
              ? formatted
              : JSON.stringify(formatted);
          }

          return validatedOutput;
        } catch (error) {
          // Always apply LLM error formatting if configured
          const capBuilder = capability as CapabilityBuilder;
          const formatter =
            (capBuilder as any).llmFormatter ||
            (capBuilder as any)._llmFormatter;
          if (formatter?.error) {
            const formatted = formatter.error(
              error instanceof Error ? error : new Error(String(error)),
              input,
              context,
            );
            // Return stringified error
            return typeof formatted === "string"
              ? formatted
              : JSON.stringify(formatted);
          }
          throw error;
        }
      },
    };
  }

  /**
   * Get OpenAI function definitions for this tool
   * @returns Array of OpenAI function definitions
   */
  getOpenAIFunctions(): OpenAIFunctionDefinition[] {
    const functions: OpenAIFunctionDefinition[] = [];

    if (this.isSingleCapabilityTool && this.singleCapability) {
      // Single capability tools use toolName-capabilityName format
      const name = `${this.name.toLowerCase().replace(/\s+/g, "_")}-${this.name.toLowerCase().replace(/\s+/g, "_")}`;

      // Convert Zod schema to JSON Schema, with type compatibility handling
      const parameters = this.singleCapability.inputSchema
        ? zodToJsonSchema(this.singleCapability.inputSchema)
        : { type: "object", properties: {} };

      functions.push({
        type: "function",
        function: {
          name,
          description: this.singleCapability.description || this.description,
          parameters: parameters as {
            type: string;
            properties: Record<string, any>;
            required?: string[];
          },
        },
      });
    } else {
      // Multi-capability tools generate one function per capability
      for (const capability of this.capabilities) {
        const toolPrefix = this.name.toLowerCase().replace(/\s+/g, "_");
        const capabilityName = capability.name
          .toLowerCase()
          .replace(/\s+/g, "_");
        const name = `${toolPrefix}-${capabilityName}`;

        // Convert Zod schema to JSON Schema, with type compatibility handling
        const parameters = capability.inputSchema
          ? zodToJsonSchema(capability.inputSchema)
          : { type: "object", properties: {} };

        functions.push({
          type: "function",
          function: {
            name,
            description: capability.description,
            parameters: parameters as {
              type: string;
              properties: Record<string, any>;
              required?: string[];
            },
          },
        });
      }
    }

    return functions;
  }

  /**
   * Handle a tool call for this tool
   * @param name Function name
   * @param args Function arguments
   * @returns The result of the tool execution, or undefined if this tool can't handle the call
   */
  async handleToolCall(name: string, args: any) {
    const toolPrefix = this.name.toLowerCase().replace(/\s+/g, "_");

    // Check if this call is for this tool
    if (!name.startsWith(`${toolPrefix}-`)) {
      return undefined;
    }

    const [_, capabilityName] = name.split("-");

    let result;
    if (this.isSingleCapabilityTool && capabilityName === toolPrefix) {
      // This is a single-capability tool
      result = await this.run().handler({ input: args });
    } else {
      // Try to find the right capability
      for (const capability of this.capabilities) {
        const capabilitySnakeCase = capability.name
          .toLowerCase()
          .replace(/\s+/g, "_");

        if (capabilitySnakeCase === capabilityName) {
          result = await this.run(capability.name).handler({
            input: args,
          });
          break;
        }
      }
    }

    return result;
  }

  /**
   * Configure LLM-specific response formatting
   * @param options Formatting options for LLM responses
   * @returns this ToolBuilder instance
   */
  llm(options: LLMFormatterOptions): ToolBuilder {
    // If we have just finished working with a specific capability, apply the LLM to that capability
    if (this.capabilities.length > 0) {
      const lastCapability = this.capabilities[
        this.capabilities.length - 1
      ] as CapabilityBuilder;
      lastCapability.llm(options);
      return this;
    }

    // Single capability tool case or no capabilities added yet
    this.isSingleCapabilityTool = true;

    if (!this.singleCapability) {
      // Create an implicit capability with the same name as the tool
      this.singleCapability = this.capability({
        name: this.name,
        description: this.description,
      });
    }

    // For single-capability tools, apply the formatter directly
    this.singleCapability.llm(options);
    return this;
  }

  /**
   * Get a capability by name
   * @param name Name of the capability to get
   * @returns The capability builder or undefined if not found
   */
  getCapability(name: string): CapabilityBuilder | undefined {
    return this.capabilities.find(
      (c) =>
        c.name.toLowerCase() === name.toLowerCase() ||
        c.name.toLowerCase().replace(/\s+/g, "_") ===
          name.toLowerCase().replace(/\s+/g, "_"),
    ) as CapabilityBuilder | undefined;
  }
}
