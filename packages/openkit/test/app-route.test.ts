import { describe, test, expect } from "vitest";
import { z } from "zod";
import openkit from "../src";

describe("OpenKit API", () => {
  test("can create an app with one route", async () => {
    // Create an app with a route
    const app = openkit.app({
      name: "Echo",
      description: "An app that echoes the input",
    });

    // Add a route
    const route = app
      .route({
        name: "Echo",
        description: "Echoes the input message",
        path: "echo",
      })
      .input(z.object({ message: z.string() }))
      .handler(async ({ input }) => {
        return { echo: input.message };
      });

    // Execute the route
    const result = await app.run("Echo").handler({
      input: { message: "Hello world" },
    });

    expect(result).toEqual({ echo: "Hello world" });
  });

  test("can create an app with multiple routes", async () => {
    const calculatorApp = openkit
      .app({
        name: "Calculator",
        description: "A calculator app",
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

    // Test routes
    const addResult = await calculatorApp.run("Add").handler({
      input: { a: 5, b: 3 },
    });

    const subtractResult = await calculatorApp.run("Subtract").handler({
      input: { a: 5, b: 3 },
    });

    expect(addResult).toEqual({ result: 8 });
    expect(subtractResult).toEqual({ result: 2 });
  });

  test("can use middleware in routes", async () => {
    const loggingMiddleware = async (
      context: any,
      next: () => Promise<any>,
    ) => {
      context.logs = context.logs || [];
      context.logs.push("before");
      const result = await next();
      context.logs.push("after");
      return result;
    };

    const app = openkit
      .app({
        name: "MiddlewareTest",
        description: "App with middleware",
      })
      .route({
        name: "Test",
        description: "Test route",
        path: "test",
      })
      .use(loggingMiddleware)
      .handler(async ({ context }) => {
        context.logs.push("during");
        return { logs: context.logs };
      });

    const result = await app.run("Test").handler({});
    expect(result).toEqual({ logs: ["before", "during", "after"] });
  });

  test("can use the convenience route method", async () => {
    // Create an app and route in one step
    const echoApp = openkit
      .app({
        name: "Echo",
        description: "An echo app",
      })
      .route({
        name: "Message",
        description: "Echoes a message back",
        path: "echo",
      })
      .input(z.object({ message: z.string() }))
      .handler(async ({ input }) => {
        return { echo: input.message };
      });

    // Execute the route
    const result = await echoApp.run("Message").handler({
      input: { message: "Hello world" },
    });

    expect(result).toEqual({ echo: "Hello world" });
  });

  test("supports OpenAI adapter integration", () => {
    // Create app with route for OpenAI integration
    const app = openkit
      .app({
        name: "Echo",
        description: "An echo app",
      })
      .route({
        name: "Message",
        description: "Echoes back a message",
        path: "echo",
      })
      .input(z.object({ message: z.string() }))
      .debug()
      .handler(async ({ input }) => {
        return { echo: input.message };
      });

    // Create an OpenAI adapter with the app
    const oai = openkit.openai({ apps: [app] });

    // Get tool definitions for OpenAI API
    const tools = oai.tools();

    // Log tools using pino logger instead of console.log
    // console.log("Tools from adapter:", JSON.stringify(tools, null, 2));

    // Make sure we have the correct number of tools
    expect(tools).toHaveLength(1);

    // Check the function name - should match the format {app name}-{route path}
    expect(tools[0].function.name).toBe("echo-echo");
  });

  test("can create a multi-route app", async () => {
    // Create a multi-route app
    const app = openkit
      .app({
        name: "Multi-Route App",
        description: "App with multiple routes",
      })
      .route({
        name: "Greeting",
        description: "Greets a user",
        path: "greeting",
      })
      .input(z.object({ name: z.string() }))
      .handler(async ({ input }) => {
        return { greeting: `Hello, ${input.name}!` };
      })
      .route({
        name: "Farewell",
        description: "Says goodbye to a user",
        path: "farewell",
      })
      .input(z.object({ name: z.string() }))
      .handler(async ({ input }) => {
        return { farewell: `Goodbye, ${input.name}!` };
      });

    // Execute the routes
    const greetingResult = await app.run("Greeting").handler({
      input: { name: "John" },
    });

    const farewellResult = await app.run("Farewell").handler({
      input: { name: "John" },
    });

    expect(greetingResult).toEqual({ greeting: "Hello, John!" });
    expect(farewellResult).toEqual({ farewell: "Goodbye, John!" });
  });

  test("can use middleware in multi-route app", async () => {
    const loggingMiddleware = async (
      context: any,
      next: () => Promise<any>,
    ) => {
      context.logs = context.logs || [];
      context.logs.push("before");
      const result = await next();
      context.logs.push("after");
      return result;
    };

    // Create the app
    const app = openkit
      .app({
        name: "Middleware App",
        description: "App with middleware",
      })
      .route({
        name: "Protected",
        description: "A route that uses middleware",
        path: "protected",
      })
      .use(loggingMiddleware)
      .input(z.object({ message: z.string() }))
      .handler(async ({ input, context }) => {
        context.logs = context.logs || [];
        return { message: input.message, logs: context.logs };
      });

    const result = await app.run("Protected").handler({
      input: { message: "Hello world" },
      context: {},
    });

    expect(result).toEqual({
      message: "Hello world",
      logs: ["before", "after"],
    });
  });
});
