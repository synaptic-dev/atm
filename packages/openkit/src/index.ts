// Export the new fluent API
export { default as openkit } from "./openkit";
export type {
  MiddlewareFunction,
  HandlerFunction,
  AppBuilderOptions,
  RouteBuilderOptions,
  Context,
  AppRunResult,
  OpenAIAdapterOptions,
  OpenAIFunctionDefinition,
  AppBuilderObject,
  RouteBuilderObject,
} from "./builders/types";

// Export classes
export { AppBuilder } from "./builders/app-builder";
export { RouteBuilder } from "./builders/route-builder";

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
