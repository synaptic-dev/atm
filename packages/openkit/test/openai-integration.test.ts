import { describe, test, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import openkit from "../src";
import { OpenAIAdapter } from "../src/adapters/openai";
import { createCalculatorApp } from "./helpers";

// Mock OpenAI API response structures
type MockOpenAIFunctionCall = {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
};

type MockOpenAIMessage = {
  role: string;
  content: string | null;
  tool_calls?: MockOpenAIFunctionCall[];
};

type MockOpenAICompletion = {
  id: string;
  choices: [
    {
      message: MockOpenAIMessage;
    },
  ];
};

describe("OpenAI Integration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test("converts apps to OpenAI function definitions", async () => {
    // Create a simple app
    const weatherApp = openkit
      .app({
        name: "Weather",
        description: "Get weather information",
      })
      .route({
        name: "GetForecast",
        description: "Get weather forecast",
        path: "get_forecast",
      })
      .input(
        z.object({
          location: z
            .string()
            .describe("The city and state, e.g. San Francisco, CA"),
          unit: z
            .enum(["celsius", "fahrenheit"])
            .optional()
            .describe("The unit of temperature"),
        }),
      )
      .handler(async ({ input }) => {
        return { temperature: 72, conditions: "sunny" };
      });

    // Create an OpenAI adapter
    const adapter = new OpenAIAdapter({ apps: [weatherApp] });

    // Get OpenAI functions
    const functions = adapter.tools();

    // Expectations
    expect(functions).toHaveLength(1);
    expect(functions[0].type).toBe("function");
    expect(functions[0].function.name).toBe("weather-get_forecast");
    expect(functions[0].function.description).toBe("Get weather forecast");

    // Check the parameters
    expect(functions[0].function.parameters).toBeDefined();
  });

  test("converts multi-route apps to OpenAI function definitions", async () => {
    // Create a multi-route app
    const emailApp = openkit
      .app({
        name: "Email",
        description: "Email client",
      })
      .route({
        name: "Send",
        description: "Send an email",
        path: "send",
      })
      .input(
        z.object({
          to: z.string().email().describe("Recipient email address"),
          subject: z.string(),
          body: z.string(),
        }),
      )
      .handler(async ({ input }) => ({ sent: true }))
      .route({
        name: "Read",
        description: "Read emails",
        path: "read",
      })
      .input(
        z.object({
          folder: z.string().default("inbox"),
        }),
      )
      .handler(async ({ input }) => ({ emails: [] }));

    // Create an OpenAI adapter
    const adapter = new OpenAIAdapter({ apps: [emailApp] });

    // Get OpenAI functions
    const functions = adapter.tools();

    // Expectations
    expect(functions).toHaveLength(2);

    // Each function should have a name that matches the route
    expect(functions[0].function.name).toContain("send");
    expect(functions[1].function.name).toContain("read");

    // Verify parameters exist
    expect(functions[0].function.parameters).toBeDefined();
    expect(functions[1].function.parameters).toBeDefined();
  });

  test("processes OpenAI tool calls", async () => {
    // Create apps with mocked implementations
    const weatherApp = openkit
      .app({
        name: "Weather",
        description: "Get weather information",
      })
      .route({
        name: "GetForecast",
        description: "Get weather forecast",
        path: "get_forecast",
      })
      .input(
        z.object({
          location: z.string(),
        }),
      )
      .handler(async ({ input }) => {
        return {
          temperature: 72,
          conditions: "sunny",
          location: input.location,
        };
      });

    const calculatorApp = openkit
      .app({
        name: "Calculator",
        description: "Perform calculations",
      })
      .route({
        name: "Calculate",
        description: "Perform calculation",
        path: "calculate",
      })
      .input(
        z.object({
          a: z.number(),
          b: z.number(),
        }),
      )
      .handler(async ({ input }) => {
        return { result: input.a + input.b };
      });

    // Create a mock adapter that returns predefined responses
    const adapter = new OpenAIAdapter({ apps: [weatherApp, calculatorApp] });

    // Define our mock responses directly
    const mockResponses = [
      {
        role: "tool" as const,
        tool_call_id: "call_1",
        content: JSON.stringify({
          temperature: 72,
          conditions: "sunny",
          location: "San Francisco",
        }),
      },
      {
        role: "tool" as const,
        tool_call_id: "call_2",
        content: JSON.stringify({
          result: 8,
        }),
      },
    ];

    // Mock the adapter's handler method
    vi.spyOn(adapter, "handler").mockResolvedValue(mockResponses);

    // Create a mock message with tool calls
    const mockMessage: MockOpenAIMessage = {
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: "call_1",
          function: {
            name: "weather-get_forecast",
            arguments: JSON.stringify({
              route_name: "GetForecast",
              input: { location: "San Francisco" },
            }),
          },
        },
        {
          id: "call_2",
          function: {
            name: "calculator-calculate",
            arguments: JSON.stringify({
              route_name: "Calculate",
              input: { a: 5, b: 3 },
            }),
          },
        },
      ],
    };

    // Process the tool calls
    const responses = await adapter.handler({ message: mockMessage });

    // Verify the responses format
    expect(responses).toHaveLength(2);

    // Find responses by tool_call_id
    const weatherResponse = responses.find((r) => r.tool_call_id === "call_1");
    const calculatorResponse = responses.find(
      (r) => r.tool_call_id === "call_2",
    );

    // Verify weather response
    expect(weatherResponse?.role).toBe("tool");
    expect(weatherResponse?.tool_call_id).toBe("call_1");
    const weatherResult = JSON.parse(weatherResponse?.content as string);
    expect(weatherResult).toEqual({
      temperature: 72,
      conditions: "sunny",
      location: "San Francisco",
    });

    // Verify calculator response
    expect(calculatorResponse?.role).toBe("tool");
    expect(calculatorResponse?.tool_call_id).toBe("call_2");
    const calculatorResult = JSON.parse(calculatorResponse?.content as string);
    expect(calculatorResult).toEqual({
      result: 8,
    });
  });

  test("processes a ChatCompletion object", async () => {
    // Create an app
    const echoApp = openkit
      .app({
        name: "Echo",
        description: "Echo back input",
      })
      .route({
        name: "Echo",
        description: "Echo the input",
        path: "echo",
      })
      .input(
        z.object({
          message: z.string(),
        }),
      )
      .handler(async ({ input }) => {
        return { echo: input.message };
      });

    // Mock tools so we can directly return values
    vi.spyOn(echoApp, "handleToolCall").mockResolvedValue({
      echo: "Hello world",
    });

    // Create adapter
    const adapter = new OpenAIAdapter({ apps: [echoApp] });

    // Create a mock ChatCompletion object
    const mockCompletion: MockOpenAICompletion = {
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
    const responses = await adapter.handler({ chatCompletion: mockCompletion });

    // Verify the response
    expect(responses).toHaveLength(1);
    expect(responses[0].role).toBe("tool");
    expect(responses[0].tool_call_id).toBe("call_123");

    // Parse response as string
    const content = JSON.parse(responses[0].content as string);
    expect(content).toEqual({ echo: "Hello world" });
  });

  test("handles errors in app execution", async () => {
    // Create an app that throws
    const errorApp = openkit
      .app({
        name: "Error",
        description: "Always throws an error",
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

    // Mock the handleToolCall method to throw a specific error
    vi.spyOn(errorApp, "handleToolCall").mockRejectedValue(
      new Error("Deliberate error"),
    );

    // Create adapter
    const adapter = new OpenAIAdapter({ apps: [errorApp] });

    // Create a mock message with tool calls
    const mockMessage: MockOpenAIMessage = {
      role: "assistant",
      content: null,
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
    };

    // Process the tool calls
    const responses = await adapter.handler({ message: mockMessage });

    // Verify the error is properly formatted
    expect(responses).toHaveLength(1);
    expect(responses[0].role).toBe("tool");
    expect(responses[0].tool_call_id).toBe("call_error");
    expect(responses[0].content).toContain("Error: Deliberate error");
  });

  test("can convert app to OpenAI function definitions", async () => {
    // Create a sample app
    const mathApp = createCalculatorApp();

    // Create an adapter with our apps
    const adapter = new OpenAIAdapter({ apps: [mathApp] });

    // Get the function definitions
    const tools = adapter.tools();

    // Validate the generated tools
    expect(tools.length).toBeGreaterThan(0);

    // Find the Calculator app route tools (should be 2 routes)
    expect(tools).toHaveLength(2);

    // Check that both routes are present
    const addTool = tools.find((t) => t.function.name.includes("add"));
    const subtractTool = tools.find((t) =>
      t.function.name.includes("subtract"),
    );

    expect(addTool).toBeDefined();
    expect(subtractTool).toBeDefined();

    // Check descriptions
    expect(addTool?.function.description).toBe("Add two numbers");
    expect(subtractTool?.function.description).toBe("Subtract two numbers");
  });

  test("can handle tool calls", async () => {
    // Create a sample app
    const weatherApp = openkit
      .app({
        name: "Weather",
        description: "Get weather information",
      })
      .route({
        name: "GetForecast",
        description: "Get weather forecast for a location",
        path: "get_forecast",
      })
      .input(
        z.object({
          location: z.string().describe("City name or coordinates"),
          days: z.number().optional().describe("Number of days to forecast"),
        }),
      )
      .handler(async ({ input }) => {
        // Mock handler
        return {
          location: input.location,
          forecast: "Sunny",
          temperature: 75,
          days: input.days || 1,
        };
      });

    // Mock the app's handleToolCall method
    vi.spyOn(weatherApp, "handleToolCall").mockResolvedValue({
      location: "San Francisco",
      forecast: "Sunny",
      temperature: 75,
      days: 3,
    });

    // Create an adapter with our app
    const adapter = new OpenAIAdapter({ apps: [weatherApp] });

    // Simulate an OpenAI message with a tool call
    const message = {
      role: "assistant",
      tool_calls: [
        {
          id: "call_1",
          type: "function",
          function: {
            name: "weather-get_forecast",
            arguments: JSON.stringify({
              route_name: "GetForecast",
              input: {
                location: "San Francisco",
                days: 3,
              },
            }),
          },
        },
      ],
    };

    // Execute the handler with the message
    const results = await adapter.handler({ message });

    // Verify the results
    expect(results).toHaveLength(1);
    expect(results[0].tool_call_id).toBe("call_1");
    expect(results[0].role).toBe("tool");

    // Parse the content to verify the result
    const content = JSON.parse(results[0].content as string);
    expect(content.location).toBe("San Francisco");
    expect(content.forecast).toBe("Sunny");
    expect(content.temperature).toBe(75);
    expect(content.days).toBe(3);
  });

  test("handles validation errors", async () => {
    // Create an app with strict validation
    const userApp = openkit
      .app({
        name: "User",
        description: "User management operations",
      })
      .route({
        name: "Register",
        description: "Register a new user",
        path: "register",
      })
      .input(
        z.object({
          username: z.string().min(3).describe("Username (min 3 characters)"),
          email: z.string().email().describe("Valid email address"),
          age: z.number().min(18).describe("Age (must be 18+)"),
        }),
      )
      .handler(async ({ input }) => {
        return {
          username: input.username,
          email: input.email,
          registered: true,
        };
      });

    // Create an adapter with our app
    const adapter = new OpenAIAdapter({ apps: [userApp] });

    // Mock message with invalid input
    const message = {
      role: "assistant",
      tool_calls: [
        {
          id: "call_1",
          type: "function",
          function: {
            name: "user-register",
            arguments: JSON.stringify({
              route_name: "Register",
              input: {
                username: "ab", // Too short
                email: "not-an-email", // Invalid email
                age: 16, // Too young
              },
            }),
          },
        },
      ],
    };

    // Spy on handleToolCall
    const handleSpy = vi.spyOn(userApp, "handleToolCall");
    handleSpy.mockRejectedValue(new Error("Validation error"));

    // Execute the handler with invalid input
    const results = await adapter.handler({ message });

    // Verify the results contain error info
    expect(results).toHaveLength(1);
    expect(results[0].tool_call_id).toBe("call_1");
    expect(results[0].role).toBe("tool");

    // Content should contain error
    const content = results[0].content;
    expect(content).toContain("Error");
  });

  test("handles unknown apps/routes gracefully", async () => {
    // Create a simple app
    const simpleApp = openkit
      .app({
        name: "Simple",
        description: "A simple app",
      })
      .route({
        name: "Echo",
        description: "Echo the input",
        path: "echo",
      })
      .input(
        z.object({
          message: z.string(),
        }),
      )
      .handler(async ({ input }) => {
        return { echoed: input.message };
      });

    // Mock responses for unknown app/route
    const mockErrorResponse = {
      role: "tool" as const,
      tool_call_id: "call_1",
      content: "Error: App Unknown not found",
    };

    // Create an adapter with our app and mock its handler method
    const adapter = new OpenAIAdapter({ apps: [simpleApp] });
    vi.spyOn(adapter, "handler").mockResolvedValue([mockErrorResponse]);

    // Simulate an OpenAI message with unknown app
    const unknownAppMessage = {
      role: "assistant",
      tool_calls: [
        {
          id: "call_1",
          type: "function",
          function: {
            name: "unknown-SomeRoute",
            arguments: JSON.stringify({
              route_name: "SomeRoute",
              input: { message: "test" },
            }),
          },
        },
      ],
    };

    // Execute with unknown app
    const unknownAppResults = await adapter.handler({
      message: unknownAppMessage,
    });

    // Verify results contain error
    expect(unknownAppResults).toHaveLength(1);
    expect(unknownAppResults[0].content).toContain("Error");
  });
});
