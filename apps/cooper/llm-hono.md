# LLM Pilot Manual - Hono

This manual introduces how to work with a Hono project using the Cloudflare Workers runtime.

## OVERVIEW

Hono is a lightweight, fast web framework designed for edge runtimes like Cloudflare Workers. It offers excellent TypeScript support and a simple, Express-like API with middleware capabilities.

## PROJECT STRUCTURE PRINCIPLES

The goal of this structure is to provide a clear, scalable organization that leverages Hono and Cloudflare Workers features while maintaining good separation of concerns.

### DIRECTORY STRUCTURE

```
project/
├── src/                     # Main source code
│   ├── index.ts             # Entry point for the application
│   ├── routes/              # Route definitions organized by domain
│   │   ├── users.ts         # User-related endpoints
│   │   ├── auth.ts          # Authentication endpoints
│   │   └── index.ts         # Main router aggregator
│   ├── middleware/          # Custom middleware functions
│   │   ├── auth.ts          # Authentication middleware
│   │   ├── cors.ts          # CORS middleware
│   │   └── error-handler.ts # Error handling middleware
│   └── services/            # Services for external integrations
│       ├── cache-service.ts
│       └── supabase/        # Supabase client and related utilities
│           ├── client.ts
│           └── queries.ts
├── helpers/                 # Utility functions and shared code
├── types/                   # TypeScript type definitions
├── public/                  # Static assets (if applicable)
├── test/                    # Test files
├── wrangler.toml            # Cloudflare Workers configuration
├── package.json             # Project dependencies
└── README.md                # Project documentation
```

### NAMING CONVENTIONS

1. **Directories**: Use kebab-case for all directories (e.g., `user-settings/`).

2. **Files**:
   - Use kebab-case for all file names (e.g., `auth-service.ts`, `error-handler.ts`).
   - For index files, use `index.ts`.
   - For test files, use `.test.ts` or `.spec.ts` suffix.

3. **Code**:
   - **Classes**: Use PascalCase (e.g., `UserService`).
   - **Functions/Variables**: Use camelCase (e.g., `getUserById`, `authMiddleware`).
   - **Constants**: Use UPPER_SNAKE_CASE for true constants (e.g., `MAX_RETRY_ATTEMPTS`).
   - **Interfaces/Types**: Use PascalCase with a descriptive name (e.g., `UserRequest`, `ApiResponse`).

## ROUTING PRINCIPLES

- Group routes by domain/feature in separate files.
- Use descriptive route paths that follow REST conventions.
- Define route parameters with descriptive names.

```typescript
// src/routes/users.ts
import { Hono } from 'hono';
import { userService } from '../services/user-service';

const usersRouter = new Hono();

usersRouter.get('/', async (c) => {
  const users = await userService.getAllUsers();
  return c.json(users);
});

usersRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const user = await userService.getUserById(id);
  return c.json(user);
});

usersRouter.post('/', async (c) => {
  const data = await c.req.json();
  const user = await userService.createUser(data);
  return c.json(user, 201);
});

export default usersRouter;
```

## MIDDLEWARE USAGE

- Create reusable middleware in the `middleware/` directory.
- Apply global middleware at the app level.
- Apply specific middleware at the router level.

```typescript
// src/middleware/auth.ts
import { Context, Next } from 'hono';

export const authMiddleware = async (c: Context, next: Next) => {
  const token = c.req.header('Authorization')?.split(' ')[1];
  if (!token) {
    return c.json({ message: 'Unauthorized' }, 401);
  }
  // Validate token
  await next();
};
```

## ENVIRONMENT VARIABLES

- Access environment variables using Cloudflare Workers' `env` object.
- Define types for your environment variables.

```typescript
// src/types/env.ts
export interface Env {
  DATABASE_URL: string;
  API_KEY: string;
  // Other environment variables
}

// src/index.ts
import { Hono } from 'hono';
import { Env } from './types/env';

const app = new Hono<{ Bindings: Env }>();

app.get('/config', (c) => {
  // Access environment variables
  const dbUrl = c.env.DATABASE_URL;
  return c.json({ configured: !!dbUrl });
});
```

## ERROR HANDLING

- Use middleware for centralized error handling.
- Create custom error classes for different error types.
- Return consistent error responses.

## TESTING

- Use Vitest or Jest for unit and integration tests.
- Create mock services for external dependencies.
- Test routes and services separately.

## DEPLOYMENT

- Use Wrangler CLI for local development and deployment.
- Configure `wrangler.toml` for your environment settings.
- Set up CI/CD pipelines for automated deployments.

## DOCUMENTATION

- Document APIs using JSDoc or OpenAPI specifications.
- Include example requests and responses.
- Document environment setup requirements.