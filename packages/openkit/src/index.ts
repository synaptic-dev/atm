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
  LLMFormatterOptions,
} from "./builders/types";

// Export classes
export { AppBuilder } from "./builders/app-builder";
export { RouteBuilder } from "./builders/route-builder";
export { OpenAIAdapter } from "./adapters/openai";

// Export OpenAI types from types file
export type {
  OpenAIChatCompletionTool,
  OpenAIChatCompletionMessage,
  OpenAIChatCompletion,
  OpenAIChatCompletionToolMessageParam,
  ToolCall,
} from "./types";

// Import types for type inference utilities
import type { RouteBuilder } from "./builders/route-builder";
import type { AppBuilder } from "./builders/app-builder";
import type { z } from "zod";

/**
 * Extract the input type from a RouteBuilder
 * @example
 * ```typescript
 * const route = app.route({ name: "myRoute", path: "/my-route" })
 *   .input(z.object({ name: z.string() }));
 *
 * // Will be { name: string }
 * type MyInputType = RouteInput<typeof route>;
 * ```
 */
export type RouteInput<T extends RouteBuilder<any, any, any>> =
  T extends RouteBuilder<infer I, any, any> ? I : never;

/**
 * Extract the output type from a RouteBuilder
 * @example
 * ```typescript
 * const route = app.route({ name: "myRoute", path: "/my-route" })
 *   .output(z.object({ result: z.boolean() }));
 *
 * // Will be { result: boolean }
 * type MyOutputType = RouteOutput<typeof route>;
 * ```
 */
export type RouteOutput<T extends RouteBuilder<any, any, any>> =
  T extends RouteBuilder<any, infer O, any> ? O : never;

/**
 * Extract the context type from an AppBuilder
 * @example
 * ```typescript
 * const app = openkit.app({ name: "myApp" })
 *   .context({ logger: console, db: myDatabase });
 *
 * // Will include { logger: Console, db: Database }
 * type MyAppContext = AppContext<typeof app>;
 * ```
 */
export type AppContext<T extends AppBuilder> = T extends AppBuilder
  ? T["context"]
  : never;

/**
 * Infer zod schema type
 * @example
 * ```typescript
 * const userSchema = z.object({ name: z.string(), age: z.number() });
 *
 * // Will be { name: string, age: number }
 * type User = ZodInfer<typeof userSchema>;
 * ```
 */
export type ZodInfer<T extends z.ZodType<any, any, any>> = z.infer<T>;

// Default export
export { default } from "./openkit";
