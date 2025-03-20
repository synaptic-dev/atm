import { z } from "zod";

/**
 * OpenAI function definition interface
 */
export interface OpenAIFunctionDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

/**
 * Context object passed to middleware and handlers
 */
export type Context<T = unknown> = T & Record<string, unknown>;

/**
 * Next function type for middleware
 */
export interface NextFunction {
  <T extends Record<string, unknown> = Record<string, unknown>>(options?: {
    context?: T;
  }): Promise<{ context: T } | void>;
}

/**
 * Middleware function interface
 */
export interface MiddlewareFunction<
  C extends Record<string, unknown> = Record<string, unknown>,
  ExtendedContext extends Record<string, unknown> = Record<string, unknown>,
> {
  (
    context: C,
    next: NextFunction,
  ): Promise<{ context: ExtendedContext } | void>;
}

/**
 * Handler function interface
 */
export interface HandlerFunction<
  I = unknown,
  O = unknown,
  C extends Record<string, unknown> = Record<string, unknown>,
> {
  ({ input, context }: { input: I; context: C }): Promise<O>;
}

/**
 * Options for creating a new App using the builder pattern
 */
export interface AppBuilderOptions {
  name: string;
  description?: string;
}

/**
 * Options for creating a new route using the builder pattern
 */
export interface RouteBuilderOptions {
  name: string;
  description?: string;
  path: string;
}

/**
 * Options for the OpenAI adapter
 */
export interface OpenAIAdapterOptions {
  apps: AppBuilderObject<any>[];
}

/**
 * Result of an app run
 */
export interface AppRunResult<
  T = unknown,
  C extends Record<string, unknown> = Record<string, unknown>,
> {
  handler: (params: { input?: unknown; context?: C }) => Promise<T>;
}

/**
 * LLM response formatter options
 */
export interface LLMFormatterOptions<
  I = unknown,
  O = unknown,
  C extends Record<string, unknown> = Record<string, unknown>,
> {
  /** Format successful results for LLM consumption */
  success?: (result: O, input?: I, context?: C) => unknown;
  /** Format errors for LLM consumption */
  error?: (error: Error, input?: I, context?: C) => unknown;
}

/**
 * Builder object for a route
 */
export interface RouteBuilderObject<
  I = unknown,
  O = unknown,
  C extends Record<string, unknown> = Record<string, unknown>,
> {
  name: string;
  description: string;
  path: string;
  inputSchema?: z.ZodType<I>;
  outputSchema?: z.ZodType<O>;
  middleware: MiddlewareFunction<C>[];
  _handler?: HandlerFunction<I, O, C>;
  _validateInput(input: unknown): I;
  _validateOutput(output: unknown): O;
  debug(): RouteBuilderObject<I, O, C>;
  run(input?: unknown): AppRunResult<O, C>;
}

/**
 * Builder object for an app
 */
export interface AppBuilderObject<
  C extends Record<string, unknown> = Record<string, unknown>,
> {
  name: string;
  description: string;
  routes: RouteBuilderObject<unknown, unknown, C>[];
  getOpenAIFunctions(): OpenAIFunctionDefinition[];
  debug(): AppBuilderObject<C>;
}
