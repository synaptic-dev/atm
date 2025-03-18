import { describe, test, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { openkit } from "../src";

describe("Multi-Capability Tool", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test("creates a tool with multiple capabilities", async () => {
    // Create a multi-capability tool
    const calculatorTool = openkit
      .tool({
        name: "Calculator",
        description: "Math calculator tool",
      })
      .capability({
        name: "Add",
        description: "Add two numbers",
      })
      .input(
        z.object({
          a: z.number(),
          b: z.number(),
        }),
      )
      .handler(async ({ input }) => {
        return { result: input.a + input.b };
      })
      .capability({
        name: "Multiply",
        description: "Multiply two numbers",
      })
      .input(
        z.object({
          a: z.number(),
          b: z.number(),
        }),
      )
      .handler(async ({ input }) => {
        return { result: input.a * input.b };
      });

    // Test first capability
    const addResult = await calculatorTool.run("Add").handler({
      input: { a: 2, b: 3 },
    });

    expect(addResult).toEqual({ result: 5 });

    // Test second capability
    const multiplyResult = await calculatorTool.run("Multiply").handler({
      input: { a: 2, b: 3 },
    });

    expect(multiplyResult).toEqual({ result: 6 });
  });

  test("each capability can have its own schemas", async () => {
    // Create a tool with different schemas for each capability
    const conversionTool = openkit
      .tool({
        name: "Converter",
        description: "Unit conversion tool",
      })
      .capability({
        name: "CelsiusToFahrenheit",
        description: "Convert Celsius to Fahrenheit",
      })
      .input(
        z.object({
          celsius: z.number(),
        }),
      )
      .output(
        z.object({
          fahrenheit: z.number(),
        }),
      )
      .handler(async ({ input }) => {
        return { fahrenheit: (input.celsius * 9) / 5 + 32 };
      })
      .capability({
        name: "MetersToFeet",
        description: "Convert meters to feet",
      })
      .input(
        z.object({
          meters: z.number().positive(),
        }),
      )
      .output(
        z.object({
          feet: z.number(),
        }),
      )
      .handler(async ({ input }) => {
        return { feet: input.meters * 3.28084 };
      });

    // Test celsius conversion
    const tempResult = await conversionTool.run("CelsiusToFahrenheit").handler({
      input: { celsius: 0 },
    });

    expect(tempResult).toEqual({ fahrenheit: 32 });

    // Test meters conversion
    const distanceResult = await conversionTool.run("MetersToFeet").handler({
      input: { meters: 1 },
    });

    expect(distanceResult).toEqual({ feet: 3.28084 });

    // Should fail with invalid input
    await expect(
      conversionTool.run("MetersToFeet").handler({
        input: { meters: -5 }, // Negative value should fail positive() validation
      }),
    ).rejects.toThrow();
  });

  test("each capability can have its own middleware", async () => {
    const authSpy = vi.fn(async (ctx, next) => {
      if (!ctx.apiKey) throw new Error("API key required");
      ctx.user = { id: "123" };
      return next();
    });

    const logSpy = vi.fn(async (ctx, next) => {
      ctx.logged = true;
      return next();
    });

    // Create tool with different middleware per capability
    const emailTool = openkit
      .tool({
        name: "Email",
        description: "Email client",
      })
      .capability({
        name: "Send",
        description: "Send an email",
      })
      .use(authSpy) // Only Send requires auth
      .input(
        z.object({
          to: z.string().email(),
          subject: z.string(),
          body: z.string(),
        }),
      )
      .handler(async ({ input, context }) => {
        return {
          sent: true,
          messageId: "123",
          user: context.user,
        };
      })
      .capability({
        name: "Preview",
        description: "Preview an email",
      })
      .use(logSpy) // Only Preview uses logging
      .input(
        z.object({
          subject: z.string(),
          body: z.string(),
        }),
      )
      .handler(async ({ input, context }) => {
        return {
          preview: `${input.subject}: ${input.body.substring(0, 20)}...`,
          logged: context.logged,
        };
      });

    // Test Send (requires auth)
    await expect(
      emailTool.run("Send").handler({
        input: {
          to: "test@example.com",
          subject: "Hello",
          body: "Test message",
        },
      }),
    ).rejects.toThrow("API key required");

    const sendResult = await emailTool.run("Send").handler({
      input: {
        to: "test@example.com",
        subject: "Hello",
        body: "Test message",
      },
      context: { apiKey: "valid" },
    });

    expect(sendResult).toEqual({
      sent: true,
      messageId: "123",
      user: { id: "123" },
    });
    expect(authSpy).toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();

    // Test Preview (only needs logging)
    authSpy.mockClear();
    logSpy.mockClear();

    const previewResult = await emailTool.run("Preview").handler({
      input: {
        subject: "Hello",
        body: "This is a long message that should be truncated",
      },
    });

    expect(previewResult).toEqual({
      preview: "Hello: This is a long messa...",
      logged: true,
    });
    expect(authSpy).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();
  });

  test("can find capability by snake_case name", async () => {
    // Create tool with capability name containing spaces
    const multiWordTool = openkit
      .tool({
        name: "Multi Word Tool",
        description: "Tool with multi-word capability names",
      })
      .capability({
        name: "Process Data Item",
        description: "Process a data item",
      })
      .input(
        z.object({
          item: z.string(),
        }),
      )
      .handler(async ({ input }) => {
        return { processed: input.item.toUpperCase() };
      });

    // Should be able to run with snake_case name
    const result = await multiWordTool.run("process_data_item").handler({
      input: { item: "test" },
    });

    expect(result).toEqual({ processed: "TEST" });
  });

  test("throws error for non-existent capability", async () => {
    const simpleTool = openkit
      .tool({
        name: "Simple",
        description: "Simple tool",
      })
      .capability({
        name: "Method",
        description: "The only method",
      })
      .input(z.object({}))
      .handler(async () => ({ done: true }));

    // Use try/catch instead of expect().rejects.toThrow()
    try {
      await simpleTool.run("NonExistent").handler({
        input: {},
      });
      // If we get here, the test should fail
      expect("should have thrown an error").toBe("but didn't");
    } catch (error) {
      // Verify it's the expected error
      expect(error.message).toBe('Capability "NonExistent" not found');
    }
  });

  test("throws error for capability without handler", async () => {
    // Create a "broken" tool for testing - we need to hack around TypeScript
    // by casting to 'any' since our API enforces handler in the types
    const brokenTool = openkit.tool({
      name: "Broken",
      description: "Broken tool",
    }) as any;

    // Add a capability without a handler by accessing internal properties
    brokenTool.capabilities.push({
      name: "Missing",
      description: "Missing handler",
      inputSchema: z.object({}),
      middleware: [],
      _validateInput: (input: any) => input,
      _validateOutput: (output: any) => output,
    });

    // Should throw when trying to execute the capability
    await expect(
      brokenTool.run("Missing").handler({
        input: {},
      }),
    ).rejects.toThrow('No handler defined for capability "Missing"');
  });
});
