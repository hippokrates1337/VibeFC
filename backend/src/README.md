# Backend Source Directory (`backend/src/`)

This directory contains the TypeScript source code for the VibeFC NestJS backend application.

## Structure

- **`main.ts`**: The application entry point, responsible for bootstrapping the NestJS application.
- **`app.module.ts`**: The root module of the application. It imports feature modules and configures global providers like `ConfigModule`.
- **`app.d.ts`**: Contains global TypeScript declarations, potentially for extending Express Request types.

- **Feature Modules**: Each subdirectory typically represents a feature module, encapsulating domain-specific logic. Key modules include:
    - **`organizations/`**: Manages organizations and their members, including CRUD operations and membership controls. (See `organizations/README.md`)
    - **`data-intake/`**: Responsible for managing time-series variables, including CRUD operations and data validation. (See `data-intake/README.md`)
    - **`forecast/`**: Enables the creation, management, and execution of time-series forecasts using a dynamic node-based graph structure. (See `forecast/README.md`)
    - **`health/`**: Provides endpoints for monitoring the health and status of the backend application (e.g., `GET /health`). (See `health/README.md`)
    - **`test-auth/`**: Provides a test endpoint (`/test-auth`) for inspecting authenticated user details and headers, useful for debugging authentication setups. (See `test-auth/README.md`)

- **Core/Shared Logic**: Directories containing shared modules, core functionalities, or integration logic:
    - **`supabase/`**: Provides a request-scoped `SupabaseService` for interacting with the Supabase database, handling JWT-based authentication and RLS, with special modes for test/admin operations. (See `supabase/README.md`)
    - **`common/`**: Contains shared components, utilities, and configurations (e.g., global guards like `JwtAuthGuard`) used across multiple feature modules. (See `common/README.md`)
    - **`validators/`**: Contains custom `class-validator` decorators for specific validation needs (e.g., `date-range.validator.ts`). (See `validators/README.md`)

- **Module Structure Convention (as per `backend-rules.mdc`)**:
    - `*.module.ts`: Defines the NestJS module.
    - `controllers/`: Contains controllers handling incoming requests and routing.
    - `services/`: Contains business logic and interacts with data sources.
    - `dto/`: Defines Data Transfer Objects for request/response validation and typing.
    - `entities/`: (If applicable) Defines interfaces/classes related to data structures.
    - `guards/`, `decorators/`: (If applicable) For specific auth or utility logic.
    - `tests/` or `__tests__/` or `*.spec.ts`: Contains unit/integration tests.

## Conventions

- **Modularity**: Code is organized into feature modules, each with a clear responsibility.
- **Dependency Injection**: NestJS's built-in DI system is used extensively.
- **Configuration**: Global configuration is handled via `@nestjs/config` (`ConfigModule`).
- **Authentication**: Primarily JWT-based, with guards protecting routes. `SupabaseService` plays a key role in integrating with Supabase RLS.
- **Naming**: Follows `backend-rules.mdc` and `_cursorrules.mdc`.
- **Database Interaction**: Primarily handled within services using the `SupabaseService` client. 