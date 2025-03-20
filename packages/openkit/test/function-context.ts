import { AppBuilder } from "../src/builders/app-builder";

// Types for context
interface UserContext {
  user: {
    id: string;
    name: string;
  };
}

interface AuthContext {
  auth: () => string; // Function type that should be preserved
}

// Create an app with typed context
const app = new AppBuilder<UserContext>()
  .context({
    user: {
      id: "123",
      name: "Test User",
    },
  })
  .route({
    name: "Test Route",
    path: "/test",
  })
  // Add middleware that adds a function to context
  .use<AuthContext>(async (context, next) => {
    return next({
      context: {
        auth: () => "test-token", // Function that returns a string
      },
    });
  })
  // Handler should have access to typed function
  .handler(async ({ context }) => {
    // TypeScript should know auth is a function that returns a string
    const token = context.auth(); // Should be typed as string
    const userName = context.user.name; // Should be typed as string

    return {
      result: `User: ${userName}, Auth: ${token}`,
    };
  });

// This file is for type checking - would show errors if types aren't preserved
