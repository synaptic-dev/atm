# @opkt/openkit v1.0

OpenKit provides a type-safe way to define agent tools using Zod schemas and TypeScript.

## Installation

```bash
pnpm add @opkt/openkit
```

## Quick Start

### Single-Capability Tool

The simplest way to create a tool with a single capability:

```typescript
import { z } from "zod";
import { openkit } from "@opkt/openkit";

// Define a single-capability tool with the fluent API
const greetingTool = openkit
  .tool({
    name: "Greeting",
    description: "A simple greeting tool",
  })
  .input(
    z.object({
      name: z.string().describe("Name of the person to greet"),
    }),
  )
  .output(
    z.object({
      message: z.string(),
      timestamp: z.string(),
    }),
  )
  .handler(async ({ input }) => {
    return {
      message: `Hello, ${input.name}!`,
      timestamp: new Date().toISOString(),
    };
  });

// Direct invocation for testing
const result = await greetingTool.run().handler({
  input: { name: "World" },
});
console.log(result); // { message: "Hello, World!", timestamp: "..." }
```

### Multi-Capability Tool

For tools with multiple capabilities:

```typescript
import { z } from "zod";
import { openkit } from "@opkt/openkit";

// Define your input schemas
const nameSchema = z.object({
  name: z.string().describe("Name of the person"),
});

// Create a multi-capability tool
const conversationTool = openkit
  .tool({
    name: "Conversation",
    description: "A tool for greeting and farewell",
  })
  .capability({
    name: "Greet",
    description: "Greets a person by name",
  })
  .input(nameSchema)
  .output(
    z.object({
      message: z.string(),
      timestamp: z.string(),
    }),
  )
  .handler(async ({ input }) => {
    return {
      message: `Hello, ${input.name}!`,
      timestamp: new Date().toISOString(),
    };
  })
  .capability({
    name: "Farewell",
    description: "Says goodbye to a person",
  })
  .input(nameSchema)
  .output(
    z.object({
      message: z.string(),
      timestamp: z.string(),
    }),
  )
  .handler(async ({ input }) => {
    return {
      message: `Goodbye, ${input.name}!`,
      timestamp: new Date().toISOString(),
    };
  });

// Direct invocation of specific capability
const result = await conversationTool.run("Greet").handler({
  input: { name: "World" },
});
console.log(result); // { message: "Hello, World!", timestamp: "..." }
```

## Using Middleware

You can add middleware to your tools for cross-cutting concerns like authentication:

```typescript
import { openkit } from "@opkt/openkit";

// Define authentication middleware
const authMiddleware = async (context, next) => {
  if (!context.apiKey) {
    throw new Error("API key required");
  }

  // Validate API key
  if (context.apiKey !== "valid-key") {
    throw new Error("Invalid API key");
  }

  // Continue to next middleware or handler
  return next();
};

// Create a tool with middleware
const weatherTool = openkit
  .tool({
    name: "Weather",
    description: "Get weather information",
  })
  .use(authMiddleware)
  .input(
    z.object({
      location: z.string(),
    }),
  )
  .handler(async ({ input, context }) => {
    // Access context properties from middleware
    console.log(`Request authorized with key: ${context.apiKey}`);

    // Actual implementation
    return {
      location: input.location,
      temperature: 72,
      conditions: "Sunny",
    };
  });

// When invoking, provide context with required auth
const result = await weatherTool.run().handler({
  input: { location: "San Francisco" },
  context: { apiKey: "valid-key" },
});
```

## OpenAI Integration

Integrate with OpenAI's function calling:

```typescript
import { openkit } from "@opkt/openkit";
import OpenAI from "openai";

// Create your tools
const greetingTool = openkit.tool(/* ... */);
const weatherTool = openkit.tool(/* ... */);

// Create an OpenAI adapter with your tools
const toolkit = openkit.openai({
  tools: [greetingTool, weatherTool],
});

// Set up OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Use the tools with OpenAI
const completion = await openai.chat.completions.create({
  model: "gpt-4-turbo",
  messages: [{ role: "user", content: "What's the weather in San Francisco?" }],
  tools: toolkit.tools(),
});

// Process tool calls
if (completion.choices[0].message.tool_calls) {
  const toolResponses = await toolkit.handler({
    message: completion.choices[0].message,
  });

  // Continue the conversation with tool responses
  const finalResponse = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      { role: "user", content: "What's the weather in San Francisco?" },
      completion.choices[0].message,
      ...toolResponses,
    ],
  });

  console.log(finalResponse.choices[0].message.content);
}
```

## Core Concepts

### Tool Builder

The `tool()` method is the main entry point for creating tools:

```typescript
const myTool = openkit.tool({
  name: string, // Display name of your tool
  description: string, // What your tool does
});
```

For single-capability tools, you can chain methods directly:

```typescript
myTool
  .input(zodSchema)    // Define input validation schema
  .output(zodSchema)   // Define output validation schema
  .use(middleware)     // Add middleware
  .handler(async function) // Define execution logic
```

For multi-capability tools, use the `capability()` method:

```typescript
myTool
  .capability({
    name: string,      // Name of this capability
    description: string // What this capability does
  })
  .input(zodSchema)    // Define input validation for this capability
  .output(zodSchema)   // Define output validation for this capability
  .use(middleware)     // Add middleware for this capability
  .handler(async function) // Define execution logic for this capability
```

### Direct Invocation

Tools can be directly invoked for testing and local usage:

```typescript
// For single-capability tools
const result = await myTool.run().handler({
  input: inputData,
  context: contextData,
});

// For multi-capability tools
const result = await myTool.run("CapabilityName").handler({
  input: inputData,
  context: contextData,
});
```

### OpenAI Integration

```typescript
const toolkit = openkit.openai({
  tools: [tool1, tool2],
});

// Get function definitions for OpenAI
const functions = toolkit.tools();

// Process tool calls from OpenAI
const responses = await toolkit.handler({
  message: chatCompletionMessage,
});
```

## Migrating from v0.x

If you're migrating from the class-based API in v0.x, here's how patterns map to the new API:

### Single-Capability Tool

**v0.x:**

```typescript
const greetingTool = new Tool({
  name: "Greeting",
  description: "A simple greeting tool",
  schema: z.object({
    name: z.string(),
  }),
  runner: async (params) => {
    return { message: `Hello, ${params.name}!` };
  },
});
```

**v1.x:**

```typescript
const greetingTool = openkit
  .tool({
    name: "Greeting",
    description: "A simple greeting tool",
  })
  .input(
    z.object({
      name: z.string(),
    }),
  )
  .handler(async ({ input }) => {
    return { message: `Hello, ${input.name}!` };
  });
```

### Multi-Capability Tool

**v0.x:**

```typescript
const greetCapability = new ToolCapability({
  name: "Greet",
  description: "Greets a person",
  schema: greetSchema,
  runner: async (params) => {
    /* ... */
  },
});

const farewellCapability = new ToolCapability({
  name: "Farewell",
  description: "Says goodbye",
  schema: greetSchema,
  runner: async (params) => {
    /* ... */
  },
});

const conversationTool = new Tool({
  name: "Conversation",
  description: "Conversation tools",
  capabilities: [greetCapability, farewellCapability],
});
```

**v1.x:**

```typescript
const conversationTool = openkit
  .tool({
    name: "Conversation",
    description: "Conversation tools",
  })
  .capability({
    name: "Greet",
    description: "Greets a person",
  })
  .input(greetSchema)
  .handler(async ({ input }) => {
    /* ... */
  })
  .capability({
    name: "Farewell",
    description: "Says goodbye",
  })
  .input(greetSchema)
  .handler(async ({ input }) => {
    /* ... */
  });
```

## License

MIT
