# Supabase Module (`backend/src/supabase`)

## Overview
This module is responsible for initializing and providing the Supabase client instance for interacting with the Supabase database and services.

## Architecture

- **`supabase.module.ts`**: Defines the NestJS module. It declares `SupabaseService` as a provider and exports it, making the service available for dependency injection in other modules.
- **`supabase.service.ts`**: 
  - Implements `OnModuleInit` to initialize the Supabase client when the module loads.
  - Uses `ConfigService` to retrieve Supabase URL and the **service role key** (`SUPABASE_URL`, `SUPABASE_KEY`) from environment variables.
  - **Important**: It initializes the client using the `service_role` key, which bypasses Row Level Security (RLS) policies. This grants administrative privileges to the backend. Ensure proper authorization and validation are implemented in services using this client.
  - Provides a `client` getter to access the initialized `SupabaseClient` instance.
  - Includes a `testConnection` method to verify connectivity during initialization and for health checks.

## Configuration

Requires the following environment variables to be set:
- `SUPABASE_URL`: Your Supabase project URL.
- `SUPABASE_KEY`: Your Supabase **service role key** (found in Project Settings > API > Project API keys).

## Usage

To use the Supabase client in another module (e.g., `DataIntakeModule`):
1. Import `SupabaseModule` into the `imports` array of your feature module.
2. Inject `SupabaseService` into your service's constructor.
3. Access the client via `this.supabaseService.client`.

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