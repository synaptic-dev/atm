# @synaptic-ai/toolmaker

A powerful SDK for creating and managing AI tools. Toolmaker provides a type-safe way to define tool capabilities using Zod schemas and TypeScript.

## Installation

```bash
npm install @synaptic-ai/toolmaker
```

You'll also need the ATM CLI to build and publish your tools:

```bash
npm install -g @synaptic-ai/atm
```

## Quick Start

Here's a simple example of creating a tool with a greeting capability:

```typescript
import { Tool, ToolCapability } from '@synaptic-ai/toolmaker';
import { z } from 'zod';

// Define your input schema
const greetSchema = z.object({
  name: z.string().describe("Name of the person to greet")
}).describe("Parameters for greeting");

// Create a capability
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

// Create and export your tool
const tool = new Tool({
  name: 'Hello World',
  description: 'A simple tool to demonstrate ATM capabilities'
});

tool.addCapability(greetCapability);
export default tool;
```

## Core Concepts

### Tool

The `Tool` class is the main container for your AI tool:

```typescript
const tool = new Tool({
  name: string;        // Display name of your tool
  description: string; // What your tool does
});
```

Methods:
- `addCapability(capability: ToolCapability)`: Add a new capability to your tool

### ToolCapability

`ToolCapability` represents a specific function your tool can perform:

```typescript
const capability = new ToolCapability({
  name: string;        // Name of the capability
  description: string; // What this capability does
  schema: ZodType;     // Input parameters schema
  runner: Function;    // Async function that executes the capability
});
```

Key features:
- Type-safe input validation using Zod schemas
- Automatic JSON Schema generation for AI consumption
- Built-in TypeScript support

## Best Practices

1. **Schema Design**
   - Use descriptive names for schema properties
   - Add descriptions using `.describe()` for better AI understanding
   - Keep schemas focused and single-purpose

2. **Runner Implementation**
   - Handle errors gracefully
   - Return structured data
   - Keep functions pure and side-effect free when possible

3. **Tool Organization**
   - One capability per file
   - Group related capabilities in directories
   - Export tools from index.ts

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

Once you've created your tool, you can share it with the AI community through ATM:

1. First, authenticate with ATM:
```bash
atm login
```

2. Build your tool:
```bash
atm build
```

3. Publish to ATM:
```bash
atm publish
```

After publishing, you'll receive a URL where you can view your tool on ATM. Other developers and AI agents can discover and use your tool through the ATM platform.

## License

MIT 