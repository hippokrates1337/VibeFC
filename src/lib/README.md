# Lib Directory

This directory contains utility functions, helpers, API clients, state management stores, and shared logic used throughout the application.

## Structure

- **`/api/`**: API integration services for communicating with the backend (See `api/README.md`)
- **`/store/`**: State management using Zustand stores (See `store/README.md`)
- **`/utils/`**: Utility functions and helpers (See `utils/README.md`)
- **`/services/`**: Business logic services for specific domains
- **`utils.ts`**: Common utility functions (className merging with Tailwind)
- **`api-client.ts`**: Organization API client for frontend-to-backend communication
- **`supabase.ts`**: Supabase client configuration and database types
- **`/__tests__/`**: Test files for lib modules

## Key Files

### `utils.ts`
Contains the `cn()` utility function for merging CSS class names using clsx and tailwind-merge. Essential for conditional styling in components.

```typescript
import { cn } from '@/lib/utils';

// Combine classes with Tailwind conflict resolution
const className = cn("text-red-500", condition && "text-blue-500", "font-bold");
```

### `api-client.ts`
Provides the `organizationApi` object with methods for organization CRUD operations and member management. Uses the frontend API routes (`/api/*`) rather than direct backend communication.

**Available Methods:**
- Organization management: `getOrganizations`, `createOrganization`, `updateOrganization`, `deleteOrganization`
- Member management: `getMembers`, `addMember`, `updateMemberRole`, `removeMember`

### `supabase.ts`
Configures the Supabase client for authentication and database operations. Includes TypeScript interfaces for `Organization` and `OrganizationMember`.

## Guidelines

1. **Single Responsibility**: Keep utility functions focused on a single task
2. **Type Safety**: Use TypeScript for all functions with proper type definitions
3. **No Side Effects**: Avoid side effects in utility functions
4. **Documentation**: Document complex utilities with JSDoc comments
5. **Test Coverage**: Maintain test coverage for all utility functions

## API Architecture

The lib directory contains API clients for different purposes:
- **`api-client.ts`**: Organization management via Next.js API routes
- **`/api/forecast.ts`**: Direct forecast operations with backend
- **`/api/forecast-calculation.ts`**: Forecast calculation operations

All use cookie-based authentication with consistent error handling patterns. 