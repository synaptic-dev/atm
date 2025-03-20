import { describe, test, expect } from "vitest";
import { z } from "zod";
import openkit from "../src";
import { createCalculatorApp } from "./helpers";

describe("Multi-Route App", () => {
  test("creates an app with multiple routes", async () => {
    // Create a multi-route app (calculator)
    const calculator = createCalculatorApp();

    // Test the Add route
    const addResult = await calculator.run("Add").handler({
      input: { a: 7, b: 3 },
    });
    expect(addResult).toEqual({ result: 10 });

    // Test the Subtract route
    const subtractResult = await calculator.run("Subtract").handler({
      input: { a: 7, b: 3 },
    });
    expect(subtractResult).toEqual({ result: 4 });
  });

  test("each route can have its own schemas", async () => {
    // Create an app with different schemas for each route
    const app = openkit.app({
      name: "Converter",
      description: "Unit conversion app",
    });

    app
      .route({
        name: "CelsiusToFahrenheit",
        description: "Convert Celsius to Fahrenheit",
        path: "celsius_to_fahrenheit",
      })
      .input(
        z.object({
          celsius: z.number(),
        }),
      )
      .handler(async ({ input }) => {
        return {
          fahrenheit: input.celsius * 1.8 + 32,
        };
      });

    app
      .route({
        name: "KilometersToMiles",
        description: "Convert kilometers to miles",
        path: "kilometers_to_miles",
      })
      .input(
        z.object({
          kilometers: z.number().positive(),
        }),
      )
      .handler(async ({ input }) => {
        return {
          miles: input.kilometers * 0.621371,
        };
      });

    // Test the first route
    const tempResult = await app.run("CelsiusToFahrenheit").handler({
      input: { celsius: 25 },
    });
    expect(tempResult).toEqual({ fahrenheit: 77 });

    // Test the second route
    const distanceResult = await app.run("KilometersToMiles").handler({
      input: { kilometers: 10 },
    });
    expect(distanceResult.miles).toBeCloseTo(6.21371);

    // Should throw validation error for negative kilometers
    await expect(
      app.run("KilometersToMiles").handler({
        input: { kilometers: -5 },
      }),
    ).rejects.toThrow();
  });

  test("each route can have its own middleware", async () => {
    // Create app with different middleware per route
    const app = openkit.app({
      name: "Email",
      description: "Email client",
    });

    app
      .route({
        name: "Send",
        description: "Send an email",
        path: "send",
      })
      .input(
        z.object({
          to: z.string().email(),
          subject: z.string(),
          body: z.string(),
        }),
      )
      .use(async (context, next) => {
        // Add timestamp to context
        context.timestamp = "2023-01-01T00:00:00Z";
        // Add sender
        context.sender = "test@example.com";
        return await next();
      })
      .handler(async ({ input, context }) => {
        return {
          status: "sent",
          to: input.to,
          from: context.sender,
          timestamp: context.timestamp,
        };
      });

    app
      .route({
        name: "Archive",
        description: "Archive an email",
        path: "archive",
      })
      .input(
        z.object({
          id: z.string(),
        }),
      )
      .use(async (context, next) => {
        // Add different context
        context.archivedAt = "2023-01-01T00:00:00Z";
        return await next();
      })
      .handler(async ({ input, context }) => {
        return {
          status: "archived",
          id: input.id,
          archivedAt: context.archivedAt,
        };
      });

    // Test the Send route middleware
    const sendResult = await app.run("Send").handler({
      input: {
        to: "recipient@example.com",
        subject: "Test",
        body: "Test message",
      },
    });

    expect(sendResult).toEqual({
      status: "sent",
      to: "recipient@example.com",
      from: "test@example.com",
      timestamp: "2023-01-01T00:00:00Z",
    });

    // Test the Archive route middleware
    const archiveResult = await app.run("Archive").handler({
      input: {
        id: "msg-123",
      },
    });

    expect(archiveResult).toEqual({
      status: "archived",
      id: "msg-123",
      archivedAt: "2023-01-01T00:00:00Z",
    });
  });

  test("can find route by case-insensitive name", async () => {
    // Create app with route name containing spaces
    const app = openkit.app({
      name: "Multi Word App",
      description: "App with multi-word route names",
    });

    app
      .route({
        name: "First Route",
        description: "First route with a space in the name",
        path: "first_route",
      })
      .handler(async () => {
        return { route: "first" };
      });

    app
      .route({
        name: "Second Route",
        description: "Second route with a space in the name",
        path: "second_route",
      })
      .handler(async () => {
        return { route: "second" };
      });

    // Test can find by exact name
    const result1 = await app.run("First Route").handler({});
    expect(result1).toEqual({ route: "first" });

    // Test can find by lowercase name
    const result2 = await app.run("first route").handler({});
    expect(result2).toEqual({ route: "first" });

    // Test can find the second route
    const result3 = await app.run("second route").handler({});
    expect(result3).toEqual({ route: "second" });
  });

  test("throws error for non-existent route", async () => {
    const app = openkit.app({
      name: "Simple",
      description: "Simple app",
    });

    app
      .route({
        name: "Test",
        description: "Test route",
        path: "test",
      })
      .handler(async () => {
        return { success: true };
      });

    // Should throw for non-existent route
    try {
      await app.run("NonExistent").handler({});
      // If we reach here, test should fail
      expect(true).toBe(false); // This line should not be reached
    } catch (error) {
      expect(error.message).toMatch(/not found/i);
    }
  });

  test("throws error for route without handler", async () => {
    // Create a "broken" app for testing
    const app = openkit.app({
      name: "Broken",
      description: "Broken app",
    });

    // Add a route but don't set a handler
    app.route({
      name: "Missing",
      description: "Missing handler",
      path: "missing",
    });

    // Should throw when trying to run the route
    await expect(app.run("Missing").handler({})).rejects.toThrow(/handler/i);
  });
});
