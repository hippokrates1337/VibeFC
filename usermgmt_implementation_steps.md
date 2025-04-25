# User, Role, and Organization Management Implementation Plan

This document outlines the steps to implement user, role, and organization management based on the provided concept document, tailored for the VibeFC application using Next.js and Supabase.

## 1. Database Schema Setup (Supabase)

Define the necessary tables and relationships in Supabase. This can be done via the Supabase Studio SQL Editor or using migration files.

- **`organizations` Table:**
    - `id`: UUID (Primary Key, Default: `uuid_generate_v4()`)
    - `name`: TEXT (Not Null)
    - `created_at`: TIMESTAMPTZ (Not Null, Default: `now()`)
    - `owner_id`: UUID (Not Null, Foreign Key to `auth.users`, identifies the creator/initial admin)
- **`organization_role` Enum Type (PostgreSQL Enum):**
    - Create a type with values: `'admin'`, `'editor'`, `'viewer'`.
- **`organization_members` Table (Mapping Table):**
    - `id`: BIGSERIAL (Primary Key)
    - `organization_id`: UUID (Not Null, Foreign Key to `organizations`, ON DELETE CASCADE)
    - `user_id`: UUID (Not Null, Foreign Key to `auth.users`, ON DELETE CASCADE)
    - `role`: `organization_role` (Not Null, Default: `'viewer'`)
    - `joined_at`: TIMESTAMPTZ (Not Null, Default: `now()`)
    - Unique constraint on (`organization_id`, `user_id`)
- **Update Existing Data Tables:**
    - Add an `organization_id`: UUID (Foreign Key to `organizations`, ON DELETE CASCADE) column to tables containing organization-specific data (e.g., `variables`).

## 2. Supabase Auth & Row Level Security (RLS)

Configure authentication and define security policies.

- **RLS Policies:**
    - **`organizations`:**
        - `SELECT`: Members of the organization can select it.
        - `INSERT`: Authenticated users can create organizations (initial member is the owner/admin).
        - `UPDATE`: Admins of the organization can update it.
        - `DELETE`: Admins of the organization can delete it.
    - **`organization_members`:**
        - `SELECT`: Members of the organization can see other members.
        - `INSERT`: Admins of the organization can invite/add new members.
        - `UPDATE`: Admins can change roles.
        - `DELETE`: Admins can remove members.
    - **Scoped Data Tables (e.g., `variables`):**
        - `SELECT`: Members of the organization can select data.
        - `INSERT`: Members with `editor` or `admin` roles can insert data.
        - `UPDATE`: Members with `editor` or `admin` roles can update data.
        - `DELETE`: Members with `admin` role can delete data.
- **Database Functions/Triggers:**
    - Trigger to automatically add the organization creator as the first admin member in `organization_members`.

## 3. Backend Logic (NestJS Modules)

Create dedicated NestJS modules within the `backend/src/` directory to handle organization and membership logic, interacting with the Supabase database.

- **`Organizations` Module (`backend/src/organizations/`):**
    - `organizations.module.ts`: Defines the module with imports, controllers, providers, and exports.
    - **Controllers:**
        - `organizations.controller.ts`: CRUD operations for organizations.
            - `POST /organizations`: Create a new organization.
            - `GET /organizations`: List organizations for the current user.
            - `GET /organizations/:orgId`: Get details for a specific organization.
            - `PUT /organizations/:orgId`: Update organization details (admin only).
            - `DELETE /organizations/:orgId`: Delete an organization (admin only).
        - `members.controller.ts`: Membership management operations.
            - `GET /organizations/:orgId/members`: List members (all members).
            - `POST /organizations/:orgId/members`: Add a user (admin only).
            - `PUT /organizations/:orgId/members/:userId`: Update role (admin only).
            - `DELETE /organizations/:orgId/members/:userId`: Remove member (admin only).
    - **Services:**
        - `organizations.service.ts`: Business logic for organization operations.
        - `members.service.ts`: Business logic for membership operations.
    - **DTOs:**
        - `organization.dto.ts`: 
            - `CreateOrganizationDto`: Validations for creating organizations.
            - `UpdateOrganizationDto`: Validations for updating organizations.
            - `OrganizationDto`: Organization data structure.
        - `member.dto.ts`: 
            - `OrganizationRole` enum: Defines role values.
            - `InviteMemberDto`: Validations for adding members.
            - `UpdateMemberRoleDto`: Validations for updating roles.
            - `MemberDto`: Member data structure.
    - **Authorization:**
        - `jwt-auth.guard.ts`: Protects routes requiring authentication.
        - `roles.guard.ts`: Role-based authorization.
        - `roles.decorator.ts`: Decorator for defining required roles.

## 4. Backend Testing

- **Unit Tests:**
    - Create tests for services using Jest.
    - Mock the Supabase client for service tests.
    - Test all business logic, including error cases.

- **Integration Tests:**
    - Test controller endpoints using Supertest.
    - Test guards and authentication flow.
    - Test role-based access control.

- **Test Coverage:**
    - Aim for at least 80% code coverage.
    - Focus on business logic in services.

## 5. Frontend Implementation (Next.js App Router)

Integrate authentication, organization context, and role-based UI rendering by interacting with the NestJS backend API.

- **Authentication Integration:**
    - Use `supabase-js` for client-side auth (signup/login) to get JWTs.
    - Send the JWT in the `Authorization: Bearer <token>` header for API calls.

- **Organization Management:**
    - Create components for organization CRUD operations.
    - Create components for managing organization members.
    - Implement organization selection UI.

- **State Management:**
    - Store user session, organizations list, selected organization, and user role.
    - Create custom hooks for accessing organization context.

- **Role-Based UI:**
    - Create a reusable role-based visibility component.
    - Conditionally render UI elements based on user role.

- **Data Fetching:**
    - Create API client functions for all backend endpoints.
    - Implement data fetching with proper error handling.
    - Add loading states for data operations.

## 6. Testing and Quality Assurance

- **Frontend Testing:**
    - Component tests with React Testing Library.
    - Hook tests for state management.
    - Mock API calls for component tests.

- **End-to-End Testing:**
    - Test complete user flows across frontend and backend.
    - Test with multiple user accounts and organization scenarios.
    - Verify role-based access control works end-to-end.

- **Security Testing:**
    - Verify token validation in the backend.
    - Test RLS policies effectiveness.
    - Ensure data isolation between organizations.

---

This plan provides a structured approach to implementing user, role, and organization management in the VibeFC application. The implementation leverages NestJS for the backend, Next.js for the frontend, and Supabase for authentication and data storage, all working together to provide a secure and scalable multi-tenant system. 