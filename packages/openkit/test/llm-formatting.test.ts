import { describe, test, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { openkit } from "../src";

describe("LLM Response Formatting", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test("formats successful tool responses as strings", async () => {
    // Create a weather tool with LLM formatting
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
        return {
          temperature: 72,
          conditions: "sunny",
          location: input.location,
        };
      })
      .llm({
        success: (result) =>
          `The weather in ${result.location} is ${result.temperature}°F and ${result.conditions}.`,
      });

    // Execute the tool
    const result = await weatherTool.run().handler({
      input: { location: "San Francisco" },
    });

    // Should return a formatted string
    expect(typeof result).toBe("string");
    expect(result).toBe("The weather in San Francisco is 72°F and sunny.");
  });

  test("automatically stringifies object responses", async () => {
    // Create a tool returning an object from LLM formatter
    const dataTool = openkit
      .tool({
        name: "Data",
        description: "Process data",
      })
      .input(z.object({}))
      .handler(async () => ({ value: 42 }))
      .llm({
        success: (result) => ({
          status: "SUCCESS",
          data: result,
          timestamp: "2023-01-01T00:00:00Z", // Fixed timestamp for testing
        }),
      });

    // Execute the tool
    const result = await dataTool.run().handler({
      input: {},
    });

    // Should be a JSON string of the object
    expect(typeof result).toBe("string");
    expect(JSON.parse(result)).toEqual({
      status: "SUCCESS",
      data: { value: 42 },
      timestamp: "2023-01-01T00:00:00Z",
    });
  });

  test("formats errors as strings", async () => {
    // Create a tool that throws an error
    const errorTool = openkit
      .tool({
        name: "Error",
        description: "Always fails",
      })
      .input(z.object({}))
      .handler(async () => {
        throw new Error("Something went wrong");
      })
      .llm({
        error: (error) => `Failed to complete the operation: ${error.message}`,
      });

    // Execute the tool
    const result = await errorTool.run().handler({
      input: {},
    });

    // Should be a formatted error string
    expect(typeof result).toBe("string");
    expect(result).toBe(
      "Failed to complete the operation: Something went wrong",
    );
  });

  test("handles validation errors with LLM formatting", async () => {
    // Create a tool with validation and LLM formatting
    const validatedTool = openkit
      .tool({
        name: "Validated",
        description: "Tool with validation",
      })
      .input(
        z.object({
          email: z.string().email(),
        }),
      )
      .handler(async ({ input }) => input)
      .llm({
        error: (error) => `I couldn't process your input: ${error.message}`,
      });

    // Execute with invalid input
    const result = await validatedTool.run().handler({
      input: { email: "not-an-email" },
    });

    // Should contain a friendly error message
    expect(typeof result).toBe("string");
    expect(result).toContain("I couldn't process your input");
    expect(result).toContain("email");
  });

  test("integrates with middleware in execution chain", async () => {
    // Create middleware that adds context
    const authMiddleware = vi.fn(async (ctx, next) => {
      ctx.user = { id: "123", name: "Test User" };
      return next();
    });

    // Create a tool with middleware and LLM formatting
    const toolWithMiddleware = openkit
      .tool({
        name: "WithMiddleware",
        description: "Tool with middleware",
      })
      .use(authMiddleware)
      .input(z.object({}))
      .handler(async ({ context }) => ({ user: context.user }))
      .llm({
        success: (result, _, context) =>
          `Hello ${context.user.name}! Your request was processed successfully.`,
      });

    // Execute the tool
    const result = await toolWithMiddleware.run().handler({
      input: {},
      context: {},
    });

    // Middleware should have been called
    expect(authMiddleware).toHaveBeenCalled();

    // Result should include context from middleware
    expect(typeof result).toBe("string");
    expect(result).toBe(
      "Hello Test User! Your request was processed successfully.",
    );
  });

  test("works with multi-capability tools", async () => {
    // Create a multi-capability tool
    const multiTool = openkit.tool({
      name: "MultiTool",
      description: "Tool with multiple capabilities",
    });

    // Add first capability
    const firstCap = multiTool.capability({
      name: "First",
      description: "First capability",
    });

    firstCap.input(z.object({})).handler(async () => ({ first: true }));

    // Add second capability
    const secondCap = multiTool.capability({
      name: "Second",
      description: "Second capability",
    });

    secondCap.input(z.object({})).handler(async () => ({ second: true }));

    // Apply LLM formatting to each capability directly
    firstCap.llm({
      success: () => "This is the first capability",
    });

    secondCap.llm({
      success: () => "This is the second capability",
    });

    // Execute both capabilities
    const result1 = await multiTool.run("First").handler({
      input: {},
    });
    const result2 = await multiTool.run("Second").handler({
      input: {},
    });

    // Should return the correctly formatted strings for each capability
    expect(result1).toBe("This is the first capability");
    expect(result2).toBe("This is the second capability");
  });

  test("allows passing input to the formatter", async () => {
    // Create a tool that uses input in formatting
    const echoTool = openkit
      .tool({
        name: "Echo",
        description: "Echo input",
      })
      .input(
        z.object({
          message: z.string(),
        }),
      )
      .handler(async ({ input }) => ({ echoed: input.message }))
      .llm({
        success: (result, input) =>
          `You said: "${input.message}" and I processed it to: "${result.echoed}"`,
      });

    // Execute the tool
    const result = await echoTool.run().handler({
      input: { message: "Hello world" },
    });

    // Should format with the input values
    expect(result).toBe(
      'You said: "Hello world" and I processed it to: "Hello world"',
    );
  });
});
