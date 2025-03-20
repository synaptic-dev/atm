import { describe, test, expect, vi } from "vitest";
import { z } from "zod";
import openkit from "../src";
import {
  Context,
  MiddlewareFunction,
  TypedContext,
} from "../src/builders/types";

describe("LLM Response Formatting", () => {
  test("formats successful app responses as strings", async () => {
    // Create a weather app with LLM formatting
    const weatherApp = openkit
      .app({
        name: "Weather",
        description: "Get weather information",
      })
      .route({
        name: "Forecast",
        description: "Get weather forecast",
        path: "forecast",
      })
      .output(
        z.object({
          location: z.string().describe("Location for forecast"),
          forecast: z.string().describe("Forecast for the location"),
          temperature: z.number().describe("Temperature in Fahrenheit"),
          humidity: z.string().describe("Humidity percentage"),
        }),
      )
      .input(
        z.object({
          days: z.number().optional().describe("Number of days to forecast"),
        }),
      )
      .handler(async ({ input }) => {
        return {
          location: "San Francisco",
          forecast: "Sunny",
          temperature: 72,
          humidity: "45%",
        };
      })
      .llm({
        success: (result) => {
          return `Weather in ${result.location}: ${result.forecast}, ${result.temperature}°F, humidity: ${result.humidity}`;
        },
      });

    // Get formatted result
    const result = await weatherApp.run("Forecast").handler({
      input: {
        location: "San Francisco",
        days: 1,
      },
    });

    // Without LLM formatting, we'd just get the raw object
    // With LLM formatting, we get a nicely formatted string
    expect(typeof result).toBe("string");
    expect(result).toBe("Weather in San Francisco: Sunny, 72°F, humidity: 45%");
  });

  test("automatically stringifies object responses", async () => {
    // Define result type
    type SumResult = { sum: number; average: number; count: number };
    type FormattedResult = { summary: string; total: number; average: number };

    // Create an app returning an object from LLM formatter
    const dataApp = openkit
      .app({
        name: "Data",
        description: "Process data",
      })
      .route({
        name: "Process",
        description: "Process data",
        path: "process",
      })
      .input(
        z.object({
          array: z.array(z.number()),
        }),
      )
      .output(
        z.object({
          sum: z.number(),
          count: z.number(),
          average: z.number(),
        }),
      )
      .handler(async ({ input }) => {
        const sum = input.array.reduce((a, b) => a + b, 0);
        const avg = sum / input.array.length;
        return { sum, average: avg, count: input.array.length };
      })
      .llm({
        success: (result) => {
          // Return an object instead of a string
          return {
            summary: `Processed ${result.count} values.`,
            total: result.sum,
            average: result.average,
          };
        },
      });

    // Get formatted result
    const result = await dataApp.run("Process").handler({
      input: {
        array: [1, 2, 3, 4, 5],
      },
    });

    // Should be automatically converted to JSON string
    expect(typeof result).toBe("object");

    // Check the content directly
    expect(result).toEqual({
      summary: "Processed 5 values.",
      total: 15,
      average: 3,
    });
  });

  test("formats errors as strings", async () => {
    // Create an app that throws an error
    const errorApp = openkit
      .app({
        name: "Error",
        description: "Always fails",
      })
      .route({
        name: "Fail",
        description: "Always fails",
        path: "fail",
      })
      .input(z.object({}))
      .handler(async () => {
        throw new Error("Test error message");
      })
      .llm({
        error: (error) => {
          return `Custom error format: ${error.message}`;
        },
      });

    // Get formatted error
    const result = await errorApp.run("Fail").handler({
      input: {},
    });

    // Should be the formatted error string
    expect(typeof result).toBe("string");
    expect(result).toBe("Custom error format: Test error message");
  });

  test("handles validation errors with LLM formatting", async () => {
    // Create an app with validation and LLM formatting
    const validatedApp = openkit
      .app({
        name: "Validated",
        description: "App with validation",
      })
      .route({
        name: "Register",
        description: "Register a user",
        path: "register",
      })
      .input(
        z.object({
          username: z.string().min(3),
          email: z.string().email(),
          age: z.number().min(18),
        }),
      )
      .handler(async ({ input }) => {
        return { registered: true, username: input.username };
      });

    try {
      // Try to execute with invalid data - this should throw
      await validatedApp.run("Register").handler({
        input: {
          username: "ab", // Too short
          email: "invalid-email",
          age: 16, // Too young
        },
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      // Validation errors should be caught
      expect(error instanceof Error).toBe(true);
      expect(error.message).toContain("Invalid input");
      expect(error.message).toContain("username");
      expect(error.message).toContain("email");
    }
  });

  test("integrates with middleware in execution chain", async () => {
    // Define the correct context type
    interface LogContext {
      logs: string[];
    }
    type ProcessResult = { processed: boolean; value: string; logs: string[] };

    // Define properly typed middleware
    const loggerMiddleware: MiddlewareFunction<LogContext> = async (
      context,
      next,
    ) => {
      // Initialize logs array
      const typedContext = context as TypedContext<LogContext>;
      typedContext.logs = [];
      typedContext.logs.push("Request started");
      const result = await next();
      typedContext.logs.push("Request completed");
      return result;
    };

    // Create an app with middleware and LLM formatting
    const appWithMiddleware = openkit
      .app({
        name: "WithMiddleware",
        description: "App with middleware",
      })
      .route({
        name: "Process",
        description: "Process with middleware",
        path: "process",
      })
      .use(loggerMiddleware)
      .input(z.object({ value: z.string() }))
      .handler(async ({ input, context }) => {
        const typedContext = context as TypedContext<LogContext>;
        typedContext.logs.push(`Processing: ${input.value}`);
        return {
          processed: true,
          value: input.value.toUpperCase(),
          logs: typedContext.logs,
        };
      })
      .llm<ProcessResult>({
        success: (result) => {
          return `Processed: ${result.value} (${result.logs.length} log entries)`;
        },
      });

    // Execute app
    const result = await appWithMiddleware.run("Process").handler({
      input: { value: "test" },
    });

    // Verify middleware was called
    expect(loggerMiddleware).toHaveBeenCalled();

    // Verify result was formatted
    expect(typeof result).toBe("string");
    expect(result).toBe("Processed: TEST (3 log entries)");
  });

  test("works with multi-route apps", async () => {
    // Define result types
    interface TextResult {
      result: string;
    }

    // Create a multi-route app
    const app = openkit.app({
      name: "MultiApp",
      description: "App with multiple routes",
    });

    // Route 1
    app
      .route({
        name: "UpperCase",
        description: "Convert to uppercase",
        path: "upper_case",
      })
      .input(z.object({ text: z.string() }))
      .handler(async ({ input }) => {
        return { result: input.text.toUpperCase() };
      })
      .llm<TextResult>({
        success: (result) => `Uppercase: "${result.result}"`,
      });

    // Route 2
    app
      .route({
        name: "LowerCase",
        description: "Convert to lowercase",
        path: "lower_case",
      })
      .input(z.object({ text: z.string() }))
      .handler(async ({ input }) => {
        return { result: input.text.toLowerCase() };
      })
      .llm<TextResult>({
        success: (result) => `Lowercase: "${result.result}"`,
      });

    // Test first route
    const upperResult = await app.run("UpperCase").handler({
      input: { text: "Hello World" },
    });
    expect(upperResult).toBe('Uppercase: "HELLO WORLD"');

    // Test second route
    const lowerResult = await app.run("LowerCase").handler({
      input: { text: "Hello World" },
    });
    expect(lowerResult).toBe('Lowercase: "hello world"');
  });

  test("formats errors with objects", async () => {
    // Define error response type
    interface ErrorResponse {
      status: string;
      message: string;
      code: number;
    }

    // Create an app that uses object formatting for errors
    const errorApp = openkit
      .app({
        name: "ErrorObject",
        description: "Formats errors as objects",
      })
      .route({
        name: "Fail",
        description: "Always fails with a formatted object",
        path: "fail",
      })
      .input(z.object({}))
      .handler(async () => {
        throw new Error("Something went wrong");
      })
      .llm({
        error: (error) =>
          ({
            status: "error",
            message: error.message,
            code: 500,
          }) as ErrorResponse,
      });

    // Get formatted error
    const result = await errorApp.run("Fail").handler({
      input: {},
    });

    // Should be the formatted error object
    expect(typeof result).toBe("object");
    expect(result).toEqual({
      status: "error",
      message: "Something went wrong",
      code: 500,
    });
  });

  test("uses default formatter if none provided", async () => {
    // Create an app without explicit LLM formatter
    const simpleApp = openkit
      .app({
        name: "Simple",
        description: "Simple app with default formatter",
      })
      .route({
        name: "Echo",
        description: "Echoes back input",
        path: "echo",
      })
      .input(z.object({ value: z.string() }))
      .handler(async ({ input }) => {
        return { value: input.value };
      });

    // Get result using default formatter
    const result = await simpleApp.run("Echo").handler({
      input: { value: "test" },
    });

    // Default formatter should return the original object
    expect(result).toEqual({ value: "test" });
  });

  test("default formatter handles errors correctly", async () => {
    // Define error response type
    interface DefaultErrorResponse {
      error: string;
      details: string | undefined;
    }

    // Create an app that throws an error
    const errorApp = openkit
      .app({
        name: "ErrorDefault",
        description: "Tests default error formatter",
      })
      .route({
        name: "Fail",
        description: "Always fails with default error formatting",
        path: "fail",
      })
      .input(z.object({}))
      .handler(async () => {
        throw new Error("Default error handling test");
      });

    // Get formatted error with default formatter
    const result = await errorApp.run("Fail").handler({
      input: {},
    });

    // Default formatter should return an error object
    expect(typeof result).toBe("object");
    expect(result).toHaveProperty("error");
    const errorResult = result as DefaultErrorResponse;
    expect(errorResult.error).toBe("Default error handling test");
    expect(result).toHaveProperty("details");
  });
});
