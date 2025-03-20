import openkit from "../src";
import { z } from "zod";

/**
 * Creates a simple app with one route
 * Used to replace occurrences of `.tool()`
 */
export function createAppWithRoute(options = {}) {
  const {
    appName = "TestApp",
    appDescription = "Test app for unit tests",
    routeName = "TestRoute",
    routeDescription = "Test route",
    routePath = "test_route",
    inputSchema,
    handler = async () => ({ success: true }),
  } = options;

  const app = openkit.app({
    name: appName,
    description: appDescription,
  });

  const route = app.route({
    name: routeName,
    description: routeDescription,
    path: routePath,
  });

  if (inputSchema) {
    route.input(inputSchema);
  }

  route.handler(handler);
  return app;
}

/**
 * Creates a calculator app with add and subtract routes
 * Used as a common example in tests
 */
export function createCalculatorApp() {
  const app = openkit.app({
    name: "Calculator",
    description: "Math calculator app",
  });

  app
    .route({
      name: "Add",
      description: "Add two numbers",
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
    });

  app
    .route({
      name: "Subtract",
      description: "Subtract two numbers",
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

  return app;
}

/**
 * Simple logging middleware for testing
 */
export const loggingMiddleware = async (context, next) => {
  context.logs = context.logs || [];
  context.logs.push("before");
  const result = await next();
  context.logs.push("after");
  return result;
};
