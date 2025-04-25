# Backend Source Directory (`backend/src/`)

This directory contains the TypeScript source code for the VibeFC NestJS backend application.

## Structure

- **`main.ts`**: The application entry point, responsible for bootstrapping the NestJS application.
- **`app.module.ts`**: The root module of the application. It often imports feature modules and may configure global providers or middleware.
- **Feature Modules (e.g., `data-intake/`, `health/`)**: Each subdirectory typically represents a feature module, encapsulating domain-specific logic. Following the `backend-rules.mdc`, these should contain:
    - `*.module.ts`: Defines the NestJS module.
    - `controllers/`: Contains controllers handling incoming requests and routing.
    - `services/`: Contains business logic and interacts with data sources (like the Supabase client).
    - `dto/`: Defines Data Transfer Objects for request/response validation and typing.
    - `entities/`: Defines interfaces/classes related to data structures (potentially matching Supabase tables).
    - `tests/` or `__tests__/`: Contains unit tests for the module's components.
- **Shared/Core Logic (e.g., `supabase/`)**: Directories like `supabase/` might contain shared modules, core functionalities (like global interceptors, filters, guards), or Supabase client integration logic used across multiple feature modules.

## Conventions

- **Modularity**: Code is organized into feature modules.
- **Dependency Injection**: NestJS's built-in DI system is used extensively.
- **Naming**: Follows `backend-rules.mdc` (e.g., `kebab-case` for files, `PascalCase` for classes).
- **Supabase Integration**: Database interactions are primarily handled within services using the Supabase client. 