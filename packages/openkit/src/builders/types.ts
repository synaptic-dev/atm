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
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

/**
 * Middleware function interface
 */
export interface MiddlewareFunction {
  (context: any, next: () => Promise<any>): Promise<any>;
}

/**
 * Handler function interface
 */
export interface HandlerFunction<I = any, O = any> {
  ({ input, context }: { input: I; context: any }): Promise<O>;
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
  apps: any[];
}

/**
 * Context object passed to middleware and handlers
 */
export interface Context {
  [key: string]: any;
}

/**
 * Result of an app run
 */
export interface AppRunResult<T = any> {
  handler: (params: { input?: any; context?: Context }) => Promise<T>;
}

/**
 * Builder object for an app
 */
export interface AppBuilderObject {
  name: string;
  description: string;
  routes: RouteBuilderObject[];
  getOpenAIFunctions(): OpenAIFunctionDefinition[];
  debug(): AppBuilderObject;
}

/**
 * Builder object for a route
 */
export interface RouteBuilderObject {
  name: string;
  description: string;
  path: string;
  inputSchema?: z.ZodType;
  outputSchema?: z.ZodType;
  middleware: MiddlewareFunction[];
  _handler?: HandlerFunction;
  _validateInput(input: any): any;
  _validateOutput(output: any): any;
  debug(): RouteBuilderObject;
  run(input?: any): AppRunResult;
}

/**
 * LLM response formatter options
 */
export interface LLMFormatterOptions {
  /** Format successful results for LLM consumption */
  success?: (result: any, input: any, context: any) => string | object;
  /** Format errors for LLM consumption */
  error?: (error: Error, input: any, context: any) => string | object;
}
