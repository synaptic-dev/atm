import { z } from "zod";
import {
  CapabilityBuilderOptions,
  HandlerFunction,
  MiddlewareFunction,
  CapabilityBuilderObject,
  ToolRunResult,
  Context,
  LLMFormatterOptions,
} from "./types";
import { ToolBuilder } from "./tool-builder";

/**
 * Builder for creating capabilities with a fluent API
 */
export class CapabilityBuilder implements CapabilityBuilderObject {
  public name: string;
  public description: string;
  public inputSchema?: z.ZodType;
  public outputSchema?: z.ZodType;
  public middleware: MiddlewareFunction[] = [];
  public _handler?: HandlerFunction;
  private _llmFormatter?: LLMFormatterOptions;

  private toolBuilder: ToolBuilder;

  /**
   * Create a new CapabilityBuilder
   * @param toolBuilder Parent tool builder
   * @param options Capability configuration options
   */
  constructor(toolBuilder: ToolBuilder, options: CapabilityBuilderOptions) {
    this.toolBuilder = toolBuilder;
    this.name = options.name;
    this.description = options.description || "";
  }

  /**
   * Define the input schema for this capability
   * @param schema Zod schema for input validation
   * @returns this CapabilityBuilder instance
   */
  input<T extends z.ZodType>(schema: T): CapabilityBuilder {
    this.inputSchema = schema;
    return this;
  }

  /**
   * Define the output schema for this capability
   * @param schema Zod schema for output validation
   * @returns this CapabilityBuilder instance
   */
  output<T extends z.ZodType>(schema: T): CapabilityBuilder {
    this.outputSchema = schema;
    return this;
  }

  /**
   * Add middleware to this capability
   * @param middleware Middleware function
   * @returns this CapabilityBuilder instance
   */
  use(middleware: MiddlewareFunction): CapabilityBuilder {
    this.middleware.push(middleware);
    return this;
  }

  /**
   * Define the handler function for this capability
   * @param handler Handler function
   * @returns Parent ToolBuilder to continue chain
   */
  handler<I = any, O = any>(handler: HandlerFunction<I, O>): ToolBuilder {
    this._handler = handler as HandlerFunction;
    return this.toolBuilder;
  }

  /**
   * Configure LLM-specific response formatting
   * @param options Formatting options for LLM responses
   * @returns Parent ToolBuilder instance for method chaining
   */
  llm(options: LLMFormatterOptions): ToolBuilder {
    this._llmFormatter = options;
    return this.toolBuilder;
  }

  /**
   * Create a runner for direct invocation of this capability
   * @returns Object with handler function for executing the capability
   */
  run<T = any>(): ToolRunResult<T> {
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
          const validatedInput = this._validateInput(input);

          // Create middleware chain
          let index = -1;
          const middlewares = [...this.middleware];

          const dispatch = async (i: number): Promise<any> => {
            if (i === middlewares.length) {
              // End of middleware chain, execute handler
              if (!this._handler) {
                throw new Error(
                  `No handler defined for capability "${this.name}"`,
                );
              }
              return this._handler({ input: validatedInput, context });
            }

            // Execute next middleware
            const middleware = middlewares[i];
            return middleware(context, () => dispatch(i + 1));
          };

          // Start middleware chain
          const result = await dispatch(0);

          // Validate output
          const validatedOutput = this._validateOutput(result);

          // Always apply LLM formatting if configured
          if (this._llmFormatter?.success) {
            const formatted = this._llmFormatter.success(
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
          if (this._llmFormatter?.error) {
            const formatted = this._llmFormatter.error(
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
   * Return to parent tool builder
   * @returns Parent ToolBuilder
   */
  tool(): ToolBuilder {
    return this.toolBuilder;
  }

  /**
   * Validate input against schema
   * @param input Input data to validate
   * @returns Validated input
   * @internal
   */
  _validateInput(input: any): any {
    if (!this.inputSchema) {
      // No schema, pass through
      return input;
    }

    try {
      return this.inputSchema.parse(input);
    } catch (error) {
      throw new Error(
        `Invalid input for capability "${this.name}": ${(error as Error).message}`,
      );
    }
  }

  /**
   * Validate output against schema
   * @param output Output data to validate
   * @returns Validated output
   * @internal
   */
  _validateOutput(output: any): any {
    if (!this.outputSchema) {
      // No schema, pass through
      return output;
    }

    try {
      return this.outputSchema.parse(output);
    } catch (error) {
      throw new Error(
        `Invalid output for capability "${this.name}": ${(error as Error).message}`,
      );
    }
  }
}
