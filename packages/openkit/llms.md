# OpenKit for LLMs: Creating Headless Apps For AI

This guide helps LLMs (like Claude, GPT, etc.) quickly create and use apps with the OpenKit framework. OpenKit is designed for building headless Apps-For-AI that integrate seamlessly with AI systems.

## Quick Start

```typescript
import { z } from "zod";
import openkit from "@opkt/openkit";

// Basic app creation pattern
const weatherApp = openkit
  .app({
    name: "Weather",
    description: "Get weather information",
  })
  .route({
    name: "Forecast",
    description: "Get weather forecast",
    path: "forecast",
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

### 1. App Structure

Every app has these key components:

- **name & description**: Human-readable identifiers for the app
- **routes**: Functions within the app, each with its own path
- **input schema**: Defines and validates parameters using Zod
- **output schema**: Validates handler results using Zod
- **handler**: Function that performs the actual work
- **llm formatter**: Shapes output specifically for LLM consumption

### 2. Creating Multi-Route Apps

When an app needs multiple operations:

```typescript
const emailApp = openkit
  .app({
    name: "Email",
    description: "Email client app",
  })
  // First route
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
  // Second route
  .route({
    name: "Read",
    description: "Read emails",
    path: "read",
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

### 5. Context Sharing

You can share context between routes in an app:

```typescript
const myApp = openkit
  .app({
    name: "MyApp",
    description: "An example app with shared context",
  })
  .context({
    apiBaseUrl: "https://api.example.com",
    apiKey: process.env.API_KEY,
  })
  .route({
    name: "FirstRoute",
    description: "First route using shared context",
    path: "first",
  })
  .handler(async ({ context }) => {
    // Access shared context
    return { url: context.apiBaseUrl };
  });
```

## Best Practices for LLM-Created Apps

1. **Descriptive names and descriptions**: Make apps and routes self-documenting
2. **Thorough input validation**: Use Zod's descriptive methods
3. **Complete output validation**: Enforce consistent return structures
4. **Meaningful error messages**: Help users understand what went wrong
5. **Format outputs thoughtfully**: Use clear, direct language in your `.llm()` formatters
6. **Single responsibility**: Each route should do one thing well

## Complete Example: Search App

```typescript
import { z } from "zod";
import openkit from "@opkt/openkit";

const searchApp = openkit
  .app({
    name: "Search",
    description: "Search for information",
  })
  .route({
    name: "Web",
    description: "Search the web",
    path: "web",
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
  .route({
    name: "Image",
    description: "Search for images",
    path: "image",
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

// Using the app
async function example() {
  const webResults = await searchApp.run("/web").handler({
    input: { query: "climate change", limit: 2 },
  });

  console.log(webResults);
  // Returns a formatted string ready for LLM consumption
}
```

## Integration with AI Systems

When your apps are ready to use:

1. **Direct execution**:

```typescript
const result = await myApp.run("/route-path").handler({
  input: { param: "value" },
});
```

2. **Use with OpenAI**:

```typescript
import { OpenAI } from "openai";
import openkit from "@opkt/openkit";
import myApp from "./my-app";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Create an OpenAI adapter with your app
const oai = openkit.openai({ apps: [myApp] });

// Use the tools in your OpenAI call
const response = await openai.chat.completions.create({
  model: "gpt-4-turbo",
  messages: [{ role: "user", content: "Can you help me use this app?" }],
  tools: oai.tools(),
});

// Handle any tool calls
if (response.choices[0].message.tool_calls) {
  const toolResults = await oai.handler({ chatCompletion: response });

  // Send the results back to continue the conversation
  const continuedResponse = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      { role: "user", content: "Can you help me use this app?" },
      response.choices[0].message,
      ...toolResults,
    ],
  });

  console.log(continuedResponse.choices[0].message.content);
}
```

The integration flow works as follows:

1. Create apps using OpenKit's fluent API
2. Pass apps to the `openkit.openai()` adapter
3. Extract OpenAI function definitions using `oai.tools()`
4. Pass these definitions to the OpenAI API call
5. When OpenAI returns tool calls, process them with `oai.handler()`
6. Send the results back to OpenAI to complete the interaction

## Debugging

Enable debug mode to see detailed logs during development:

```typescript
const app = openkit
  .app({
    name: "MyApp",
    description: "My test app",
  })
  .debug() // Enable debug mode for the app
  .route({
    name: "MyRoute",
    description: "Test route",
    path: "/test",
  })
  .handler(async () => {
    return { status: "ok" };
  })
  .debug(); // Enable debug mode for this specific route
```

## Remember

- **Apps should be focused**: Each app should have a clear purpose
- **Routes should be atomic**: Each route should perform one specific function
- **Validate inputs thoroughly**: Prevent errors before they happen
- **Format outputs objectively**: Use neutral, factual language in the `.llm()` formatter
- **Handle errors gracefully**: Provide clear error details without anthropomorphizing

By following these patterns, you can create robust, user-friendly apps that extend capabilities for any AI system.
