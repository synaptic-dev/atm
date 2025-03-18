import type { ChatCompletionTool } from "openai/resources/chat";
import type {
  ChatCompletion,
  ChatCompletionMessage,
} from "openai/resources/chat";
import type { ChatCompletionToolMessageParam } from "openai/resources/chat/completions";

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
export type OpenAIChatCompletionToolMessageParam =
  ChatCompletionToolMessageParam;
