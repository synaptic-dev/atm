import { describe, test, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { openkit, OpenAIFunctionDefinition } from "../src";

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

  test("converts tools to OpenAI function definitions", async () => {
    // Create a simple tool
    const weatherTool = openkit
      .tool({
        name: "Weather",
        description: "Get weather information",
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
    const toolkit = openkit.openai({
      tools: [weatherTool],
    });

    // Get OpenAI functions
    const functions =
      weatherTool.getOpenAIFunctions() as OpenAIFunctionDefinition[];

    // Expectations
    expect(functions).toHaveLength(1);
    expect(functions[0].type).toBe("function");
    expect(functions[0].function.name).toBe("weather-weather");
    expect(functions[0].function.description).toBe("Get weather information");

    // Check the parameters
    const parameters = functions[0].function.parameters;
    expect(parameters.type).toBe("object");
    expect(parameters.properties).toHaveProperty("location");
    expect(parameters.properties).toHaveProperty("unit");
    expect(parameters.properties.location.description).toBe(
      "The city and state, e.g. San Francisco, CA",
    );
  });

  test("converts multi-capability tools to OpenAI function definitions", async () => {
    // Create a multi-capability tool
    const emailTool = openkit
      .tool({
        name: "Email",
        description: "Email client",
      })
      .capability({
        name: "Send",
        description: "Send an email",
      })
      .input(
        z.object({
          to: z.string().email().describe("Recipient email address"),
          subject: z.string(),
          body: z.string(),
        }),
      )
      .handler(async ({ input }) => ({ sent: true }))
      .capability({
        name: "Read",
        description: "Read emails",
      })
      .input(
        z.object({
          folder: z.string().default("inbox"),
        }),
      )
      .handler(async ({ input }) => ({ emails: [] }));

    // Create an OpenAI adapter
    const toolkit = openkit.openai({
      tools: [emailTool],
    });

    // Get OpenAI functions
    const functions =
      emailTool.getOpenAIFunctions() as OpenAIFunctionDefinition[];

    // Expectations
    expect(functions).toHaveLength(2);

    // First function (Send)
    expect(functions[0].function.name).toBe("email-send");
    expect(functions[0].function.description).toBe("Send an email");
    expect(functions[0].function.parameters.properties).toHaveProperty("to");
    expect(functions[0].function.parameters.properties).toHaveProperty(
      "subject",
    );
    expect(functions[0].function.parameters.properties).toHaveProperty("body");

    // Second function (Read)
    expect(functions[1].function.name).toBe("email-read");
    expect(functions[1].function.description).toBe("Read emails");
    expect(functions[1].function.parameters.properties).toHaveProperty(
      "folder",
    );
  });

  test("processes OpenAI tool calls", async () => {
    // Mock implementations instead of spies to avoid timing issues
    let weatherArgs = null;
    let calculatorArgs = null;

    // Create tools
    const weatherTool = openkit
      .tool({
        name: "Weather",
        description: "Get weather information",
      })
      .input(
        z.object({
          location: z.string(),
        }),
      )
      .handler(async ({ input }) => {
        weatherArgs = input;
        return {
          temperature: 72,
          conditions: "sunny",
          location: input.location,
        };
      });

    const calculatorTool = openkit
      .tool({
        name: "Calculator",
        description: "Perform calculations",
      })
      .input(
        z.object({
          a: z.number(),
          b: z.number(),
        }),
      )
      .handler(async ({ input }) => {
        calculatorArgs = input;
        return { result: input.a + input.b };
      });

    // Create adapter with both tools
    const toolkit = openkit.openai({
      tools: [weatherTool, calculatorTool],
    });

    // Create a mock message with tool calls
    const mockMessage: MockOpenAIMessage = {
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: "call_1",
          function: {
            name: "weather-weather",
            arguments: JSON.stringify({ location: "San Francisco" }),
          },
        },
        {
          id: "call_2",
          function: {
            name: "calculator-calculator",
            arguments: JSON.stringify({ a: 5, b: 3 }),
          },
        },
      ],
    };

    // Process the tool calls
    const responses = await toolkit.handler({ message: mockMessage });

    // Verify handler arguments
    expect(weatherArgs).toEqual({ location: "San Francisco" });
    expect(calculatorArgs).toEqual({ a: 5, b: 3 });

    // Verify the responses format
    expect(responses).toHaveLength(2);

    expect(responses[0].role).toBe("tool");
    expect(responses[0].tool_call_id).toBe("call_1");

    // Handle double-stringified JSON
    // First parse converts the string to another string, second parse gets the actual object
    const weatherResponseString = JSON.parse(responses[0].content as string);
    const weatherResponse = JSON.parse(weatherResponseString);
    expect(weatherResponse).toEqual({
      temperature: 72,
      conditions: "sunny",
      location: "San Francisco",
    });

    expect(responses[1].role).toBe("tool");
    expect(responses[1].tool_call_id).toBe("call_2");

    // Handle double-stringified JSON
    const calculatorResponseString = JSON.parse(responses[1].content as string);
    const calculatorResponse = JSON.parse(calculatorResponseString);
    expect(calculatorResponse).toEqual({
      result: 8,
    });
  });

  test("processes a ChatCompletion object", async () => {
    // Create a tool
    const echoTool = openkit
      .tool({
        name: "Echo",
        description: "Echo back input",
      })
      .input(
        z.object({
          message: z.string(),
        }),
      )
      .handler(async ({ input }) => {
        return { echo: input.message };
      });

    // Create adapter
    const toolkit = openkit.openai({
      tools: [echoTool],
    });

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
                  arguments: JSON.stringify({ message: "Hello world" }),
                },
              },
            ],
          },
        },
      ],
    };

    // Process the completion
    const responses = await toolkit.handler({ chatCompletion: mockCompletion });

    // Verify the response
    expect(responses).toHaveLength(1);
    expect(responses[0].role).toBe("tool");
    expect(responses[0].tool_call_id).toBe("call_123");

    // Handle double-stringified JSON
    const echoResponseString = JSON.parse(responses[0].content as string);
    const echoResponse = JSON.parse(echoResponseString);
    expect(echoResponse).toEqual({ echo: "Hello world" });
  });

  test("handles errors in tool execution", async () => {
    // Create a tool that throws
    const errorTool = openkit
      .tool({
        name: "Error",
        description: "Always throws an error",
      })
      .input(z.object({}))
      .handler(async () => {
        throw new Error("Deliberate error");
      });

    // Create adapter
    const toolkit = openkit.openai({
      tools: [errorTool],
    });

    // Create a mock message with tool calls
    const mockMessage: MockOpenAIMessage = {
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: "call_error",
          function: {
            name: "error-error",
            arguments: "{}",
          },
        },
      ],
    };

    // Process the tool calls
    const responses = await toolkit.handler({ message: mockMessage });

    // Verify the error is properly formatted
    expect(responses).toHaveLength(1);
    expect(responses[0].role).toBe("tool");
    expect(responses[0].tool_call_id).toBe("call_error");
    expect(responses[0].content).toContain("Error: Deliberate error");
  });
});
