# Supabase Module (`backend/src/supabase`)

## Overview
This module provides a request-scoped `SupabaseService` for interacting with the Supabase database and services, ensuring that database operations are performed under the context of the authenticated user.

## Architecture

- **`supabase.module.ts`**: Defines the NestJS module, exporting `SupabaseService`.
- **`supabase.service.ts`**: 
  - Defined with `Scope.REQUEST` to ensure a new instance is created for each incoming request.
  - Injects the NestJS `REQUEST` object and `ConfigService`.
  - Provides a `client` getter that lazily initializes a `SupabaseClient` instance.
  - **Client Initialization**: The client is created using the project's `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
  - **User Authentication**: Crucially, it extracts the JWT from the `Authorization: Bearer <token>` header of the current request and configures the client instance with this token using `global.headers`. This ensures all subsequent operations using this client instance are performed *as the authenticated user*, respecting RLS policies.
  - **No Service Role Key**: The primary client provided by this service **does not** use the `service_role` key, preventing accidental RLS bypass.

- **`common/guards/jwt-auth.guard.ts`**: 
  - Although not part of this module, it works in tandem.
  - The guard validates the incoming JWT using a dedicated, temporary Supabase client (initialized with the anon key) by calling `auth.getUser(token)`.
  - It attaches the validated user information to the `request.user` object.

## Configuration

Requires the following environment variables to be set:
- `SUPABASE_URL`: Your Supabase project URL.
- `SUPABASE_ANON_KEY`: Your Supabase **public anon key** (found in Project Settings > API > Project API keys).

## Usage

To use the user-authenticated Supabase client in another module (e.g., `DataIntakeModule`):
1. Ensure `SupabaseModule` is imported in your feature module.
2. Ensure your controller endpoint is protected by `JwtAuthGuard` (or similar mechanism that validates JWT and potentially sets `request.user`).
3. Inject the request-scoped `SupabaseService` into your service's constructor.
4. Access the user-specific client via `this.supabaseService.client`.

```typescript
// Example in another service (e.g., data-intake.service.ts)
import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ExampleService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async fetchDataForUser(userId: string) {
    // The client here is automatically authenticated as the user who made the request
    const { data, error } = await this.supabaseService.client
      .from('some_table')
      .select('*')
      .eq('user_id', userId); // RLS policy should also enforce this typically
      
    if (error) {
      // Handle error (e.g., RLS violation)
    }
    return data;
  }
}
```

**Important Note:** If you require operations that *must* bypass RLS (e.g., specific admin tasks), you would need to manage a separate client instance initialized with the `service_role` key, potentially in a dedicated admin module or service, handling its security implications carefully.

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