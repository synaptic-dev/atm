// Export the new fluent API
export { default as openkit } from "./openkit";
export type {
  MiddlewareFunction,
  HandlerFunction,
  ToolBuilderOptions,
  CapabilityBuilderOptions,
  Context,
  ToolRunResult,
  OpenAIAdapterOptions,
  OpenAIFunctionDefinition,
} from "./builders/types";

// Export OpenAI types from types file
export type {
  OpenAIChatCompletionTool,
  OpenAIChatCompletionMessage,
  OpenAIChatCompletion,
  OpenAIChatCompletionToolMessageParam,
  ToolCall,
} from "./types";

// Default export
export { default } from "./openkit";
