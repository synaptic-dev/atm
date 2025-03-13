# ATM By Synaptic

ATM is a platform for creating, sharing, and discovering tools for your AI agents. It consists of three main components:

## 🛠️ Agent Tool Maker

```bash
npm install @synaptic-ai/toolmaker
```

Create powerful AI tools with type safety and ease:

- **Type-safe Development**: Build tools using TypeScript and Zod schemas
- **Capability-based Design**: Define clear inputs and outputs for AI consumption

```typescript
import { Tool, ToolCapability } from '@synaptic-ai/toolmaker';
import { z } from 'zod';

// Define a capability with type-safe schema
const greetCapability = new ToolCapability({
  name: 'Greet',
  description: 'Greets a person by name',
  schema: z.object({
    name: z.string().describe("Name to greet")
  }),
  runner: async ({ name }) => ({
    message: `Hello, ${name}!`
  })
});
```

## 📦 Agent Tool Manager

```bash
npm install -g @synaptic-ai/atm
```

Build and share your tools:

- **Easy Integration**: `atm build` produces a schema and runner that can be easily integrated with OpenAI SDK.
- **Simple Publishing**: Build and publish with a few commands

```bash
# Build and publish your tool
atm build
atm publish
```

## 🏪 Agent Tool Marketplace

Visit [try-synaptic.ai/atm](https://try-synaptic.ai/atm)

Discover and use tools built by the community:

- **Tool Discovery**: Browse and search for tools by capability

## Getting Started

1. Install the required packages:
```bash
# Install the CLI globally
npm install -g @synaptic-ai/atm

# Install the toolmaker in your project
npm install @synaptic-ai/toolmaker
```

2. Create a new tool:
```bash
atm init
```

3. Build and publish:
```bash
atm build
atm publish
```

## License

MIT

## TODO

### Website
- [ ] Set up the Next.js frontend project structure.
- [ ] Implement the homepage with an overview of available tools.
- [ ] Define clear API contract for tool listing and publishing.
- [ ] Integrate cloud-based execution via Synaptic.
- [ ] Implement execution history and performance analytics.
- [ ] Ensure seamless browser-based authentication for CLI.
- [ ] Streamline the tool creation and publishing process.
- [ ] Provide comprehensive documentation and examples.
- [ ] Set up automated testing for frontend and CLI.
- [ ] Implement continuous integration and deployment pipelines.

### CLI
- [ ] Ensure the `atm login` command works seamlessly with browser-based authentication.
- [ ] Enhance CLI to support complex tool creation scenarios.
- [ ] Improve error handling and validation during the build process.
- [ ] Streamline the `atm build` and `atm publish` commands.
- [ ] Expand documentation with more examples and troubleshooting guides.
- [ ] Provide templates or scaffolding commands for quicker tool setup.
- [ ] Set up automated testing for CLI.
- [ ] Implement continuous integration and deployment pipelines.
