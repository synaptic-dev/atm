import { describe, test, expect } from "vitest";
import { z } from "zod";
import openkit from "../src";

describe("App with Routes", () => {
  test("can create a simple single-route app", async () => {
    // Create a single-route app
    const currentTimeApp = openkit
      .app({
        name: "CurrentTime",
        description: "A simple app that returns the current time",
      })
      .route({
        name: "Get",
        description: "Get the current time",
        path: "get",
      })
      .input(
        z.object({
          timezone: z
            .string()
            .optional()
            .describe("Optional timezone (defaults to UTC)"),
        }),
      )
      .handler(async ({ input }) => {
        const now = new Date();
        return {
          currentTime: now.toISOString(),
          timestamp: now.getTime(),
        };
      });

    // Execute the app
    const result = await currentTimeApp.run("Get").handler({
      input: { timezone: "UTC" },
    });

    // Verify result
    expect(result).toHaveProperty("currentTime");
    expect(result).toHaveProperty("timestamp");
    expect(typeof result.currentTime).toBe("string");
    expect(typeof result.timestamp).toBe("number");
  });

  test("can create a multi-route app", async () => {
    // Create a multi-route app
    const mathApp = openkit
      .app({
        name: "Math",
        description: "Performs mathematical operations",
      })
      .route({
        name: "Add",
        description: "Adds two numbers",
        path: "add",
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
      .route({
        name: "Subtract",
        description: "Subtracts two numbers",
        path: "subtract",
      })
      .input(
        z.object({
          a: z.number(),
          b: z.number(),
        }),
      )
      .handler(async ({ input }) => {
        return { result: input.a - input.b };
      });

    // Test first route
    const addResult = await mathApp.run("Add").handler({
      input: { a: 5, b: 3 },
    });
    expect(addResult).toEqual({ result: 8 });

    // Test second route
    const subtractResult = await mathApp.run("Subtract").handler({
      input: { a: 5, b: 3 },
    });
    expect(subtractResult).toEqual({ result: 2 });
  });

  test("can use context in routes", async () => {
    // Create an app with context
    const appWithContext = openkit
      .app({
        name: "ContextApp",
        description: "App that uses context",
      })
      .context({
        multiplier: 10,
      })
      .route({
        name: "Multiply",
        description: "Multiplies a number by the context multiplier",
        path: "multiply",
      })
      .input(
        z.object({
          value: z.number(),
        }),
      )
      .handler(async ({ input, context }) => {
        return { result: input.value * context.multiplier };
      });

    // Execute the route
    const result = await appWithContext.run("Multiply").handler({
      input: { value: 5 },
    });

    // Verify result
    expect(result).toEqual({ result: 50 });
  });

  test("route names are case-insensitive", async () => {
    // Create an app with a route
    const app = openkit
      .app({
        name: "CaseTest",
        description: "Testing case insensitivity",
      })
      .route({
        name: "TestRoute",
        description: "Test route",
        path: "testroute",
      })
      .handler(async () => {
        return { success: true };
      });

    // Execute the route with different case
    const result = await app.run("testroute").handler({});

    // Verify result
    expect(result).toEqual({ success: true });
  });

  test("app with middleware", async () => {
    // Create a middleware function
    const loggingMiddleware = async (
      context: any,
      next: () => Promise<any>,
    ) => {
      context.logs = ["before"];
      const result = await next();
      context.logs.push("after");
      return result;
    };

    // Create an app with middleware
    const app = openkit
      .app({
        name: "MiddlewareTest",
        description: "Testing middleware",
      })
      .route({
        name: "Test",
        description: "Test route with middleware",
        path: "test",
      })
      .use(loggingMiddleware)
      .handler(async ({ context }) => {
        context.logs.push("during");
        return { logs: context.logs };
      });

    // Execute the route
    const result = await app.run("Test").handler({});

    // Verify middleware execution order
    expect(result).toEqual({ logs: ["before", "during", "after"] });
  });

  test("route with path parameters", async () => {
    // Create an app with a route
    const app = openkit
      .app({
        name: "EchoRoute",
        description: "Echoes back the input",
      })
      .route({
        name: "Route1",
        description: "First route",
        path: "route1",
      })
      .handler(async ({ input }) => {
        return { success: true };
      });

    // Execute the route with different case
    const result = await app.run("Route1").handler({});

    // Verify result
    expect(result).toEqual({ success: true });
  });
});
