# Organizations (`src/app/(protected)/organizations/`)

This directory contains the routes and components related to managing organizations within the VibeFC platform.

**Authorization:** Access to this section requires user authentication. It resides within the `(protected)` route group, and access is enforced by `src/middleware.ts`.

## Features

- **Organization Management**: Create, update, and delete organizations
- **Member Management**: Invite, update roles, and remove members from organizations  
- **Role-Based Access Control**: UI components and features are conditionally rendered based on user roles

## Architecture

The organization management system is integrated into the protected route layout:

- **Shared Layout**: The `(protected)/layout.tsx` provides a common header with organization selector
- **Organization Selector**: Allows users to switch between organizations they have access to
- **State Management**: Uses Zustand stores for organization and member state management
- **Authentication**: All operations require JWT authentication via the auth provider

## Role-Based Access

The system supports three roles:

1. **Admin**: Can manage organization settings, add/remove members, and change roles
2. **Editor**: Can create and edit content, but can't manage organization settings  
3. **Viewer**: Can only view content, with no edit permissions

## API Integration

The frontend interacts with the backend API for organization management operations. All API calls include the user's JWT token in the `Authorization` header for authentication.

## Component Structure

- **`page.tsx`**: Main organizations listing and management page
- **Organization Components**: Located in `src/components/organization/`
  - `OrganizationSelector`: Dropdown component for switching organizations
  - Role-based access control components
- **Providers**: 
  - `auth-provider.tsx`: Authentication state management
  - Organization state managed via Zustand store

## Usage

1. **Organization Selection**: Users can select their active organization via the header selector
2. **Management**: Organization admins can manage members and settings
3. **Data Isolation**: All data is scoped to the selected organization
4. **Navigation**: Organization context is maintained across protected routes 