# Organizations Module (`backend/src/organizations`)

## Overview
This module is responsible for managing organizations and their members within the application.

## Features
- CRUD operations for organizations.
- Management of members within organizations (adding, removing, updating roles).

## Architecture

### Module Structure
- **`organizations.module.ts`**: Defines the NestJS module, importing necessary dependencies (like `SupabaseModule`) and declaring controllers and services.
- **`controllers/`**:
  - `organizations.controller.ts`: Handles API requests related to organizations (e.g., creating, fetching, updating).
  - `members.controller.ts`: Handles API requests related to organization members (e.g., inviting, managing roles).
- **`services/`**:
  - `organizations.service.ts`: Contains the business logic for organization management, interacting with the database via `SupabaseService`.
  - `members.service.ts`: Contains the business logic for member management.
- **`dto/`**: Contains Data Transfer Objects for validating request payloads and defining response structures for organizations and members.
- **`guards/`**: Contains guards specific to organization/member access control (e.g., checking if a user is an admin of an organization).
- **`decorators/`**: Contains custom decorators, potentially for simplifying access to user/organization context within requests.

### Dependencies
- `SupabaseModule`: Used for database interactions via the `SupabaseService`.

## Key Responsibilities
- Managing the lifecycle of organizations.
- Handling user membership and roles within organizations.
- Enforcing access control rules related to organization data. 