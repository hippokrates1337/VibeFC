# Lib Directory

This directory contains utility functions, helpers, API clients, state management stores, and shared logic used throughout the application.

## Structure

- `/api/`: API integration services for communicating with the backend (See `api/README.md`)
- `/store/`: State management using Zustand stores (See `store/README.md`)
- `/utils/`: Utility functions and helpers
  - `logger.ts`: Development-only logging utility
- `utils.ts`: Common utility functions (className merging with Tailwind)
- `api-client.ts`: Organization API client for frontend-to-backend communication
- `supabase.ts`: Supabase client configuration and database types
- `/__tests__/`: Test files for lib modules

## Key Files

### `utils.ts`
Contains the `cn()` utility function for merging CSS class names using clsx and tailwind-merge. Essential for conditional styling in components.

### `api-client.ts`
Provides the `organizationApi` object with methods for organization CRUD operations and member management. Uses the frontend API routes (`/api/*`) rather than direct backend communication.

### `supabase.ts`
Configures the Supabase client for authentication and database operations. Includes TypeScript interfaces for `Organization` and `OrganizationMember`.

### `utils/logger.ts`
Development-only logging utility that conditionally logs messages based on the environment. Provides `log`, `error`, `warn`, and `info` methods.

## Guidelines

1. Keep utility functions small and focused on a single task
2. Use TypeScript for all utility functions with proper type definitions
3. Avoid side effects in utility functions
4. Document complex utilities with JSDoc comments
5. Maintain test coverage for all utility functions

## Adding New Utilities

When adding new utilities:
1. Consider if it belongs in an existing file or needs a new one
2. Avoid duplicating functionality that might exist in libraries or elsewhere in the codebase
3. Write tests for your utilities in the `/__tests__` directory
4. Export utilities as named exports
5. Use descriptive function names that explain what the utility does

## API Architecture

The lib directory contains two types of API clients:
- **`api-client.ts`**: For frontend-to-backend communication via Next.js API routes
- **`/api/forecast.ts`**: For direct backend communication (forecast operations)

Both use similar authentication patterns but target different endpoints based on the operation type. 