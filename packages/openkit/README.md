# OpenKit SDK

OpenKit SDK enables developers to build headless apps for AI agents.

## Installation

```bash
npm install @opkt/openkit
# or
pnpm add @opkt/openkit
# or
yarn add @opkt/openkit
```

## Quick Start

### Creating an App with a Route

Every app in OpenKit must have at least one route:

```typescript
import { z } from "zod";
import openkit from "@opkt/openkit";

// Create an app
const timeApp = openkit.app({
  name: "CurrentTime",
  description: "An app that returns the current time",
});

// Add a route to the app
timeApp
  .route({
    name: "Get",
    description: "Get the current time",
  })
  .input(
    z.object({
      timezone: z
        .string()
        .optional()
        .describe("Optional timezone (defaults to UTC)"),
    }),
  )
  .handler(async ({ input }) => {
    const now = new Date();
    let timeString;

    if (input.timezone) {
      try {
        timeString = now.toLocaleString("en-US", { timeZone: input.timezone });
      } catch (e) {
        timeString = now.toISOString();
      }
    } else {
      timeString = now.toISOString();
    }

    return {
      currentTime: timeString,
      timestamp: now.getTime(),
    };
  });

// Execute the route
const result = await timeApp.run("Get").handler({
  input: { timezone: "America/New_York" },
});

console.log(result);
// Output: { currentTime: "5/16/2024, 10:30:45 AM", timestamp: 1716024645000 }
```

### Multi-Route App

Create an app with multiple routes:

```typescript
import { z } from "zod";
import openkit from "@opkt/openkit";
import axios from "axios";

// Define the Pokemon app with multiple routes
const pokemonApp = openkit
  .app({
    name: "Pokemon",
    description: "App for working with Pokemon data from PokeAPI",
  })
  .context({
    apiBaseUrl: "https://pokeapi.co/api/v2",
  })
  // Capture route
  .route({
    name: "Capture",
    description: "Capture a random Pokemon",
  })
  .input(
    z.object({
      id: z
        .number()
        .int()
        .min(1)
        .max(1025)
        .optional()
        .describe("Optional Pokemon ID to capture"),
    }),
  )
  .handler(async ({ input, context }) => {
    const pokemonId = input.id || Math.floor(Math.random() * 1025) + 1;
    const response = await axios.get(
      `${context.apiBaseUrl}/pokemon/${pokemonId}`,
    );
    return response.data;
  })
  // Location route
  .route({
    name: "Location",
    description: "Get information about Pokemon locations",
  })
  .input(
    z.object({
      region: z.string().describe("The region to get location information for"),
    }),
  )
  .handler(async ({ input, context }) => {
    const response = await axios.get(
      `${context.apiBaseUrl}/location/${input.region}`,
    );
    return response.data;
  });

// Execute routes
const captureResult = await pokemonApp.run("Capture").handler({
  input: { id: 25 }, // Pikachu
});

const locationResult = await pokemonApp.run("Location").handler({
  input: { region: "kanto" },
});
```

## Using with OpenAI

OpenKit apps can be easily used with the OpenAI API:

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
  messages: [{ role: "user", content: "Can you help me use this tool?" }],
  tools: oai.tools(),
});

// Handle any tool calls
if (response.choices[0].message.tool_calls) {
  const toolResults = await oai.handler({ chatCompletion: response });

  // Send the results back to continue the conversation
  const continuedResponse = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      { role: "user", content: "Can you help me use this tool?" },
      response.choices[0].message,
      ...toolResults,
    ],
  });

  console.log(continuedResponse.choices[0].message.content);
}
```

## Key Concepts

- **App**: The top-level container for your functionality.
- **Routes**: Every app contains at least one route, which represents a specific function.
- **Context**: Shared data and dependencies for your routes.
- **Middleware**: Functions that can modify the input, output, or execution flow.

## For more information

Visit [openkit.fun](https://openkit.fun) to learn more about OpenKit and discover other apps built by the community.
