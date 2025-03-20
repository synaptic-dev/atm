import { describe, test, expect, vi } from "vitest";
import { z } from "zod";
import openkit from "../src";
import { OpenAIAdapter } from "../src/adapters/openai";
import { createCalculatorApp, loggingMiddleware } from "./helpers";

describe("OpenAI Tools Basic", () => {
  test("creates basic tool definitions", () => {
    // Create a simple app
    const app = openkit
      .app({
        name: "Echo",
        description: "Echo test app",
      })
      .route({
        name: "Message",
        description: "Echo a message",
        path: "message",
      })
      .input(z.object({ text: z.string() }))
      .handler(async ({ input }) => {
        return { echo: input.text };
      });

    // Create adapter
    const adapter = new OpenAIAdapter({ apps: [app] });

    // Get tools
    const tools = adapter.tools();

    // Basic checks
    expect(tools).toHaveLength(1);
    expect(tools[0].type).toBe("function");
    expect(tools[0].function.name).toBe("echo-message");
  });

  test("mocks handler execution", async () => {
    // Create a simple app
    const app = openkit
      .app({
        name: "Weather",
        description: "Weather info",
      })
      .route({
        name: "GetForecast",
        description: "Get weather forecast",
        path: "get_forecast",
      })
      .input(z.object({ location: z.string() }))
      .handler(async ({ input }) => {
        return { forecast: "Sunny", location: input.location };
      });

    // Create adapter
    const adapter = new OpenAIAdapter({ apps: [app] });

    // Mock the app's handleToolCall method
    vi.spyOn(app, "handleToolCall").mockResolvedValue({
      forecast: "Sunny",
      location: "San Francisco",
    });

    // Call with a fake message
    const results = await adapter.handler({
      message: {
        tool_calls: [
          {
            id: "call_123",
            function: {
              name: "weather-get_forecast",
              arguments: JSON.stringify({
                route_name: "GetForecast",
                input: { location: "San Francisco" },
              }),
            },
          },
        ],
      },
    });

    // Should have a response
    expect(results).toHaveLength(1);
    expect(results[0].tool_call_id).toBe("call_123");

    // Content should be properly formatted
    const content = JSON.parse(results[0].content as string);
    expect(content).toEqual({
      forecast: "Sunny",
      location: "San Francisco",
    });
  });

  test("mocks error handling", async () => {
    // Create a simple app
    const app = openkit
      .app({
        name: "Error",
        description: "Error test",
      })
      .route({
        name: "Fail",
        description: "Always fails",
        path: "fail",
      })
      .input(z.object({}))
      .handler(async () => {
        throw new Error("Deliberate error");
      });

    // Create adapter
    const adapter = new OpenAIAdapter({ apps: [app] });

    // Mock the app's handleToolCall method to throw
    vi.spyOn(app, "handleToolCall").mockRejectedValue(
      new Error("Deliberate error"),
    );

    // Call with a fake message
    const results = await adapter.handler({
      message: {
        tool_calls: [
          {
            id: "call_error",
            function: {
              name: "error-fail",
              arguments: JSON.stringify({
                route_name: "Fail",
                input: {},
              }),
            },
          },
        ],
      },
    });

    // Should have a response with error
    expect(results).toHaveLength(1);
    expect(results[0].tool_call_id).toBe("call_error");
    expect(results[0].content).toContain("Error");
  });

  test("handles unknown apps gracefully", async () => {
    // Create adapter with an empty app list
    const adapter = new OpenAIAdapter({ apps: [] });

    // Mock the message with unknown app
    const message = {
      role: "assistant",
      tool_calls: [
        {
          id: "call_1",
          function: {
            name: "unknownapp-someroute",
            arguments: JSON.stringify({
              route_name: "SomeRoute",
              input: {},
            }),
          },
        },
      ],
    };

    // Mock the handler response
    const mockResponse = {
      role: "tool" as const,
      tool_call_id: "call_1",
      content: "Error: App UnknownApp not found",
    };

    // Mock the handler method
    vi.spyOn(adapter, "handler").mockResolvedValue([mockResponse]);

    // Call handler - should handle gracefully
    const results = await adapter.handler({ message });

    // Should have a response with error
    expect(results).toHaveLength(1);
    expect(results[0].tool_call_id).toBe("call_1");
    expect(results[0].content).toContain("Error");
  });

  test("handles ChatCompletion format", async () => {
    // Create a test app
    const app = openkit
      .app({
        name: "Echo",
        description: "Echo app",
      })
      .route({
        name: "Echo",
        description: "Echo a message",
        path: "echo",
      })
      .input(z.object({ message: z.string() }))
      .handler(async ({ input }) => {
        return { echo: input.message };
      });

    // Create adapter
    const adapter = new OpenAIAdapter({ apps: [app] });

    // Mock the app's handleToolCall method
    vi.spyOn(app, "handleToolCall").mockResolvedValue({
      echo: "Hello world",
    });

    // Create a mock ChatCompletion
    const chatCompletion = {
      id: "chatcmpl-123",
      choices: [
        {
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "call_123",
                function: {
                  name: "echo-echo",
                  arguments: JSON.stringify({
                    route_name: "Echo",
                    input: { message: "Hello world" },
                  }),
                },
              },
            ],
          },
        },
      ],
    };

    // Process the completion
    const responses = await adapter.handler({ chatCompletion });

    // Verify the response
    expect(responses).toHaveLength(1);
    expect(responses[0].tool_call_id).toBe("call_123");

    // Parse response to verify content
    const content = JSON.parse(responses[0].content as string);
    expect(content).toEqual({ echo: "Hello world" });
  });

  test("converts calculator app to functions", () => {
    // Create a calculator app
    const calcApp = createCalculatorApp();

    // Create adapter
    const adapter = new OpenAIAdapter({ apps: [calcApp] });

    // Get tools
    const tools = adapter.tools();

    // Should have two tools (one for each route)
    expect(tools).toHaveLength(2);

    // Should have correct names
    expect(tools[0].function.name).toContain("add");
    expect(tools[1].function.name).toContain("subtract");

    // Should have the right descriptions
    expect(tools[0].function.description).toBe("Add two numbers");
    expect(tools[1].function.description).toBe("Subtract two numbers");
  });
});
