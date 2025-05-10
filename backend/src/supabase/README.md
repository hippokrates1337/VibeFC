# Supabase Module (`backend/src/supabase`)

## Overview
This module provides a request-scoped `SupabaseService` for interacting with the Supabase database. Crucially, it initializes the Supabase client *using the authenticated user's JWT*, ensuring that database operations automatically respect Row Level Security (RLS) policies defined in your database.

## Architecture

- **`supabase.module.ts`**: Defines the NestJS module, exporting `SupabaseService`.
- **`supabase.service.ts`**:
  - Defined with `Scope.REQUEST` to ensure a new instance is created for each incoming request.
  - Injects the standard NestJS `REQUEST` object (typed potentially as `RequestWithUser` if you attach user data in guards) and `ConfigService`.
  - Provides a `client` getter that lazily initializes a `SupabaseClient` instance **per request**.
  - **Client Initialization**: The client is created using the project's `SUPABASE_URL` and `SUPABASE_ANON_KEY`. The service extracts the JWT from the `Authorization: Bearer <token>` header of the current request and configures the client instance with this token using the `global.headers` option. This means all operations using this client instance are performed *as the authenticated user*.
  - **No Service Role Key**: The client provided by this service uses the **anon key** combined with the user's JWT. It **does not** use the `service_role` key, preventing accidental RLS bypass in typical application code.

- **Authentication Guard (e.g., `JwtAuthGuard`)**: 
  - While not part of this module, a guard running *before* this service is instantiated in the request lifecycle is responsible for validating the incoming JWT.
  - The guard typically validates the token (e.g., using `supabase.auth.getUser(token)` with a separate, temporary client or a library like `jsonwebtoken`) and might attach user information to `request.user`.
  - `SupabaseService` relies on the `Authorization` header being present and valid but doesn't perform the validation itself.

## Configuration

Requires the following environment variables to be set:
- `SUPABASE_URL`: Your Supabase project URL.
- `SUPABASE_ANON_KEY`: Your Supabase **public anon key** (found in Project Settings > API > Project API keys).

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
- Provide a mock `REQUEST` object in your `Test.createTestingModule` setup, including mock `headers.authorization`.
- Mock the `ConfigService` to provide dummy `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
- Mock the `@supabase/supabase-js` `createClient` function to control the client instance returned.
- See `supabase.service.spec.ts` for an example of testing the service itself.

## Admin Operations (Bypassing RLS)

If you need to perform operations that *must* bypass RLS (e.g., for specific admin tasks or system processes), you cannot use the client provided by this request-scoped service. You would need to:
1. Create a *separate*, potentially singleton, service (e.g., `AdminSupabaseService`).
2. Configure this admin service to use the `SUPABASE_SERVICE_ROLE_KEY` environment variable.
3. Initialize a dedicated `SupabaseClient` instance within that service using the service role key.
4. Inject this `AdminSupabaseService` *only* where strictly necessary and ensure proper authorization controls are in place for any endpoints using it.

```typescript
// Example in another service
import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ExampleService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async fetchData() {
    const { data, error } = await this.supabaseService.client
      .from('your_table')
      .select('*');
      
    if (error) {
      // Handle error
    }
    return data;
  }
}
``` 