# OpenKit API Guide

This guide details the OpenKit API design and terminology.

## Terminology

OpenKit uses terminology that aligns with modern web development patterns:

- **App**: The top-level container for functionality (similar to an application in web frameworks)
- **Route**: An explicit function within an app (similar to routes/endpoints in web frameworks)

## Core Principle: Explicit Routes

In OpenKit, every app must have at least one explicit route. There are no "implicit" or "single-route" apps.

## API Structure

### Creating an App with Routes

Every app must have at least one explicitly defined route:

```typescript
import { z } from "zod";
import openkit from "@opkt/openkit";

// Create an app
const myApp = openkit.app({
  name: "MyApp",
  description: "An app that does something",
});

// Add an explicit route
myApp
  .route({
    name: "DoSomething",
    description: "Does something useful",
  })
  .input(
    z.object({
      parameter: z.string(),
    }),
  )
  .handler(async ({ input }) => {
    return { result: `Processed: ${input.parameter}` };
  });
```

### Convenience Method

For simplicity when creating single-route apps, you can use a fluent interface:

```typescript
const echoApp = openkit
  .app({
    name: "Echo",
    description: "An echo app",
  })
  .route({
    name: "Message",
    description: "Echoes a message back",
  })
  .input(z.object({ message: z.string() }))
  .handler(async ({ input }) => {
    return { echo: input.message };
  });

// Execute the route
const result = await echoApp.run("Message").handler({
  input: { message: "Hello world" },
});
```

## Using Apps

### Executing Routes

All route execution is done explicitly by name:

```typescript
// Execute a route by name
const result = await myApp.run("DoSomething").handler({
  input: { parameter: "test-value" },
});
```

### Using Context

```typescript
// Setting app-level context
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
  })
  .input(
    z.object({
      value: z.number(),
    }),
  )
  .handler(async ({ input, context }) => {
    return { result: input.value * context.multiplier };
  });

// Providing context at runtime
const result = await appWithContext.run("Multiply").handler({
  input: { value: 5 },
  context: { additionalValue: 20 },
});
```

## OpenAI Integration

OpenKit integrates seamlessly with OpenAI's function calling:

```typescript
// Create an OpenAI adapter with your apps
const oai = openkit.openai({ apps: [myApp, anotherApp] });

// Get tool definitions for OpenAI API
const tools = oai.tools();

// Use with OpenAI
const openaiResponse = await openai.chat.completions.create({
  model: "gpt-4-turbo",
  messages: [{ role: "user", content: "Help me use these apps" }],
  tools: tools,
});

// Handle tool calls
if (openaiResponse.choices[0].message.tool_calls) {
  const toolResults = await oai.handler({ chatCompletion: openaiResponse });

  // Continue the conversation
  // ...
}
```

## Key Features

- **Input Validation**: Uses Zod schemas to validate input
- **Output Validation**: Optional output validation
- **Middleware**: Add cross-cutting concerns to your routes
- **LLM Formatting**: Custom formatting for LLM responses
- **Context**: Share data and dependencies between routes
- **Debugging**: Enable debug mode to see detailed logs

## Example: Complete App

```typescript
import { z } from "zod";
import openkit from "@opkt/openkit";

// Define a multi-route app
const weatherApp = openkit
  .app({
    name: "Weather",
    description: "Get weather information",
  })
  .context({ apiKey: "weather-api-key" })
  .route({
    name: "Current",
    description: "Get current weather",
  })
  .input(
    z.object({
      location: z.string().describe("Location to get weather for"),
    }),
  )
  .handler(async ({ input, context }) => {
    // Use context.apiKey to fetch from weather API
    return {
      temperature: 72,
      conditions: "sunny",
      location: input.location,
    };
  })
  .route({
    name: "Forecast",
    description: "Get weather forecast",
  })
  .input(
    z.object({
      location: z.string(),
      days: z.number().int().min(1).max(7).default(3),
    }),
  )
  .handler(async ({ input, context }) => {
    // Implementation
    return {
      forecast: [
        { day: 1, temperature: 72, conditions: "sunny" },
        { day: 2, temperature: 70, conditions: "partly cloudy" },
        { day: 3, temperature: 68, conditions: "cloudy" },
      ],
      location: input.location,
    };
  });

export default weatherApp;
```
