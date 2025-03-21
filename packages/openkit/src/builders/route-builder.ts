import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  RouteBuilderOptions,
  HandlerFunction,
  MiddlewareFunction,
  RouteBuilderObject,
  AppRunResult,
  Context,
  LLMFormatterOptions,
  NextFunction,
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
  "\n\n========================== OpenKit Debug =============================\n\n";

/**
 * Builder for creating routes with a fluent API
 */
export class RouteBuilder<
  I = unknown,
  O = unknown,
  C extends Record<string, unknown> = Record<string, unknown>,
> implements RouteBuilderObject<I, O, C>
{
  public name: string;
  public description: string;
  public path: string;
  public inputSchema?: z.ZodType<I>;
  public outputSchema?: z.ZodType<O>;
  public middleware: MiddlewareFunction<C>[] = [];
  public _handler?: HandlerFunction<I, O, C>;
  private _llmFormatter?: LLMFormatterOptions<I, O, C>;
  private _debugEnabled: boolean = false;

  /**
   * Parent app builder
   */
  public app: AppBuilder<C>;

  /**
   * Create a new RouteBuilder
   * @param appBuilder Parent app builder
   * @param options Route configuration options
   */
  constructor(appBuilder: AppBuilder<C>, options: RouteBuilderOptions) {
    this.app = appBuilder;
    this.name = options.name;
    this.description = options.description || "";
    this.path = options.path;
  }

  /**
   * Define input schema for this route
   * @param schema Zod schema for input validation
   * @returns this RouteBuilder instance with updated type parameter
   */
  input<NewI>(schema: z.ZodType<NewI>): RouteBuilder<NewI, O, C> {
    this.inputSchema = schema as any;
    return this as any as RouteBuilder<NewI, O, C>;
  }

  /**
   * Define output schema for this route
   * @param schema Zod schema for output validation
   * @returns this RouteBuilder instance with updated type parameter
   */
  output<NewO>(schema: z.ZodType<NewO>): RouteBuilder<I, NewO, C> {
    this.outputSchema = schema as any;
    return this as any as RouteBuilder<I, NewO, C>;
  }

  /**
   * Add middleware to this route
   * @param middleware Middleware function
   * @returns this RouteBuilder instance with updated context type
   */
  use<ExtendedContext extends Record<string, unknown> = {}>(
    middleware: (
      context: C,
      next: NextFunction,
    ) => Promise<{ context: ExtendedContext } | void>,
  ): RouteBuilder<I, O, C & ExtendedContext> {
    // Store the middleware but maintain the broader C type for backwards compatibility
    this.middleware.push(middleware as unknown as MiddlewareFunction<C>);

    // Return a RouteBuilder with the combined context type
    return this as unknown as RouteBuilder<I, O, C & ExtendedContext>;
  }

  /**
   * Define handler for this route
   * @param handler Handler function
   * @returns This RouteBuilder instance
   */
  handler<HandlerReturn = O>(
    handler: ({
      input,
      context,
    }: {
      input: I;
      context: C;
    }) => Promise<HandlerReturn>,
  ): RouteBuilder<
    I,
    // More reliable check: Is O still effectively unknown?
    // If yes, use HandlerReturn, otherwise use O (explicitly set output type)
    [O] extends [unknown] ? HandlerReturn : O,
    C
  > {
    // Store the handler with the appropriate typing
    this._handler = handler as unknown as HandlerFunction<I, O, C>;

    // Add default LLM formatter if not explicitly set
    if (!this._llmFormatter) {
      this.llm({
        success: (result: any) => result,
        error: (error) => ({
          error: error.message,
          details: error.stack,
        }),
      });
    }

    // Return with proper type constraint enforcement
    return this as unknown as RouteBuilder<
      I,
      [O] extends [unknown] ? HandlerReturn : O,
      C
    >;
  }

  /**
   * Enable debugging for this route
   * @returns this RouteBuilder instance
   */
  debug(): RouteBuilder<I, O, C> {
    this._debugEnabled = true;
    return this;
  }

  /**
   * Create a runner for direct invocation of this route
   * @param rootContext Optional context to use for this invocation
   * @returns Object with handler function for executing the route
   */
  run(rootContext: C = {} as C): AppRunResult<O, C> {
    logger.debug(logBoundary);
    const startTime = Date.now();

    // Basic app and route info for logs
    const baseLogInfo = {
      app: {
        name: this.app.name,
        description: this.app.description,
        routes: this.app.routes.reduce(
          (acc, route) => {
            acc[route.path] = {
              name: route.name,
              path: route.path,
              description: route.description,
            };
            return acc;
          },
          {} as Record<
            string,
            { name: string; path: string; description: string }
          >,
        ),
      },
      route: {
        name: this.name,
        path: this.path,
        description: this.description,
      },
    };

    const appChildLogger = logger.child({
      ...baseLogInfo,
      event: "app_start",
    });

    appChildLogger.debug("App started");

    // Create a handler function that will be returned
    const handler = async ({
      input = {} as unknown,
      context = {} as C,
    }: {
      input?: unknown;
      context?: C;
    }): Promise<O> => {
      // Check if this is being called from a tool call
      const fromContext = rootContext as Record<string, unknown>;
      const isFromToolCall = fromContext._fromToolCall === true;

      // Make sure a handler is defined
      if (!this._handler) {
        if (this._debugEnabled) {
          // Log error
          const child = logger.child({
            ...baseLogInfo,
            event: "route_internal_error",
            error: "No handler defined",
            duration: Date.now() - startTime,
          });
          child.debug(`No handler defined for route`);

          // Only show boundary if not called from a tool call
          if (!isFromToolCall) {
            logger.debug(logBoundary);
          }
        }
        throw new Error(`No handler defined for route "${this.name}"`);
      }

      // Create the middleware chain
      let currentMiddlewareIndex = -1;
      let combinedContext = {
        ...rootContext,
        ...context,
      } as C;

      // Define the next function that will be passed to middleware
      //@ts-expect-error: TODO: fix in the future
      const next: NextFunction = async (options?: {
        context?: any;
      }): Promise<unknown> => {
        currentMiddlewareIndex++;

        // If middleware provided a context update, merge it with the combined context
        if (options?.context) {
          // Create a new context object with the updates
          combinedContext = {
            ...combinedContext,
            ...options.context,
          } as C;
        }

        // If we've gone through all middleware, execute the handler
        if (currentMiddlewareIndex >= this.middleware.length) {
          const validatedInput = this._validateInput(input);

          try {
            if (this._debugEnabled) {
              // If this is from a tool call, log that we're starting route execution
              // but never show boundary (app-builder handles that)
              const child = logger.child({
                ...baseLogInfo,
                event: "resolve_start",
                input,
                context,
              });
              child.debug(`Route handler resolve started`);
            }
            // Execute the handler
            const result = await this._handler!({
              input: validatedInput,
              context: combinedContext,
            });

            // Log the raw handler result if debugging is enabled and this is a tool call
            if (this._debugEnabled) {
              const handlerResultChild = logger.child({
                ...baseLogInfo,
                event: "resolve_end",
                input: validatedInput,
                raw_result: JSON.stringify(result),
              });
              handlerResultChild.debug("Route handler resolve end");
            }

            // Validate the output
            const validatedOutput = this._validateOutput(result);

            // If there's an LLM formatter, use it for success
            if (
              this._llmFormatter &&
              typeof this._llmFormatter.success === "function"
            ) {
              const llmFormatterChild = logger.child({
                ...baseLogInfo,
                event: "llm_formatter_start",
                input: validatedInput,
                raw_result: JSON.stringify(validatedOutput),
                context: combinedContext,
              });
              llmFormatterChild.debug("LLM formatter started");

              const formatted = this._llmFormatter.success(
                validatedOutput,
                validatedInput,
                combinedContext,
              );

              if (this._debugEnabled) {
                const formatterChild = logger.child({
                  ...baseLogInfo,
                  event: "llm_formatter_end",
                  input: validatedInput,
                  raw_result: JSON.stringify(validatedOutput),
                  llm_formatter: {
                    success: {
                      hasFormatter: true,
                      output: formatted,
                    },
                  },
                });
                formatterChild.debug("LLM formatter end");

                // Add tool call completion log
                const completeChild = logger.child({
                  ...baseLogInfo,
                  event: "resolve_end",
                  input: validatedInput,
                  output: formatted,
                  duration: `${Date.now() - startTime}ms`,
                });
                completeChild.debug("Resolve end");
              }

              // Only show boundary for non-tool calls at the very end
              if (this._debugEnabled) {
                logger.debug(logBoundary);
              }

              return formatted;
            }

            // Debug logging
            if (this._debugEnabled && !isFromToolCall) {
              // Only log success if not called from a tool call
              const child = logger.child({
                ...baseLogInfo,
                event: "route_internal_success",
                input: validatedInput,
                output: validatedOutput,
                context: combinedContext,
                duration: Date.now() - startTime,
              });
              // Use debug level instead of info
              child.debug(`Route succeeded`);
              // Only show boundary if not called from a tool call
              logger.debug(logBoundary);
            } else if (this._debugEnabled && isFromToolCall) {
              // Add tool call completion log
              const completeChild = logger.child({
                ...baseLogInfo,
                event: "tool_call_complete",
                input: validatedInput,
                output: validatedOutput,
                duration: Date.now() - startTime,
              });
              completeChild.debug(`Tool call completed`);

              // Add a separate format log that appears after tool call completion
              const formatChild = logger.child({
                ...baseLogInfo,
                event: "route_formatted_output",
                formatted_output: validatedOutput,
              });
              formatChild.debug(`Route formatted output`);
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
              if (this._debugEnabled && !isFromToolCall) {
                // Show error and boundary at the very end
                const child = logger.child({
                  ...baseLogInfo,
                  event: "route_internal_formatted_error",
                  input: validatedInput,
                  error: (error as Error).message,
                  formattedOutput: formatted,
                  context: combinedContext,
                  duration: Date.now() - startTime,
                });
                child.debug(`Route formatted error`);
                logger.debug(logBoundary);
              } else if (this._debugEnabled && isFromToolCall) {
                // For tool calls, show error but let app-builder handle the boundary
                const errorChild = logger.child({
                  ...baseLogInfo,
                  event: "route_formatted_error",
                  input: validatedInput,
                  error: (error as Error).message,
                  formatted_output: formatted,
                });
                errorChild.debug(`Route formatted error`);

                // Add tool call error completion log
                const completeChild = logger.child({
                  ...baseLogInfo,
                  event: "tool_call_complete",
                  input: validatedInput,
                  output: formatted,
                  error: true,
                  error_message: (error as Error).message,
                  duration: Date.now() - startTime,
                });
                completeChild.debug(`Tool call completed with error`);
              }

              return formatted;
            }

            // Debug logging
            if (this._debugEnabled && !isFromToolCall) {
              // Show error and boundary at the very end
              const child = logger.child({
                ...baseLogInfo,
                event: "route_internal_error",
                input: validatedInput,
                error: (error as Error).message,
                stack: (error as Error).stack,
                context: combinedContext,
                duration: Date.now() - startTime,
              });
              child.debug(`Route error`);
              logger.debug(logBoundary);
            } else if (this._debugEnabled && isFromToolCall) {
              // For tool calls, show error but let app-builder handle the boundary
              const errorChild = logger.child({
                ...baseLogInfo,
                event: "route_error",
                input: validatedInput,
                error: (error as Error).message,
                stack: (error as Error).stack,
              });
              errorChild.debug(`Route error`);

              // Add tool call error completion log
              const completeChild = logger.child({
                ...baseLogInfo,
                event: "tool_call_complete",
                input: validatedInput,
                error: true,
                error_message: (error as Error).message,
                duration: Date.now() - startTime,
              });
              completeChild.debug(`Tool call completed with error`);
            }

            throw error;
          }
        }

        // Otherwise, execute the next middleware
        const currentMiddleware = this.middleware[currentMiddlewareIndex];
        return await currentMiddleware(combinedContext, next);
      };

      // Start the middleware chain
      const result = await next();
      return result as O;
    };

    return { handler };
  }

  /**
   * Define LLM response formatter for this route
   *
   * @template TResult Optional more specific result type for the formatter
   * @param options LLM response formatter options
   * @returns Parent AppBuilder instance
   */
  llm<TResult = O>(options: {
    success?: (result: TResult, input?: I, context?: C) => unknown;
    error?: (error: Error, input?: I, context?: C) => unknown;
  }): AppBuilder<any> {
    this._llmFormatter = options as unknown as LLMFormatterOptions<I, O, C>;
    return this.app;
  }

  /**
   * Get formatter information
   * @returns Object with formatter details or null if no formatter
   * @internal
   */
  _getFormatterInfo(): {
    hasSuccessFormatter: boolean;
    hasErrorFormatter: boolean;
    successFormatter?: (...args: any[]) => unknown;
    errorFormatter?: (...args: any[]) => unknown;
  } | null {
    if (!this._llmFormatter) {
      return null;
    }

    return {
      hasSuccessFormatter: typeof this._llmFormatter.success === "function",
      hasErrorFormatter: typeof this._llmFormatter.error === "function",
      successFormatter: this._llmFormatter.success,
      errorFormatter: this._llmFormatter.error,
    };
  }

  /**
   * Create an OpenAI function definition from this route
   * Note: This is for internal use by the app builder
   */
  _toOpenAIFunction(): any {
    const schema = this.inputSchema || z.object({});
    const jsonSchema = zodToJsonSchema(schema);

    return {
      type: "function",
      function: {
        name: this.path,
        description: this.description,
        parameters: {
          type: "object",
          properties: (jsonSchema as any).properties || {},
          required: (jsonSchema as any).required || [],
        },
      },
    };
  }

  /**
   * Validate input against the input schema
   * Note: This is for internal use
   */
  _validateInput(input: unknown): I {
    if (!this.inputSchema) return input as I;

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
  _validateOutput(output: unknown): O {
    if (!this.outputSchema) return output as O;

    try {
      return this.outputSchema.parse(output);
    } catch (error) {
      throw new Error(
        `Invalid output from route "${this.name}": ${(error as Error).message}`,
      );
    }
  }

  /**
   * Define the handler function for this route and return the handler function
   * @param handler Handler function
   * @returns Handler function for immediate execution
   */
  createHandler<HandlerReturn = O>(
    handler: ({
      input,
      context,
    }: {
      input: I;
      context: C;
    }) => Promise<HandlerReturn>,
  ): AppRunResult<
    // More reliable check: Is O still effectively unknown?
    // If yes, use HandlerReturn, otherwise use O (explicitly set output type)
    [O] extends [unknown] ? HandlerReturn : O,
    C
  > {
    // Store the handler with the appropriate typing
    this._handler = handler as unknown as HandlerFunction<I, O, C>;

    // Add default LLM formatter
    if (!this._llmFormatter) {
      this.llm({
        success: (result: any) => result,
        error: (error) => ({
          error: error.message,
          details: error.stack,
        }),
      });
    }

    // Return the runnable handler with proper type constraint enforcement
    return this.run({} as C) as unknown as AppRunResult<
      [O] extends [unknown] ? HandlerReturn : O,
      C
    >;
  }
}
