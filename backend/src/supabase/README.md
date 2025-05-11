# Supabase Module (`backend/src/supabase`)

## Overview
This module provides a request-scoped `SupabaseService` for interacting with the Supabase database. Crucially, it initializes the Supabase client by primarily using the authenticated user's JWT from the `Authorization` header, ensuring that database operations automatically respect Row Level Security (RLS) policies.

It also includes special handling for test environments and an "admin mode," where it can utilize the `SUPABASE_SERVICE_ROLE_KEY` for broader access while still attempting to set a specific user context for RLS using a custom RPC call.

## Architecture

- **`supabase.module.ts`**: Defines the NestJS module, exporting `SupabaseService`.
- **`supabase.service.ts`**:
  - Defined with `Scope.REQUEST` to ensure a new instance is created for each incoming request.
  - Injects the standard NestJS `REQUEST` object and `ConfigService`.
  - Provides a `client` getter that lazily initializes a `SupabaseClient` instance per request.
  - **Client Initialization**:
    - The client is created using `SUPABASE_URL` and a key determined by the operating mode:
      - **Standard Mode**: Uses `SUPABASE_ANON_KEY` and the user's JWT from the `Authorization: Bearer <token>` header. All operations are performed *as the authenticated user*.
      - **Test Mode (`IS_TEST_ENVIRONMENT=true`)**: May use `SUPABASE_SERVICE_ROLE_KEY` if available, otherwise `SUPABASE_ANON_KEY`. It attempts to use the JWT from the header if present. If `request.user.userId` is available (e.g., from a mock guard in tests), it may call `setAuthContext` to establish RLS for that user.
      - **Admin Mode (`SUPABASE_ADMIN_MODE=true`)**: Always uses `SUPABASE_SERVICE_ROLE_KEY`. It bypasses JWT validation for the client connection itself but uses `setAuthContext` with `request.user.userId` (if available) to set the RLS user context. This allows admin operations to be performed with elevated privileges while still respecting RLS as if a specific user is acting.
  - **RLS Context Setting (`setAuthContext` and `set_auth_user_id` RPC)**:
    - The service includes a private `setAuthContext(userId: string)` method.
    - This method calls a custom PostgreSQL RPC function named `set_auth_user_id` in your Supabase database.
    - The purpose of this RPC call is to set the `auth.uid()` (or an equivalent session variable) for the current database transaction/connection. This is crucial in test/admin modes where the connection might be established with a service role key, but RLS policies still need to operate based on a specific application user's ID.
  - **User Information**: The service attempts to access user information (especially `userId`) from `request.user`, which should be populated by an upstream authentication guard.
  - **No Service Role Key in Standard Operations**: In its default operational mode (not test or admin mode), the client uses the **anon key** combined with the user's JWT.

- **Authentication Guard (e.g., `JwtAuthGuard`)**: 
  - While not part of this module, a guard running *before* this service is instantiated in the request lifecycle is responsible for validating the incoming JWT.
  - The guard typically validates the token (e.g., using `supabase.auth.getUser(token)` with a separate, temporary client or a library like `jsonwebtoken`) and might attach user information to `request.user`.
  - `SupabaseService` relies on the `Authorization` header being present and valid but doesn't perform the validation itself.

## Configuration

Requires the following environment variables to be set:
- `SUPABASE_URL`: Your Supabase project URL.
- `SUPABASE_ANON_KEY`: Your Supabase **public anon key**.
- `SUPABASE_SERVICE_ROLE_KEY`: (Optional but recommended for test/admin modes) Your Supabase **service role key** (secret).
- `IS_TEST_ENVIRONMENT`: (Optional) Set to `true` to enable test mode specific behaviors.
- `SUPABASE_ADMIN_MODE`: (Optional) Set to `true` to enable admin mode, which uses the service role key and attempts to set RLS user context.

## Usage

To use the user-authenticated Supabase client in another module:
1. Ensure `SupabaseModule` is imported into the feature module where you need database access.
2. Ensure your controller endpoint is protected by an authentication guard (like `JwtAuthGuard`) that validates the `Authorization: Bearer` token.
3. Inject the request-scoped `SupabaseService` into your service's constructor.
4. Access the user-specific, RLS-aware client via `this.supabaseService.client`.

```typescript
// Example in another service (e.g., items.service.ts)
import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ItemsService {
  // SupabaseService is injected thanks to module imports
  constructor(private readonly supabaseService: SupabaseService) {}

  async fetchItemsForUser() {
    // The client getter initializes the client with the request's JWT
    const { data, error } = await this.supabaseService.client
      .from('items') // RLS policy: "items" table allows SELECT for authenticated users on their own items
      .select('*');

    if (error) {
      // Handle potential errors (e.g., network issues, unexpected Supabase errors)
      // RLS errors might manifest differently (e.g., empty data array rather than explicit error)
      console.error('Error fetching items:', error);
      throw new Error('Could not fetch items.');
    }
    
    // RLS is applied automatically by Supabase based on the JWT used by the client
    return data;
  }
  
  async fetchSpecificItemForUser(itemId: string) {
    const { data, error } = await this.supabaseService.client
      .from('items')
      .select('*')
      .eq('id', itemId)
      .single(); // Expecting one item or null

    if (error) {
       // Supabase might return a PostgREST error (e.g., P0001 for RLS violation if trying to access someone else's item)
       // or the data might just be null if RLS filters it out silently.
      console.error(`Error fetching item ${itemId}:`, error);
      // You might want specific error handling based on the error code or lack of data
      throw new NotFoundException(`Item with ID ${itemId} not found or access denied.`);
    }
    
    if (!data) {
       // If RLS simply filtered the row, data will be null and no error thrown
       throw new NotFoundException(`Item with ID ${itemId} not found or access denied.`);
    }

    return data;
  }
}
```

## Testing

When testing services that depend on `SupabaseService`:
- Mock `SupabaseService` entirely, or...
- Provide a mock `REQUEST` object in your `Test.createTestingModule` setup. Ensure `request.headers.authorization` is set if you're testing JWT flow, and `request.user` (with `userId`) is populated if testing RLS context setting in test/admin modes.
- Mock the `ConfigService` to provide `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and potentially `SUPABASE_SERVICE_ROLE_KEY`.
- You may need to mock or be aware of the `set_auth_user_id` RPC call if your tests involve admin/test modes and RLS. Consider if your mock Supabase client needs to simulate the effect of this RPC.
- See `supabase.service.spec.ts` for an example of testing the service itself.

## Admin Operations (Bypassing RLS / Specific User Context)

The `SUPABASE_ADMIN_MODE=true` configuration for `SupabaseService` is designed for scenarios requiring elevated privileges.
- The client connects using the `SUPABASE_SERVICE_ROLE_KEY`.
- If `request.user` (containing `userId`) is populated by an upstream guard/middleware, `SupabaseService` will call the `set_auth_user_id` RPC. This means that while the connection has service-level permissions, RLS policies dependent on `auth.uid()` will be evaluated for that specific `userId`.
- This allows performing administrative actions that might normally be restricted by RLS, but doing so *within the context of a specific user* where necessary for audit trails or user-specific RLS rules that still need to apply.

If you need operations that *completely* bypass all user-centric RLS and operate purely at a system level (without impersonating any user via `set_auth_user_id`), you would:
1. Create a *separate* service, perhaps a singleton, not request-scoped.
2. This service would directly use `createClient` with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
3. It would *not* attempt to set any user-specific RLS context via RPC calls.
4. Inject this specialized admin service *only* where absolutely necessary and ensure robust authorization controls around its usage.

```typescript
// Example in another service (e.g., items.service.ts)
// ... existing code ...
``` 