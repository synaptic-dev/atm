# Cooper

Cooper is a Cloudflare Workers-based API service for managing TypeScript-based tools and capabilities.

## Project Structure

The project follows a modular architecture based on Hono framework:

```
cooper/
├── src/                     # Main source code
│   ├── index.ts             # Entry point for the application
│   ├── routes/              # Route definitions organized by domain
│   │   ├── base.ts          # Base endpoints
│   │   ├── files.ts         # File-related endpoints
│   │   ├── upload.ts        # Upload-related endpoints
│   │   └── index.ts         # Main router aggregator
│   ├── middleware/          # Custom middleware functions
│   │   ├── cors.ts          # CORS middleware
│   │   ├── error-handler.ts # Error handling middleware
│   │   └── index.ts         # Middleware exports
│   ├── services/            # Services for external integrations
│   │   ├── supabase/        # Supabase client and related utilities
│   │   │   └── client.ts    # Supabase client
│   │   └── index.ts         # Services exports
│   ├── lib/                 # Library code
│   │   ├── helpers/         # Utility functions and shared code
│   │   │   ├── archive-helpers.ts # Archive-related utility functions
│   │   │   └── index.ts     # Helpers exports
│   │   └── index.ts         # Library exports
│   └── types/               # TypeScript type definitions
│       └── env.ts           # Environment variable types
├── wrangler.jsonc           # Cloudflare Workers configuration
├── package.json             # Project dependencies
└── README.md                # Project documentation
```

## Features

- File upload and retrieval via R2 storage
- Support for single-capability and multi-capability tools
- Tool metadata storage in Supabase
- TAR/GZIP archive processing
- Authentication via Supabase

## Routes

- `GET /` - Hello world endpoint
- `GET /:userId/:filename` - Retrieve a file from storage
- `POST /upload` - Upload a tool archive
- `POST /debug-archive` - Debug tool for examining archive contents

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev
```

## Deployment

```bash
# Deploy to Cloudflare Workers
pnpm run deploy
```

## Environment Variables

- `SUPABASE_URL` - Supabase instance URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `test_r2` - R2 bucket binding (defined in wrangler.toml)
