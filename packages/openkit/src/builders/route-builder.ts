import { z } from "zod";
import {
  RouteBuilderOptions,
  HandlerFunction,
  MiddlewareFunction,
  RouteBuilderObject,
  AppRunResult,
  Context,
  LLMFormatterOptions,
} from "./types";
import { AppBuilder } from "./app-builder";
import pino from "pino";

// Create a logger instance with a lower log level to make logs visible
const logger = pino({
  level: "debug",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: true, // Use pino's built-in time translation
      ignore: "pid,hostname",
      messageFormat: "{msg}",
    },
  },
});

// Log boundary to make debug logs more visible
const logBoundary =
  "========================== OpenKit Debug =============================";

/**
 * Builder for creating routes with a fluent API
 */
export class RouteBuilder implements RouteBuilderObject {
  public name: string;
  public description: string;
  public path: string;
  public inputSchema?: z.ZodType;
  public outputSchema?: z.ZodType;
  public middleware: MiddlewareFunction[] = [];
  public _handler?: HandlerFunction;
  private _llmFormatter?: LLMFormatterOptions;
  private _debugEnabled: boolean = false;

  /**
   * Parent app builder
   */
  public app: AppBuilder;

  /**
   * Create a new RouteBuilder
   * @param appBuilder Parent app builder
   * @param options Route configuration options
   */
  constructor(appBuilder: AppBuilder, options: RouteBuilderOptions) {
    this.app = appBuilder;
    this.name = options.name;
    this.description = options.description || "";
    this.path = options.path;
  }

  /**
   * Define the input schema for this route
   * @param schema Zod schema for input validation
   * @returns this RouteBuilder instance
   */
  input<T extends z.ZodType>(schema: T): RouteBuilder {
    this.inputSchema = schema;
    return this;
  }

  /**
   * Define the output schema for this route
   * @param schema Zod schema for output validation
   * @returns this RouteBuilder instance
   */
  output<T extends z.ZodType>(schema: T): RouteBuilder {
    this.outputSchema = schema;
    return this;
  }

  /**
   * Add middleware to this route
   * @param middleware Middleware function
   * @returns this RouteBuilder instance
   */
  use(middleware: MiddlewareFunction): RouteBuilder {
    this.middleware.push(middleware);
    return this;
  }

  /**
   * Define the handler function for this route
   * @param handler Handler function
   * @returns Parent AppBuilder to continue chain
   */
  handler<I = any, O = any>(handler: HandlerFunction<I, O>): AppBuilder {
    this._handler = handler as HandlerFunction;

    // Store a reference to the parent app to ensure it's always accessible
    const parentApp = this.app;

    // Ensure the app property is maintained after handler is set
    Object.defineProperty(this, "app", {
      get: () => parentApp,
      configurable: false,
      enumerable: true,
    });

    return this.app;
  }

  /**
   * Define the handler function for this route and return the handler function
   * @param handler Handler function
   * @returns Handler function for immediate execution
   */
  createHandler<I = any, O = any>(
    handler: HandlerFunction<I, O>,
  ): AppRunResult<O> {
    this._handler = handler as HandlerFunction;

    // Add default LLM formatter
    if (!this._llmFormatter) {
      this.llm({
        success: (result) => result,
        error: (error) => {
          throw error;
        },
      });
    }

    // Return the runnable handler
    return this.run({});
  }

  /**
   * Enable debugging for this route
   * @returns this RouteBuilder instance
   */
  debug(): RouteBuilder {
    this._debugEnabled = true;
    return this;
  }

  /**
   * Create a runner for direct invocation of this route
   * @returns Object with handler function for executing the route
   */
  run<T = any>(rootContext: Context = {}): AppRunResult<T> {
    // Create a handler function that will be returned
    const handler = async ({
      input = {},
      context = {},
    }: {
      input?: any;
      context?: Context;
    }): Promise<T> => {
      const startTime = Date.now();

      // Basic app and route info for logs
      const baseLogInfo = {
        app_name: this.app.name,
        app_description: this.app.description,
        route_name: this.name,
        route_path: this.path,
        route_description: this.description,
      };

      // Check if this is being called from a tool call
      const isFromToolCall = rootContext._fromToolCall === true;

      // Debug logging if enabled, but skip boundaries if called from a tool call
      if (this._debugEnabled) {
        // Only show boundary if not called from a tool call
        if (!isFromToolCall) {
          logger.debug(logBoundary);
        }

        logger.info({
          ...baseLogInfo,
          event: "route_start",
          msg: `Route started: ${this.name}`,
          input,
          context,
        });
      }

      // Make sure a handler is defined
      if (!this._handler) {
        if (this._debugEnabled) {
          // Log error and show boundary at the very end
          logger.error({
            ...baseLogInfo,
            event: "route_error",
            msg: `No handler defined for route: ${this.name}`,
            error: "No handler defined",
            duration: Date.now() - startTime,
          });
          // Only show boundary if not called from a tool call
          if (!isFromToolCall) {
            logger.debug(logBoundary);
          }
        }
        throw new Error(`No handler defined for route "${this.name}"`);
      }

      // Create the middleware chain
      let currentMiddlewareIndex = -1;
      const combinedContext = { ...rootContext, ...context };

      // Define the next function that will be passed to middleware
      const next = async () => {
        currentMiddlewareIndex++;

        // If we've gone through all middleware, execute the handler
        if (currentMiddlewareIndex >= this.middleware.length) {
          const validatedInput = this._validateInput(input);

          try {
            // Execute the handler
            const result = await this._handler!({
              input: validatedInput,
              context: combinedContext,
            });

            // Validate the output
            const validatedOutput = this._validateOutput(result);

            // If there's an LLM formatter, use it for success
            if (
              this._llmFormatter &&
              typeof this._llmFormatter.success === "function"
            ) {
              const formatted = this._llmFormatter.success(
                validatedOutput,
                validatedInput,
                combinedContext,
              );

              // Debug logging
              if (this._debugEnabled) {
                // Show final result and boundary at the very end
                logger.info({
                  ...baseLogInfo,
                  event: "route_formatted_output",
                  msg: `Route formatted output: ${this.name}`,
                  input: validatedInput,
                  output: formatted,
                  context: combinedContext,
                  duration: Date.now() - startTime,
                });
                // Only show boundary if not called from a tool call
                if (!isFromToolCall) {
                  logger.debug(logBoundary);
                }
              }

              return formatted;
            }

            // Debug logging
            if (this._debugEnabled) {
              // Show final result and boundary at the very end
              logger.info({
                ...baseLogInfo,
                event: "route_success",
                msg: `Route succeeded: ${this.name}`,
                input: validatedInput,
                output: validatedOutput,
                context: combinedContext,
                duration: Date.now() - startTime,
              });
              // Only show boundary if not called from a tool call
              if (!isFromToolCall) {
                logger.debug(logBoundary);
              }
            }

            return validatedOutput;
          } catch (error) {
            // If there's an LLM formatter, use it for errors
            if (
              this._llmFormatter &&
              typeof this._llmFormatter.error === "function"
            ) {
              const formatted = this._llmFormatter.error(
                error as Error,
                validatedInput,
                combinedContext,
              );

              // Debug logging
              if (this._debugEnabled) {
                // Show error and boundary at the very end
                logger.error({
                  ...baseLogInfo,
                  event: "route_formatted_error",
                  msg: `Route formatted error: ${this.name} - ${(error as Error).message}`,
                  input: validatedInput,
                  error: (error as Error).message,
                  formattedOutput: formatted,
                  context: combinedContext,
                  duration: Date.now() - startTime,
                });
                // Only show boundary if not called from a tool call
                if (!isFromToolCall) {
                  logger.debug(logBoundary);
                }
              }

              return formatted;
            }

            // Debug logging
            if (this._debugEnabled) {
              // Show error and boundary at the very end
              logger.error({
                ...baseLogInfo,
                event: "route_error",
                msg: `Route error: ${this.name} - ${(error as Error).message}`,
                input: validatedInput,
                error: (error as Error).message,
                stack: (error as Error).stack,
                context: combinedContext,
                duration: Date.now() - startTime,
              });
              // Only show boundary if not called from a tool call
              if (!isFromToolCall) {
                logger.debug(logBoundary);
              }
            }

            throw error;
          }
        }

        // Otherwise, execute the next middleware
        const currentMiddleware = this.middleware[currentMiddlewareIndex];
        return await currentMiddleware(combinedContext, next);
      };

      // Start the middleware chain
      return await next();
    };

    return { handler };
  }

  /**
   * Configure LLM formatting for this route
   * @param options LLM formatter options
   * @returns this RouteBuilder instance
   */
  llm(options: LLMFormatterOptions): RouteBuilder {
    this._llmFormatter = options;
    return this;
  }

  /**
   * Create an OpenAI function definition from this route
   * Note: This is for internal use by the app builder
   */
  _toOpenAIFunction(): any {
    const schema = this.inputSchema || z.object({});
    // Use 'as any' to work around TypeScript limitation
    // ZodType doesn't expose jsonSchema in its type definitions
    const jsonSchema = (schema as any).jsonSchema || {};

    return {
      type: "function",
      function: {
        name: this.path,
        description: this.description,
        parameters: {
          type: "object",
          properties: jsonSchema.properties || {},
          required: jsonSchema.required || [],
        },
      },
    };
  }

  /**
   * Validate input against the input schema
   * Note: This is for internal use
   */
  _validateInput(input: any): any {
    if (!this.inputSchema) return input;

    try {
      return this.inputSchema.parse(input);
    } catch (error) {
      throw new Error(
        `Invalid input for route "${this.name}": ${(error as Error).message}`,
      );
    }
  }

  /**
   * Validate output against the output schema
   * Note: This is for internal use
   */
  _validateOutput(output: any): any {
    if (!this.outputSchema) return output;

    try {
      return this.outputSchema.parse(output);
    } catch (error) {
      throw new Error(
        `Invalid output from route "${this.name}": ${(error as Error).message}`,
      );
    }
  }
}
