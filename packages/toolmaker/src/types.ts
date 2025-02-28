import { z } from 'zod';
import { Tool } from './tool';
import { ToolCapability } from './tool-capability';
import type { ChatCompletionTool } from 'openai/resources/chat';
import type { ChatCompletion, ChatCompletionMessage } from 'openai/resources/chat';
import type { ChatCompletionToolMessageParam } from 'openai/resources/chat/completions';


/**
 * Options for creating a new Toolkit
 */
export interface ToolkitOptions {
  tools: Tool[];
}

/**
 * Options for creating a new Tool with multiple capabilities
 */
export interface MultiCapabilityToolOptions {
  name: string;
  description: string;
  capabilities?: Array<ToolCapability<any>>;
}

/**
 * Options for creating a new Tool with a single capability
 */
export interface SingleCapabilityToolOptions<T extends z.ZodType> {
  name: string;
  description: string;
  schema?: T;
  runner: (params: z.infer<T>) => Promise<any>;
}

/**
 * Options for creating a new Tool
 * @deprecated Use MultiCapabilityToolOptions or SingleCapabilityToolOptions instead
 */
export interface ToolOptions extends MultiCapabilityToolOptions {}

/**
 * Options for creating a new ToolCapability
 */
export interface ToolCapabilityOptions<T extends z.ZodType> {
  name: string;
  description: string;
  schema?: T;
  runner: (params: z.infer<T>) => Promise<any>;
}

/**
 * Represents a tool call from OpenAI API
 */
export interface ToolCall {
  id: string;
  index: number;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * OpenAI Compatible Types
 */

export type OpenAIChatCompletionTool = ChatCompletionTool;
export type OpenAIChatCompletion = ChatCompletion;
export type OpenAIChatCompletionMessage = ChatCompletionMessage;
export type OpenAIChatCompletionToolMessageParam = ChatCompletionToolMessageParam;