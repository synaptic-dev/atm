# OpenKit for LLMs: Creating AI Tools

This guide helps LLMs (like Claude, GPT, etc.) quickly create and use tools with the OpenKit framework. OpenKit is designed for building function-calling tools that integrate seamlessly with AI systems.

## Quick Start

```typescript
import { z } from "zod";
import openkit from "@opkt/openkit";

// Basic tool creation pattern
const weatherTool = openkit
  .tool({
    name: "Weather",
    description: "Get weather information",
  })
  .input(
    z.object({
      location: z.string().describe("City name"),
      units: z.enum(["celsius", "fahrenheit"]).optional(),
    }),
  )
  .output(
    z.object({
      temperature: z.number(),
      conditions: z.string(),
      location: z.string(),
    }),
  )
  .handler(async ({ input }) => {
    // Simulate API call
    return {
      temperature: 72,
      conditions: "sunny",
      location: input.location,
    };
  })
  .llm({
    // Format output for LLM consumption
    success: (result) =>
      `Weather in ${result.location}: ${result.temperature}°F, conditions: ${result.conditions}.`,
    error: (error) => `Weather information retrieval failed: ${error.message}`,
  });
```

## Core Concepts

### 1. Tool Structure

Every tool has these key components:

- **name & description**: Human-readable identifiers
- **input schema**: Defines and validates parameters using Zod
- **output schema**: Validates handler results using Zod
- **handler**: Function that performs the actual work
- **llm formatter**: Shapes output specifically for LLM consumption

### 2. Creating Multi-Capability Tools

When a tool needs multiple operations:

```typescript
const emailTool = openkit
  .tool({
    name: "Email",
    description: "Email client",
  })
  // First capability
  .capability({
    name: "Send",
    description: "Send an email",
  })
  .input(
    z.object({
      to: z.string().email(),
      subject: z.string(),
      body: z.string(),
    }),
  )
  .output(
    z.object({
      sent: z.boolean(),
      messageId: z.string(),
    }),
  )
  .handler(async ({ input }) => {
    return { sent: true, messageId: "msg-123" };
  })
  .llm({
    success: () => "Email sent successfully. Message ID: msg-123",
    error: (err) => `Email sending failed: ${err.message}`,
  })
  // Second capability
  .capability({
    name: "Read",
    description: "Read emails",
  })
  .input(
    z.object({
      folder: z.string().default("inbox"),
    }),
  )
  .output(
    z.object({
      messages: z.array(
        z.object({
          subject: z.string(),
          from: z.string(),
        }),
      ),
    }),
  )
  .handler(async ({ input }) => {
    return { messages: [{ subject: "Hello", from: "user@example.com" }] };
  })
  .llm({
    success: (result, input) =>
      `${result.messages.length} message(s) found in ${input.folder} folder`,
  });
```

### 3. LLM Output Formatting

The `.llm()` method is specifically designed for LLMs:

```typescript
.llm({
  // Format successful results for LLM consumption
  success: (result, input, context) => {
    return `Calculation result: ${result.value}`;
  },

  // Format errors for LLM consumption
  error: (error, input, context) => {
    return `Operation failed: ${error.message}`;
  }
})
```

This ensures outputs are structured in a way that's optimal for LLM consumption and reasoning.

### 4. Input and Output Validation

Both input and output validation use Zod schemas:

```typescript
// Input validation ensures the parameters are correct
.input(
  z.object({
    query: z.string(),
    limit: z.number().int().min(1).max(10).default(3)
  })
)

// Output validation ensures the handler returns expected data
.output(
  z.object({
    results: z.array(z.object({
      id: z.string(),
      value: z.number()
    })),
    count: z.number()
  })
)
```

If validation fails:

- Input validation failures prevent the handler from executing
- Output validation failures are caught and can be formatted using the `.llm()` error formatter

## Best Practices for LLM-Created Tools

1. **Descriptive names and descriptions**: Make tools self-documenting
2. **Thorough input validation**: Use Zod's descriptive methods
3. **Complete output validation**: Enforce consistent return structures
4. **Meaningful error messages**: Help users understand what went wrong
5. **Format outputs thoughtfully**: Use clear, direct language in your `.llm()` formatters
6. **Single responsibility**: Each tool/capability should do one thing well

## Complete Example: Search Tool

```typescript
import { z } from "zod";
import openkit from "@opkt/openkit";

const searchTool = openkit
  .tool({
    name: "Search",
    description: "Search for information",
  })
  .capability({
    name: "Web",
    description: "Search the web",
  })
  .input(
    z.object({
      query: z.string().describe("Search query"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(10)
        .default(3)
        .describe("Number of results"),
    }),
  )
  .output(
    z.object({
      results: z.array(
        z.object({
          title: z.string(),
          url: z.string().url(),
          snippet: z.string(),
        }),
      ),
      total: z.number().int().min(0),
    }),
  )
  .handler(async ({ input }) => {
    // Simulate web search
    const results = [
      {
        title: "Result 1",
        url: "https://example.com/1",
        snippet: "Example content 1",
      },
      {
        title: "Result 2",
        url: "https://example.com/2",
        snippet: "Example content 2",
      },
      {
        title: "Result 3",
        url: "https://example.com/3",
        snippet: "Example content 3",
      },
    ].slice(0, input.limit);

    return { results, total: results.length };
  })
  .llm({
    success: (result, input) => {
      if (result.total === 0) {
        return `No results found for query: "${input.query}"`;
      }

      let response = `Search results for "${input.query}" (${result.total} found):\n\n`;

      result.results.forEach((item, index) => {
        response += `${index + 1}. ${item.title}\n`;
        response += `   URL: ${item.url}\n`;
        response += `   ${item.snippet}\n\n`;
      });

      return response;
    },
    error: (error) => `Search operation failed: ${error.message}`,
  })
  .capability({
    name: "Image",
    description: "Search for images",
  })
  .input(
    z.object({
      query: z.string().describe("Image search query"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(5)
        .default(2)
        .describe("Number of image results"),
    }),
  )
  .output(
    z.object({
      images: z.array(
        z.object({
          title: z.string(),
          url: z.string().url(),
        }),
      ),
    }),
  )
  .handler(async ({ input }) => {
    // Simulate image search
    return {
      images: [
        { title: "Image 1", url: "https://example.com/img1.jpg" },
        { title: "Image 2", url: "https://example.com/img2.jpg" },
      ].slice(0, input.limit),
    };
  })
  .llm({
    success: (result, input) => {
      const imageCount = result.images.length;
      let response = `Image search results for "${input.query}" (${imageCount} found):\n\n`;

      result.images.forEach((img, i) => {
        response += `${i + 1}. ${img.title}: ${img.url}\n`;
      });

      return response;
    },
  });

// Using the tool
async function example() {
  const webResults = await searchTool.run("Web").handler({
    input: { query: "climate change", limit: 2 },
  });

  console.log(webResults);
  // Returns a formatted string ready for LLM consumption
}
```

## Integration with AI Systems

When your tools are ready to use:

1. **Direct execution**:

```typescript
const result = await myTool.run().handler({
  input: { param: "value" },
});
```

2. **Use with OpenAI**:

```typescript
// Create an OpenKit adapter for your tools
const toolkit = openkit.openai({
  tools: [weatherTool, emailTool],
});

// Get OpenAI function definitions to pass to the API
const functions = toolkit.tools();

// Example: Setting up OpenAI client
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

// Using chat completions (OpenAI Node SDK v4+)
const chatCompletion = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "What's the weather like in Paris today?" },
  ],
  tools: functions,
});

const newMessages = await toolkit.handler({
  chatCompletion: chatCompletion,
});

// Continue the conversation with tool results
const finalResponse = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: newMessages,
});

console.log(finalResponse.choices[0].message.content);
```

The integration flow works as follows:

1. Create tools using OpenKit's fluent API
2. Pass tools to the `openkit.openai()` adapter
3. Extract OpenAI function definitions using `toolkit.tools()`
4. Pass these definitions to the OpenAI API call
5. When OpenAI returns tool calls, process them with `toolkit.handler()`
6. Send the results back to OpenAI to complete the interaction

This approach works with both the OpenAI Chat Completions API.

## Remember

- **Tools should be atomic**: Focus on one specific capability
- **Validate inputs thoroughly**: Prevent errors before they happen
- **Format outputs objectively**: Use neutral, factual language in the `.llm()` formatter
- **Handle errors gracefully**: Provide clear error details without anthropomorphizing

By following these patterns, you can create robust, user-friendly tools that extend capabilities for any AI system.
