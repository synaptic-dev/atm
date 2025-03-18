import { describe, test, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { openkit } from "../src";

describe("Single Capability Tool", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test("creates a tool with input validation", async () => {
    // Create a single-capability tool
    const greetingTool = openkit
      .tool({
        name: "Greeting",
        description: "A simple greeting tool",
      })
      .input(
        z.object({
          name: z.string().min(1),
        }),
      )
      .handler(async ({ input }) => {
        return {
          message: `Hello, ${input.name}!`,
        };
      })
      .llm({
        success: (result) => result,
        error: (error) => error.message,
      });

    // Test successful validation and execution
    const result = await greetingTool.run().handler({
      input: { name: "World" },
    });

    // Parse the JSON string result
    const parsedResult =
      typeof result === "string" ? JSON.parse(result) : result;

    expect(parsedResult).toEqual({
      message: "Hello, World!",
    });
  });

  test("handles input validation errors", async () => {
    // Create a tool with validation
    const validatedTool = openkit
      .tool({
        name: "Validated",
        description: "A tool with strict validation",
      })
      .input(
        z.object({
          email: z.string().email(),
          age: z.number().int().positive(),
        }),
      )
      .handler(async ({ input }) => {
        return { success: true, input };
      })
      .llm({
        // Just pass through errors for testing
        error: (err) => err.message,
      });

    // Should return validation error as a string
    const errorResult = await validatedTool.run().handler({
      input: {
        email: "not-an-email",
        age: -5,
      },
    });

    expect(typeof errorResult).toBe("string");
    expect(errorResult).toContain("Invalid input");
    expect(errorResult).toContain("Validated");

    // Should pass with valid input
    const result = await validatedTool.run().handler({
      input: {
        email: "test@example.com",
        age: 25,
      },
    });

    // Parse the JSON string result
    const parsedResult =
      typeof result === "string" ? JSON.parse(result) : result;

    expect(parsedResult).toEqual({
      success: true,
      input: { email: "test@example.com", age: 25 },
    });
  });

  test("supports output validation", async () => {
    // Create a tool with output validation
    const outputValidatedTool = openkit
      .tool({
        name: "OutputValidated",
        description: "A tool with output validation",
      })
      .input(
        z.object({
          query: z.string(),
        }),
      )
      .output(
        z.object({
          result: z.string(),
          timestamp: z.string().datetime(),
        }),
      )
      .handler(async ({ input }) => {
        return {
          result: input.query.toUpperCase(),
          timestamp: new Date().toISOString(),
        };
      })
      .llm({
        success: (result) => result,
      });

    // Test successful output validation
    const result = await outputValidatedTool.run().handler({
      input: { query: "test" },
    });

    // Parse the JSON string result
    const parsedResult =
      typeof result === "string" ? JSON.parse(result) : result;

    expect(parsedResult.result).toEqual("TEST");
    expect(parsedResult.timestamp).toBeDefined();

    // Confirm it's a valid ISO string
    expect(() => new Date(parsedResult.timestamp)).not.toThrow();
  });

  test("handles middleware in execution chain", async () => {
    const authSpy = vi.fn(async (ctx, next) => {
      ctx.user = { id: "123", authenticated: true };
      return next();
    });

    const loggingSpy = vi.fn(async (ctx, next) => {
      ctx.logged = true;
      const result = await next();
      return result;
    });

    // Create a tool with middleware
    const toolWithMiddleware = openkit
      .tool({
        name: "WithMiddleware",
        description: "A tool with middleware",
      })
      .use(authSpy)
      .use(loggingSpy)
      .input(
        z.object({
          data: z.string(),
        }),
      )
      .handler(async ({ input, context }) => {
        // Handler should have access to context from middleware
        return {
          data: input.data,
          user: context.user,
          logged: context.logged,
        };
      })
      .llm({
        success: (result) => result,
      });

    // Execute the tool
    const result = await toolWithMiddleware.run().handler({
      input: { data: "test-data" },
    });

    // Verify middleware was called
    expect(authSpy).toHaveBeenCalled();
    expect(loggingSpy).toHaveBeenCalled();

    // Parse the JSON string result
    const parsedResult =
      typeof result === "string" ? JSON.parse(result) : result;

    // Verify context was passed through middleware to handler
    expect(parsedResult).toEqual({
      data: "test-data",
      user: { id: "123", authenticated: true },
      logged: true,
    });
  });

  test("middleware can short-circuit execution", async () => {
    const blockingSpy = vi.fn(async (ctx, next) => {
      if (!ctx.apiKey) {
        throw new Error("API key required");
      }
      return next();
    });

    // Create a tool with blocking middleware
    const securedTool = openkit
      .tool({
        name: "Secured",
        description: "A tool that requires authentication",
      })
      .use(blockingSpy)
      .input(z.object({ query: z.string() }))
      .handler(async ({ input }) => {
        return { result: input.query };
      })
      .llm({
        error: (err) => err.message,
        success: (result) => result,
      });

    // Should return error message as string
    const errorResult = await securedTool.run().handler({
      input: { query: "test" },
    });

    expect(typeof errorResult).toBe("string");
    expect(errorResult).toBe("API key required");

    // Should succeed with API key
    const result = await securedTool.run().handler({
      input: { query: "test" },
      context: { apiKey: "valid-key" },
    });

    // Parse the JSON string result
    const parsedResult =
      typeof result === "string" ? JSON.parse(result) : result;

    expect(parsedResult).toEqual({ result: "test" });
    expect(blockingSpy).toHaveBeenCalledTimes(2);
  });

  test("handler receives the validated input", async () => {
    const handlerSpy = vi.fn(async ({ input }) => {
      return { received: input };
    });

    // Create a tool with a spy handler
    const tool = openkit
      .tool({
        name: "InputTest",
        description: "Tests input handling",
      })
      .input(
        z.object({
          value: z.number().default(42),
          optional: z.string().optional(),
        }),
      )
      .handler(handlerSpy)
      .llm({
        success: (result) => result,
      });

    // Test with minimal input
    await tool.run().handler({
      input: {},
    });

    // Verify default values are applied
    expect(handlerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { value: 42 },
      }),
    );

    // Test with full input
    await tool.run().handler({
      input: { value: 100, optional: "test" },
    });

    expect(handlerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { value: 100, optional: "test" },
      }),
    );
  });
});
