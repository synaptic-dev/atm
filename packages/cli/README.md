# OpenKit

OpenKit helps you build, publish, and manage your tools with simple commands. Whether you're building a calculator, a text analyzer, or any other AI capability, OpenKit makes it easy to build and share your tools.

Learn more at [openkit.fun](https://openkit.fun)

## Installation

You'll need two packages:

- `@opkt/cli` - The CLI tool for building and publishing
- `@opkt/openkit` - The SDK for creating tools

```bash
# Install the CLI globally
npm install -g @opkt/cli

# Install the toolmaker in your project
npm install @opkt/openkit
```

## Usage

### Login

Before using OpenKit commands, you need to authenticate:

```bash
openkit login
```

This will open your browser for authentication. After successful login, your credentials will be saved locally.

### Building a Tool

#### Manual Creation with OpenKit

The `@opkt/openkit` package provides two main classes for creating tools:

1. `Tool` - The main class that represents your tool:

   - `name`: The display name of your tool
   - `description`: A clear description of what your tool does
   - `addCapability()`: Method to add capabilities to your tool

2. `ToolCapability` - Represents a specific function your tool can perform:
   - `name`: Name of the capability
   - `description`: What this capability does
   - `schema`: Input parameters schema using Zod
   - `runner`: Async function that executes the capability

Here's a complete example of manually creating a tool:

```typescript
import OpenKit from "@opkt/openkit";
import { Tool, ToolCapability } from "@opkt/openkit";
import { z } from "zod";

// 1. Define your input schema using Zod
const greetSchema = z
  .object({
    name: z.string().describe("Name of the person to greet"),
  })
  .describe("Parameters for greeting");

// 2. Create a capability
export const greetCapability = new ToolCapability({
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

// 3. Create your tool
const tool = new Tool({
  name: "Hello World",
  description: "A simple tool to demonstrate OpenKit capabilities",
});

// 4. Add capabilities to your tool
tool.addCapability(greetCapability);

export default tool;
```

Your tool should follow this directory structure:

```
your-tool/
├── src/
│   ├── capabilities/
│   │   └── greet/
│   │       ├── schema.ts      # Contains your Zod schema
│   │       └── runner.ts      # Contains the runner function
│   └── index.ts              # Exports your tool
```

#### Quick Start with Template

For a faster setup, you can use our hello-world template:

```bash
openkit init
```

This will create a new directory with a pre-configured tool structure and example capability.

### Publishing a Tool

To publish a tool to OpenKit:

1. First, build your tool:

```bash
openkit build
```

2. Then publish it:

```bash
openkit publish
```

The tool will be published to OpenKit and you'll receive a URL where you can view your published tool.

## Commands

- `openkit login` - Authenticate with OpenKit
- `openkit init` - Create a new tool from template
- `openkit build` - Build your tool for publishing
- `openkit publish` - Publish your tool to OpenKit
