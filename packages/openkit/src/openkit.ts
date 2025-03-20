import { AppBuilder } from "./builders/app-builder";
import { OpenAIAdapter } from "./adapters/openai";
import { AppBuilderOptions, OpenAIAdapterOptions } from "./builders/types";

/**
 * Main OpenKit class to create and manage apps
 */
export class OpenKit {
  /**
   * Create a new app
   * @param options App configuration
   * @returns AppBuilder instance
   */
  app(options: AppBuilderOptions): AppBuilder {
    return new AppBuilder(options);
  }

  /**
   * Create an OpenAI adapter for function calling
   * @param options OpenAI adapter configuration
   * @returns OpenAIAdapter instance
   */
  openai(options: OpenAIAdapterOptions): OpenAIAdapter {
    const { apps } = options;
    return new OpenAIAdapter({ apps });
  }
}

// Export a singleton instance
export const openkit = new OpenKit();
export default openkit;
