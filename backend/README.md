# VibeFC Backend

This directory contains the NestJS backend application for VibeFC.

## Overview

The backend is built using the NestJS framework with TypeScript. It follows a modular architecture, interacts directly with a Supabase database, and adheres to the coding standards defined in `backend-rules.mdc` and `_cursorrules.mdc`.

## Key Directories

- **`src/`**: Contains the application's source code, organized into modules (features), controllers, services, DTOs, etc.
- **`dist/`**: Contains the compiled JavaScript code ready for execution.
- **`sql/`**: Contains supplementary SQL scripts or database-related files.
- **`test/`**: (Expected, based on rules) Should contain end-to-end tests.

## Database Schema Overview

The backend utilizes a Supabase PostgreSQL database. Key tables in the `public` schema include:

-   **`organizations`**: Stores organization details (ID, name, owner, timestamps). Linked to `auth.users` via `owner_id`.
-   **`organization_members`**: Manages user membership within organizations (ID, org_id, user_id, role, timestamps). Links `organizations` and `auth.users`. Roles include 'admin', 'editor', 'viewer'.
-   **`variables`**: Contains variable data associated with organizations (ID, name, type, values, user_id, timestamps, organization_id). The `type` can be 'ACTUAL', 'BUDGET', 'INPUT', or 'UNKNOWN'. Note: `user_id` is stored as `text` type, `organization_id` is mandatory (NOT NULL).
-   **`forecasts`**: Stores metadata about forecasts (ID, name, forecast_start_date, forecast_end_date, organization_id, user_id, timestamps).
-   **`forecast_nodes`**: Stores nodes in the forecast graph (ID, forecast_id, kind, attributes, position, timestamps). The `kind` can be 'DATA', 'CONSTANT', 'OPERATOR', 'METRIC', or 'SEED'.
-   **`forecast_edges`**: Stores connections between forecast nodes (ID, forecast_id, source_node_id, target_node_id, timestamps).

Row Level Security (RLS) is enabled on these tables.

## Features

### Data Intake
Allows users to import and manage time-series data variables for their organizations. Variables are categorized by type (actual, budget, input) and store JSON arrays of time-series values.

### Organizations
Manages organizations and their members. Users can create organizations, invite members, assign roles, and manage membership.

### Forecast
Enables the creation and management of forecasting models using a graph-based approach. Users can build models by connecting different types of nodes (data, constants, operators, metrics) to define calculation flows.

## Getting Started

1.  **Install Dependencies:** Run `npm install` or the provided `install-deps.ps1` script.
2.  **Environment Setup:** Configure environment variables (e.g., database connection string, JWT secrets) in a `.env` file (refer to `.env.example` if available).
3.  **Database:** Ensure the Supabase database is set up and migrated. Refer to `SUPABASE_SETUP.md` and potentially `MIGRATION_GUIDE.md`.
4.  **Run:** Use `npm run start:dev` for development or the provided `run-app.ps1` script.

## Standards

- **Architecture:** Modular (one module per domain), Core Module, Shared Module.
- **Data Access:** Direct Supabase client interaction.
- **Validation:** `class-validator` in DTOs.
- **Testing:** Jest for unit tests, Supertest for integration tests.
- **Security:** JWT authentication, RBAC guards. 