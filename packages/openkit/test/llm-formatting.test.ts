import { describe, test, expect, vi } from "vitest";
import { z } from "zod";
import openkit from "../src";

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
      .input(
        z.object({
          location: z.string().describe("Location for forecast"),
          days: z.number().optional().describe("Number of days to forecast"),
        }),
      )
      .llm({
        success: (result) => {
          return `Weather in ${result.location}: ${result.forecast}, ${result.temperature}°F, humidity: ${result.humidity}`;
        },
      })
      .handler(async ({ input }) => {
        return {
          location: input.location,
          forecast: "Sunny",
          temperature: 72,
          humidity: "45%",
        };
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
      .llm({
        success: (result) => {
          // Return an object instead of a string
          return {
            summary: `Processed ${result.count} values.`,
            total: result.sum,
            average: result.average,
          };
        },
      })
      .handler(async ({ input }) => {
        const sum = input.array.reduce((a, b) => a + b, 0);
        const avg = sum / input.array.length;
        return { sum, average: avg, count: input.array.length };
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
      .llm({
        error: (error) => {
          return `Custom error format: ${error.message}`;
        },
      })
      .handler(async () => {
        throw new Error("Test error message");
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
    const loggerMiddleware = vi.fn(async (context, next) => {
      context.logs = [];
      context.logs.push("Request started");
      const result = await next();
      context.logs.push("Request completed");
      return result;
    });

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
      .llm({
        success: (result) => {
          return `Processed: ${result.value} (${result.logs.length} log entries)`;
        },
      })
      .handler(async ({ input, context }) => {
        context.logs.push(`Processing: ${input.value}`);
        return {
          processed: true,
          value: input.value.toUpperCase(),
          logs: context.logs,
        };
      });

    // Execute app
    const result = await appWithMiddleware.run("Process").handler({
      input: { value: "test" },
    });

    // Verify middleware was called
    expect(loggerMiddleware).toHaveBeenCalled();

    // Verify result was formatted
    expect(typeof result).toBe("string");
    expect(result).toBe("Processed: TEST (2 log entries)");
  });

  test("works with multi-route apps", async () => {
    // Create a multi-route app
    const multiRouteApp = openkit
      .app({
        name: "MultiApp",
        description: "App with multiple routes",
      })
      .route({
        name: "UpperCase",
        description: "Convert to uppercase",
        path: "upper_case",
      })
      .input(z.object({ text: z.string() }))
      .llm({
        success: (result) => `Uppercase: "${result.result}"`,
      })
      .handler(async ({ input }) => {
        return { result: input.text.toUpperCase() };
      })
      .route({
        name: "LowerCase",
        description: "Convert to lowercase",
        path: "lower_case",
      })
      .input(z.object({ text: z.string() }))
      .llm({
        success: (result) => `Lowercase: "${result.result}"`,
      })
      .handler(async ({ input }) => {
        return { result: input.text.toLowerCase() };
      });

    // Test first route
    const upperResult = await multiRouteApp.run("UpperCase").handler({
      input: { text: "Hello World" },
    });

    expect(typeof upperResult).toBe("string");
    expect(upperResult).toBe('Uppercase: "HELLO WORLD"');

    // Test second route
    const lowerResult = await multiRouteApp.run("LowerCase").handler({
      input: { text: "Hello World" },
    });

    expect(typeof lowerResult).toBe("string");
    expect(lowerResult).toBe('Lowercase: "hello world"');
  });

  test("allows passing input to the formatter", async () => {
    // Create an app that uses input in formatting
    const echoApp = openkit
      .app({
        name: "Echo",
        description: "Echo input",
      })
      .route({
        name: "Mirror",
        description: "Mirror the input",
        path: "mirror",
      })
      .input(
        z.object({
          message: z.string(),
          format: z
            .enum(["uppercase", "lowercase", "normal"])
            .default("normal"),
        }),
      )
      .llm({
        success: (result, input, context) => {
          const message = result.message;
          switch (input.format) {
            case "uppercase":
              return message.toUpperCase();
            case "lowercase":
              return message.toLowerCase();
            default:
              return message;
          }
        },
      })
      .handler(async ({ input }) => {
        // Just pass through the input
        return { message: input.message };
      });

    // Test normal format
    const normalResult = await echoApp.run("Mirror").handler({
      input: {
        message: "Hello World",
        format: "normal",
      },
    });
    expect(normalResult).toBe("Hello World");

    // Test uppercase format
    const upperResult = await echoApp.run("Mirror").handler({
      input: {
        message: "Hello World",
        format: "uppercase",
      },
    });
    expect(upperResult).toBe("HELLO WORLD");

    // Test lowercase format
    const lowerResult = await echoApp.run("Mirror").handler({
      input: {
        message: "Hello World",
        format: "lowercase",
      },
    });
    expect(lowerResult).toBe("hello world");
  });
});
