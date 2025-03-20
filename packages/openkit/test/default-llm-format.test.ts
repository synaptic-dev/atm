import { describe, test, expect } from "vitest";
import { z } from "zod";
import openkit from "../src";

describe("Default LLM Formatting", () => {
  test("uses default formatter for success responses", async () => {
    // Create an app without explicit LLM formatter
    const app = openkit.app({
      name: "DefaultSuccess",
      description: "Tests default success formatter",
    });

    app
      .route({
        name: "Echo",
        description: "Echoes back input",
        path: "echo",
      })
      .input(z.object({ value: z.string() }))
      .handler(async ({ input }) => {
        return { value: input.value };
      });

    // Get result with default formatter
    const result = await app.run("Echo").handler({
      input: { value: "test" },
    });

    // Default formatter should return the original object
    expect(result).toEqual({ value: "test" });
  });

  test("default formatter handles errors correctly", async () => {
    // Create an app that throws an error without explicit LLM formatter
    const app = openkit.app({
      name: "DefaultError",
      description: "Tests default error formatter",
    });

    app
      .route({
        name: "Fail",
        description: "Always fails with default error formatting",
        path: "fail",
      })
      .input(z.object({}))
      .handler(async () => {
        throw new Error(
          "This should be formatted by the default error formatter",
        );
      });

    // Get error with default formatter
    const result = await app.run("Fail").handler({
      input: {},
    });

    // Default formatter should return an error object
    expect(typeof result).toBe("object");
    expect(result).toHaveProperty("error");
    expect(result.error).toBe(
      "This should be formatted by the default error formatter",
    );
    expect(result).toHaveProperty("details");
  });

  test("default formatter works with handler chaining", async () => {
    // Create an app with handler chaining
    const app = openkit.app({
      name: "HandlerChain",
      description: "Tests handler chaining with default formatter",
    });

    const route = app
      .route({
        name: "Process",
        description: "Processes data with the default formatter",
        path: "process",
      })
      .input(
        z.object({
          value: z.number(),
          operation: z.enum(["double", "square", "error"]),
        }),
      );

    // Chain handler directly
    route.handler(async ({ input }) => {
      if (input.operation === "error") {
        throw new Error("Simulated error");
      }

      if (input.operation === "double") {
        return { result: input.value * 2, operation: input.operation };
      }

      return { result: input.value * input.value, operation: input.operation };
    });

    // Test success case with default formatter
    const doubleResult = await app.run("Process").handler({
      input: { value: 5, operation: "double" },
    });
    expect(doubleResult).toEqual({ result: 10, operation: "double" });

    // Test error case with default formatter
    const errorResult = await app.run("Process").handler({
      input: { value: 5, operation: "error" },
    });
    expect(errorResult).toHaveProperty("error");
    expect(errorResult.error).toBe("Simulated error");
  });
});
