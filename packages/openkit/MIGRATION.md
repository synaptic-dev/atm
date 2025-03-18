# OpenKit Migration Guide

This guide helps you migrate from OpenKit v0.x (class-based API) to v1.x (fluent builder API).

## Overview of Changes

OpenKit v1.0 introduces a new fluent builder API that:

- Uses a chainable interface for defining tools and capabilities
- Adds input and output validation
- Supports middleware for cross-cutting concerns
- Provides direct invocation for testing and local usage
- Maintains backward compatibility with the v0.x API

## Migration Steps

### Step 1: Update Import

**v0.x:**

```typescript
import { Tool, ToolCapability, Toolkit } from "@opkt/openkit";
```

**v1.x:**

```typescript
// For new API
import { openkit } from "@opkt/openkit";

// For compatibility with existing code
import { Tool, ToolCapability, Toolkit } from "@opkt/openkit";
```

### Step 2: Migrate Single-Capability Tools

**v0.x:**

```typescript
const greetingTool = new Tool({
  name: "Greeting",
  description: "A simple greeting tool",
  schema: z.object({
    name: z.string().describe("Name of the person to greet"),
  }),
  runner: async (params) => {
    return {
      message: `Hello, ${params.name}!`,
      timestamp: new Date().toISOString(),
    };
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
```

Key differences:

- `schema` becomes `.input()`
- `runner` becomes `.handler()`
- Handler receives `{ input, context }` object instead of direct params
- Optional output validation with `.output()`

### Step 3: Migrate Multi-Capability Tools

**v0.x:**

```typescript
const greetCapability = new ToolCapability({
  name: "Greet",
  description: "Greets a person by name",
  schema: greetSchema,
  runner: async (params) => {
    return {
      message: `Hello, ${params.name}!`,
      timestamp: new Date().toISOString(),
    };
  },
});

const farewellCapability = new ToolCapability({
  name: "Farewell",
  description: "Says goodbye to a person",
  schema: greetSchema,
  runner: async (params) => {
    return {
      message: `Goodbye, ${params.name}!`,
      timestamp: new Date().toISOString(),
    };
  },
});

const multiCapabilityTool = new Tool({
  name: "Hello World",
  description: "A tool with greeting capabilities",
  capabilities: [greetCapability, farewellCapability],
});
```

**v1.x:**

```typescript
const multiCapabilityTool = openkit
  .tool({
    name: "Hello World",
    description: "A tool with greeting capabilities",
  })
  .capability({
    name: "Greet",
    description: "Greets a person by name",
  })
  .input(greetSchema)
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
  .input(greetSchema)
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
```

Key differences:

- Capabilities are defined inline with `.capability()`
- No need to create separate `ToolCapability` instances
- Each capability has its own chain of `.input()`, `.output()`, and `.handler()`

### Step 4: Migrate OpenAI Integration

**v0.x:**

```typescript
const toolkit = new Toolkit({
  tools: [greetingTool, weatherTool],
});

// Integration with OpenAI
const functions = toolkit.openai();
const responses = await toolkit.handler({ message: chatCompletionMessage });
```

**v1.x:**

```typescript
const toolkit = openkit.openai({
  tools: [greetingTool, weatherTool],
});

// Integration with OpenAI
const functions = toolkit.tools();
const responses = await toolkit.handler({ message: chatCompletionMessage });
```

Key differences:

- `new Toolkit()` becomes `openkit.openai()`
- `toolkit.openai()` becomes `toolkit.tools()`

### Step 5: Add New Features (Optional)

#### Middleware

Add authentication, logging, or other cross-cutting concerns:

```typescript
// Define middleware
const authMiddleware = async (context, next) => {
  if (!context.apiKey) {
    throw new Error("API key required");
  }
  return next();
};

// Use middleware in your tool
const weatherTool = openkit
  .tool({
    name: "Weather",
    description: "Get weather information",
  })
  .use(authMiddleware)
  .input(weatherSchema)
  .handler(async ({ input, context }) => {
    // Access context populated by middleware
    console.log(`Authenticated user: ${context.user.id}`);
    // Handle request
  });
```

#### Direct Invocation

Test your tools directly without going through OpenAI:

```typescript
// For single-capability tools
const result = await weatherTool.run().handler({
  input: { location: "San Francisco" },
  context: { apiKey: "valid-key" },
});

// For multi-capability tools
const result = await multiCapabilityTool.run("Greet").handler({
  input: { name: "World" },
  context: {},
});
```

## Compatibility Notes

- The v0.x API remains fully functional in v1.0
- Tools created with either API can be used together
- The OpenAI adapter accepts both types of tools
- Future releases may deprecate the v0.x API

## Common Issues

### Handler Signature

The handler function now receives an object with `input` and `context` properties:

```typescript
// v0.x
runner: async (params) => {
  /* use params directly */
};

// v1.x
handler: async ({ input, context }) => {
  /* use input and context */
};
```

### Type Safety

Ensure your TypeScript version is up to date to benefit from the enhanced type inference:

```typescript
// With type inference
.input(z.object({ query: z.string() }))
.handler(async ({ input }) => {
  // input.query is typed as string
  return { result: input.query.toUpperCase() };
})
```

### Context is Optional

When invoking tools directly, the context object is optional:

```typescript
// With context
await tool.run().handler({
  input: { ... },
  context: { ... }
});

// Without context
await tool.run().handler({
  input: { ... }
});
```

## Example Migration

For complete examples of migrated code, see:

- `examples/v0-api.ts` - Original class-based API
- `examples/new-api.ts` - New fluent builder API
