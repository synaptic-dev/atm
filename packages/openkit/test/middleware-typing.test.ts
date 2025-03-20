import { describe, it, expect, vi } from "vitest";
import { AppBuilder } from "../src/builders/app-builder";
import { NextFunction } from "../src/builders/types";

describe("Middleware Type Inference", () => {
  it("properly infers types through middleware chain", async () => {
    // Create a mock auth function
    const authFn = vi
      .fn()
      .mockResolvedValue({ user: { id: "123", name: "Test User" } });

    // Create the app
    const app = new AppBuilder({
      name: "Test App",
      description: "Test middleware type inference",
    });

    // First middleware has a specific return type
    const authMiddleware = async (context, next: NextFunction) => {
      const auth = await authFn();
      return next({
        context: {
          auth: () => "test",
        },
      });
    };

    // Add a route with middleware that updates the context
    const route = app
      .context({
        user: {
          id: "123",
          name: "Test User",
        },
      })
      .route({
        name: "Test Route",
        path: "/test",
      })
      // Add the auth middleware and type
      .use(authMiddleware)
      // Handler can access fully typed context
      .handler(async ({ context }) => {
        // TypeScript should know both auth and enriched exist
        return {
          result: `Hello ${context.user.name}, your ID is ${context.user.id}`,
        };
      })
      .llm({
        success: (result) => result,
      });

    // Execute the route
    const runner = app.run("Test Route");
    const result = (await runner.handler({})) as { result: string };

    // Verify the results
    expect(result.result).toBe("Hello Test User, your ID is 123");
  });
});
