import { describe, test, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// Define mocks before any imports using vi.hoisted
const mockFns = vi.hoisted(() => {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  };
});

// Mock pino module
vi.mock("pino", () => {
  return {
    default: () => ({
      debug: mockFns.debug,
      info: mockFns.info,
      error: mockFns.error,
      warn: mockFns.warn,
    }),
  };
});

// Import openkit after setting up the mocks
import openkit from "../src";

// Helper function to create a test app
const createTestApp = () => {
  return openkit
    .app({ name: "TestApp", description: "A test app for debugging" })
    .route({
      name: "TestRoute",
      description: "A test route for debugging",
      path: "test_route",
    })
    .input(z.object({ message: z.string() }))
    .handler(async ({ input }) => {
      return { echo: input.message };
    });
};

describe("Debug functionality", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Clear any pino mock calls
    mockFns.debug.mockClear();
    mockFns.info.mockClear();
    mockFns.error.mockClear();
    mockFns.warn.mockClear();
  });

  test("should execute normally without debug mode", async () => {
    // Create app without debug mode
    const app = createTestApp();

    // Execute route
    const result = await app.run("TestRoute").handler({
      input: { message: "Hello" },
    });

    // Verify result
    expect(result).toEqual({ echo: "Hello" });

    // Verify no debug logs
    expect(mockFns.debug).not.toHaveBeenCalled();
    expect(mockFns.info).not.toHaveBeenCalled();
  });

  test("should output debug information when debug mode is enabled", async () => {
    // Create app with debug mode
    const app = createTestApp().debug();

    // Execute app
    const result = await app.run("TestRoute").handler({
      input: { message: "Debug mode enabled" },
    });

    // Verify result
    expect(result).toEqual({ echo: "Debug mode enabled" });

    // Verify debug logs were created
    expect(mockFns.debug).toHaveBeenCalled();
    expect(mockFns.info).toHaveBeenCalled();
  });

  test("should debug with multi-route apps", async () => {
    // Multi-route app
    const multiRouteApp = openkit
      .app({ name: "MultiApp" })
      .debug()
      .route({
        name: "FirstRoute",
        description: "First test route",
        path: "first_route",
      })
      .input(z.object({ value: z.number() }))
      .handler(async ({ input }) => {
        return { result: input.value * 2 };
      })
      .route({
        name: "SecondRoute",
        description: "Second test route",
        path: "second_route",
      })
      .input(z.object({ value: z.number() }))
      .handler(async ({ input }) => {
        return { result: input.value * 3 };
      });

    // Execute both routes
    const result1 = await multiRouteApp.run("FirstRoute").handler({
      input: { value: 10 },
    });
    const result2 = await multiRouteApp.run("SecondRoute").handler({
      input: { value: 10 },
    });

    // Verify results
    expect(result1).toEqual({ result: 20 });
    expect(result2).toEqual({ result: 30 });

    // Verify debug logs were created
    expect(mockFns.debug).toHaveBeenCalled();
    expect(mockFns.info).toHaveBeenCalled();
  });

  test("should debug errors when they occur", async () => {
    // App that will generate an error
    const errorApp = openkit
      .app({ name: "ErrorApp" })
      .debug()
      .route({
        name: "ErrorRoute",
        description: "Route that generates an error",
        path: "error_route",
      })
      .input(z.object({ valid: z.boolean() }))
      .handler(async ({ input }) => {
        if (!input.valid) {
          throw new Error("Test error");
        }
        return { success: true };
      });

    // Execute with invalid input to trigger error
    try {
      await errorApp.run("ErrorRoute").handler({
        input: { valid: false },
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      // Verify error is correct
      expect(error.message).toBe("Test error");
    }

    // Verify debug logs were created
    expect(mockFns.debug).toHaveBeenCalled();
    expect(mockFns.error).toHaveBeenCalled();
  });

  test("should debug complete flow with multiple middleware and context changes", async () => {
    // Create an app with multiple middleware functions
    const authenticationApp = openkit
      .app({ name: "AuthenticationApp" })
      .context({ apiKeys: { service1: "key-1", service2: "key-2" } })
      .debug() // Enable debug mode
      .route({
        name: "Authenticate",
        description: "Authenticate a request",
        path: "authenticate",
      })
      .input(z.object({ service: z.string() }))
      .use(async (context, next) => {
        // Add step 1 data to context
        context.step1 = "Authentication started";
        return await next();
      })
      .use(async (context, next) => {
        // Add credential data - access input from params
        context.input = context.input || context.params?.input;
        const service = context.input?.service || "service1"; // Default to service1
        context.credentials = {
          key: context.apiKeys[service] || "unknown",
          timestamp: Date.now(),
        };
        return await next();
      })
      .handler(async ({ input, context }) => {
        // Final step
        return {
          authenticated: context.credentials.key !== "unknown",
          service: input.service,
          timestamp: context.credentials.timestamp,
        };
      });

    // Execute with valid input
    const result = await authenticationApp.run("Authenticate").handler({
      input: { service: "service1" },
    });

    // Verify result
    expect(result).toEqual({
      authenticated: true,
      service: "service1",
      timestamp: expect.any(Number),
    });

    // Verify debug logs were created
    expect(mockFns.debug).toHaveBeenCalled();
    expect(mockFns.info).toHaveBeenCalled();
  });
});
