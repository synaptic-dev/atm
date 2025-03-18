import { ToolBuilder } from "./builders/tool-builder";
import { OpenAIAdapter } from "./builders/openai-adapter";
import { ToolBuilderOptions, OpenAIAdapterOptions } from "./builders/types";

/**
 * OpenKit main entry point for the fluent builder API
 */
export const openkit = {
  /**
   * Create a new tool using the builder pattern
   * @param options Tool configuration options
   */
  tool: (options: ToolBuilderOptions) => new ToolBuilder(options),

  /**
   * Create an OpenAI adapter for the specified tools
   * @param options OpenAI adapter options
   */
  openai: (options: OpenAIAdapterOptions) => new OpenAIAdapter(options),
};

export default openkit;
