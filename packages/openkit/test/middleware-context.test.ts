import { describe, it, expect, vi } from "vitest";
import { AppBuilder } from "../src/builders/app-builder";

// Define the shape of auth object for type assertions
type Auth = { user: { id: string; name: string } };

describe("Middleware Context Updates", () => {
  it("allows middleware to update context that is available in subsequent middleware and handler", async () => {
    // Create a mock auth function
    const authFn = vi
      .fn()
      .mockResolvedValue({ user: { id: "123", name: "Test User" } });

    // Create the app
    const app = new AppBuilder({
      name: "Test App",
      description: "App for testing middleware context updates",
    });

    // Add a route with middleware that updates the context
    const route = app
      .route({
        name: "Test Route",
        path: "/test",
      })
      // First middleware adds auth to context
      .use(async (context, next) => {
        const auth = await authFn();

        // Return next with updated context
        return next({
          context: {
            auth,
          },
        });
      })
      // Second middleware uses auth from context and adds more data
      .use(async (context, next) => {
        // Can access auth from previous middleware
        const auth = context.auth; // Type assertion
        const userId = auth?.user?.id;

        return next({
          context: {
            enriched: {
              timestamp: Date.now(),
              userId,
            },
          },
        });
      })
      // Handler has access to all context updates
      .handler(async ({ context }) => {
        const auth = context.auth as Auth; // Type assertion
        return {
          auth: auth,
          enriched: context.enriched,
          message: `Hello ${auth?.user?.name}`,
        };
      });

    // Execute the route
    const runner = app.run("Test Route");
    const result = await runner.handler({});

    // Verify the results
    expect(authFn).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      auth: { user: { id: "123", name: "Test User" } },
      enriched: {
        userId: "123",
        timestamp: expect.any(Number),
      },
      message: "Hello Test User",
    });
  });
});
