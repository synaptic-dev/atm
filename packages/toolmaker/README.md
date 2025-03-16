# @opkt/toolmaker

OpenKit Toolmaker provides a type-safe way to define agent tools using Zod schemas and TypeScript.

## Installation

```bash
npm install @opkt/toolmaker
```

## Quick Start

### Single-Capability Tool

The simplest way to create a tool with a single capability:

```typescript
import { z } from 'zod';
import { Tool } from '@opkt/toolmaker';

// Define a single-capability tool directly
const greetingTool = new Tool({
  name: 'Greeting',
  description: 'A simple greeting tool',
  schema: z.object({
    name: z.string().describe("Name of the person to greet")
  }),
  runner: async (params) => {
    return {
      message: `Hello, ${params.name}!`,
      timestamp: new Date().toISOString()
    };
  }
});

export default greetingTool;
```

### Multi-Capability Tool

For tools with multiple capabilities:

```typescript
import { z } from 'zod';
import { Tool, ToolCapability } from '@opkt/toolmaker';

// Define your input schema
const greetSchema = z.object({
  name: z.string().describe("Name of the person to greet")
}).describe("Parameters for greeting");

// Create capability instances
const greetCapability = new ToolCapability({
  name: 'Greet',
  description: 'Greets a person by name',
  schema: greetSchema,
  runner: async (params) => {
    return {
      message: `Hello, ${params.name}!`,
      timestamp: new Date().toISOString()
    };
  }
});

const farewellCapability = new ToolCapability({
  name: 'Farewell',
  description: 'Says goodbye to a person',
  schema: greetSchema, // reusing the same schema
  runner: async (params) => {
    return {
      message: `Goodbye, ${params.name}!`,
      timestamp: new Date().toISOString()
    };
  }
});

// Create a multi-capability tool with all capabilities
const multiCapabilityTool = new Tool({
  name: 'Hello World',
  description: 'A simple tool with greeting capabilities',
  capabilities: [greetCapability, farewellCapability]
});

export default multiCapabilityTool;
```

## Core Concepts

### Tool

The `Tool` class is the main container for your AI tool and supports two patterns:

#### Single-Capability Pattern

```typescript
// Create a tool with a single capability
const singleCapabilityTool = new Tool({
  name: string,             // Display name of your tool
  description: string,      // What your tool does
  schema: ZodType,          // Input parameters schema
  runner: async Function    // Function that executes the capability
});
```

#### Multi-Capability Pattern

```typescript
// Create a tool with multiple capabilities
const multiCapabilityTool = new Tool({
  name: string,              // Display name of your tool
  description: string,       // What your tool does
  capabilities?: ToolCapability[] // Optional array of capabilities
});
```

Methods:
- `getCapabilities()`: Returns all capabilities of the tool
- `getName()`: Returns the tool's name
- `getDescription()`: Returns the tool's description
- `openai()`: Transforms capabilities into OpenAI function format

### ToolCapability

`ToolCapability` represents a specific function your tool can perform:

```typescript
const capability = new ToolCapability({
  name: string,        // Name of the capability
  description: string, // What this capability does
  schema: ZodType,     // Input parameters schema
  runner: Function     // Async function that executes the capability
});
```

Key features:
- Type-safe input validation using Zod schemas
- Automatic JSON Schema generation for AI consumption
- Built-in TypeScript support

### Toolkit

The `Toolkit` class allows you to group multiple tools together:

```typescript
import { Toolkit } from '@opkt/toolmaker';

const toolkit = new Toolkit({
  tools: [tool1, tool2, tool3] // Array of Tool instances
});
```

Methods:
- `openai()`: Transforms all tool capabilities into OpenAI function format
- `handler(params)`: Handles and processes tool calls from OpenAI
- `getTools()`: Returns all tools in the toolkit
- `addTool(tool)`: Add a new tool to the toolkit

Processing tool calls:
```typescript
// Process a single message with tool calls
const toolResponses = await toolkit.handler({ 
  message: chatCompletionMessage 
});

// Or process a ChatCompletion object
const toolResponses = await toolkit.handler({ 
  chatCompletion: chatCompletionObject 
});
```

## Naming Conventions

When your tools are used with AI systems like OpenAI:

- **Single-capability tools**: Function names are formatted as just `tool_name` in snake_case
- **Multi-capability tools**: Function names are formatted as `tool_name-capability_name` in snake_case
- Spaces in names are replaced with underscores
- The handler method parses these function names to locate and execute the right capability

## Best Practices

1. **Tool Design**
   - Use the single-capability pattern for simple tools with one function
   - Use the multi-capability pattern for complex tools with multiple related functions
   - Set all capabilities at construction time

2. **Schema Design**
   - Use descriptive names for schema properties
   - Add descriptions using `.describe()` for better AI understanding
   - Keep schemas focused and single-purpose

3. **Runner Implementation**
   - Handle errors gracefully
   - Return structured data
   - Keep functions pure and side-effect free when possible

## Directory Structure

Recommended structure for your tool:

```
your-tool/
├── src/
│   ├── capabilities/
│   │   └── greet/
│   │       ├── schema.ts      # Input schema definition
│   │       └── runner.ts      # Capability implementation
│   └── index.ts              # Tool export
```

## TypeScript Support

Toolmaker is written in TypeScript and provides full type definitions. You get:
- Type inference for schemas
- Autocomplete for tool and capability options
- Type checking for runner functions

## Building and Sharing

Once you've created your tool, you can share it through the OpenKit CLI:

```bash
npm install -g @opkt/cli
```

1. First, authenticate with OpenKit:
```bash
openkit login
```

2. Build your tool:
```bash
openkit build
```

3. Publish to OpenKit:
```bash
openkit publish
```

After publishing, you'll receive a URL where you can view your tool on OpenKit. Other developers and AI agents can discover and use your tool through the OpenKit platform.

## License

MIT 