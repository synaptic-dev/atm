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
 * Options for creating a new Tool using the builder pattern
 */
export interface ToolBuilderOptions {
  name: string;
  description?: string;
}

/**
 * Options for creating a new capability using the builder pattern
 */
export interface CapabilityBuilderOptions {
  name: string;
  description?: string;
}

/**
 * Options for the OpenAI adapter
 */
export interface OpenAIAdapterOptions {
  tools: any[];
}

/**
 * Context object passed to middleware and handlers
 */
export interface Context {
  [key: string]: any;
}

/**
 * Result of a tool run
 */
export interface ToolRunResult<T = any> {
  handler: (params: { input?: any; context?: Context }) => Promise<T>;
}

/**
 * Builder object for a tool
 */
export interface ToolBuilderObject {
  name: string;
  description: string;
  capabilities: CapabilityBuilderObject[];
  getOpenAIFunctions(): OpenAIFunctionDefinition[];
}

/**
 * Builder object for a capability
 */
export interface CapabilityBuilderObject {
  name: string;
  description: string;
  inputSchema?: z.ZodType;
  outputSchema?: z.ZodType;
  middleware: MiddlewareFunction[];
  _handler?: HandlerFunction;
  _validateInput(input: any): any;
  _validateOutput(output: any): any;
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
