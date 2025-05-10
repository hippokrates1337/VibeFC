# Organizations (`src/app/(protected)/organizations/`)

This directory contains the routes and potentially components related to managing organizations.

**Authorization:** Access to this section requires the user to be authenticated. It resides within the `(protected)` route group, and access is enforced by `src/middleware.ts`.

*(Add more details about the specific functionality within this section as it's developed)*

# Organization Management Frontend Implementation

This directory contains the frontend implementation for the organization management feature of VibeFC.

## Features

- **Authentication**: User sign-up, login, and session management using Supabase Auth
- **Organization Management**: Create, update, and delete organizations
- **Member Management**: Invite, update roles, and remove members from organizations
- **Role-Based Access Control**: UI components and features are conditionally rendered based on user roles

## Important Update

To make the authentication work properly, the following changes have been implemented:

1. Added a route group for protected pages under `src/app/(protected)/` that requires authentication
2. Updated middleware to redirect unauthenticated users to the login page
3. Implemented cookie-based auth token storage for proper authentication persistence
4. Created a shared header with organization selector for authenticated pages

## Setup

1. Create a `.env.local` file in the root directory with the following variables:
   ```
   # Supabase configuration
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   
   # API configuration
   NEXT_PUBLIC_API_URL=http://localhost:3000/api
   ```

2. Install dependencies:
   ```
   npm install @supabase/supabase-js
   ```

3. Configure Supabase Authentication in the Supabase dashboard:
   - Enable Email/Password sign in method
   - Set up email templates
   - Configure site URL and redirect URLs
   
4. Start the development server:
   ```
   npm run dev
   ```

## Structure

- **Components**:
  - `organization/`: Organization-specific UI components
  - `auth/`: Authentication UI components
  - `RoleBasedAccess.tsx`: Utility component for role-based rendering

- **Providers**:
  - `auth-provider.tsx`: Authentication state management
  - `organization-provider.tsx`: Organization state management

- **Pages**:
  - `/login`, `/signup`: Authentication pages
  - `/(protected)/organizations`: Organization management page (protected)
  - `/auth/callback`: Authentication callback handling

## Role-Based Access

The system supports three roles:

1. **Admin**: Can manage organization settings, add/remove members, and change roles
2. **Editor**: Can create and edit content, but can't manage organization settings
3. **Viewer**: Can only view content, with no edit permissions

## API Integration

The frontend interacts with the backend API for organization management operations. All API calls include the user's JWT token in the `Authorization` header for authentication. 