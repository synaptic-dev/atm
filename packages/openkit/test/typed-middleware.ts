import { AppBuilder } from "../src/builders/app-builder";
import { NextFunction } from "../src/builders/types";

// Types for our middleware contexts
interface AuthContext extends Record<string, unknown> {
  auth: {
    user: {
      id: string;
      name: string;
    };
  };
}

interface EnrichedContext extends Record<string, unknown> {
  enriched: {
    timestamp: number;
    userId: string;
  };
}

// Authentication middleware
async function authMiddleware(context: any, next: NextFunction) {
  const auth = {
    user: { id: "123", name: "Test User" },
  };

  return next({
    context: {
      auth,
    },
  });
}

// Enrichment middleware that uses auth data
async function enrichMiddleware(
  context: AuthContext, // Must have auth data
  next: NextFunction,
) {
  // TypeScript knows auth exists and its structure
  const userId = context.auth.user.id;

  return next({
    context: {
      enriched: {
        timestamp: Date.now(),
        userId,
      },
    },
  });
}

// Create app
const app = new AppBuilder({
  name: "TypedApp",
  description: "App with typed middleware",
});

// Create route with typed middleware chain
const route = app
  .route({
    name: "Test",
    path: "/test",
  })
  // First middleware adds auth context
  .use<AuthContext>(authMiddleware)
  // Second middleware adds enriched context and can access auth
  .use<EnrichedContext>(enrichMiddleware)
  // Handler has access to all accumulated context
  .handler(async ({ context }) => {
    // TypeScript should know both these properties exist with correct types
    const userName = context.auth.user.name;
    const timestamp = context.enriched.timestamp;

    return {
      message: `Hello ${userName} at ${timestamp}`,
    };
  });

// This would be a type error if context types weren't flowing correctly
// Type checking happens at compile time
