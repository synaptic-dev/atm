import { OpenAIAdapterOptions } from "./types";
import {
  OpenAIChatCompletionTool,
  OpenAIChatCompletionToolMessageParam,
} from "../types";

/**
 * OpenAI adapter for converting tools to OpenAI function calling format
 */
export class OpenAIAdapter {
  private _tools: any[];

  /**
   * Create a new OpenAI adapter
   * @param options OpenAI adapter options
   */
  constructor(options: OpenAIAdapterOptions) {
    this._tools = options.tools;
  }

  /**
   * Get OpenAI function definitions for all tools
   * @returns Array of OpenAI function definitions
   */
  tools(): OpenAIChatCompletionTool[] {
    // Collect function definitions from all tools
    const allDefinitions: OpenAIChatCompletionTool[] = [];

    for (const tool of this._tools) {
      // Each tool has its own way to generate OpenAI functions
      if (typeof tool.getOpenAIFunctions === "function") {
        const functions = tool.getOpenAIFunctions();
        allDefinitions.push(...functions);
      }
    }

    return allDefinitions;
  }

  /**
   * Handle OpenAI tool calls
   * @param options Object containing message or chatCompletion
   * @returns Tool responses for OpenAI
   */
  async handler(options: {
    message?: any;
    chatCompletion?: any;
  }): Promise<OpenAIChatCompletionToolMessageParam[]> {
    // Extract message from either direct message or chat completion
    const message =
      options.message || options.chatCompletion?.choices?.[0]?.message;

    if (!message || !message.tool_calls || !message.tool_calls.length) {
      return [];
    }

    const results: OpenAIChatCompletionToolMessageParam[] = [];

    // Handle each tool call
    for (const toolCall of message.tool_calls) {
      const { id, function: fn } = toolCall;
      const { name, arguments: argsStr } = fn;

      try {
        // Parse arguments
        const args = JSON.parse(argsStr);

        // Find the right tool and execute
        let response: any = null;

        for (const tool of this._tools) {
          if (typeof tool.handleToolCall === "function") {
            // Try to handle with this tool
            const handled = await tool.handleToolCall(name, args);
            if (handled !== undefined) {
              response = handled;
              break;
            }
          }
        }

        // Create response
        results.push({
          role: "tool",
          tool_call_id: id,
          content: JSON.stringify(response),
        });
      } catch (error) {
        // Handle errors
        results.push({
          role: "tool",
          tool_call_id: id,
          content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }

    return results;
  }
}
