# App Directory (`src/app/`)

This directory implements the core routing and layout structure of the VibeFC frontend application using the Next.js App Router.

## Structure

- **Route Groups (`(...)`):** Used to organize routes without affecting the URL path (e.g., for different layouts or sections).
- **Layouts (`layout.tsx`):** Define shared UI structures for segments and their children.
- **Pages (`page.tsx`):** Define the unique UI for a specific route segment.
- **Loading UI (`loading.tsx`):** Defines loading state UI (e.g., skeletons) shown during route transitions.
- **Error Handling (`error.tsx`):** Defines error UI boundaries for route segments.
- **Route Handlers (`api/.../route.ts`):** Server-side API endpoints.
- **Feature-Specific Folders:** Subdirectories often group related routes, pages, and components for a specific feature (e.g., `data-intake/`).

## Conventions

- Follows Next.js file-based routing conventions.
- Primarily uses Server Components for pages and layouts.
- Client Components (`'use client'`) are used where browser APIs or interactivity are needed.
- Metadata (SEO, titles) is defined using the `metadata` export in `layout.tsx` or `page.tsx`.

## Authentication & Authorization

- **Middleware (`src/middleware.ts`):** Handles authentication checks for incoming requests.
  - Uses Supabase to verify user sessions via the `sb-access-token` cookie.
  - Redirects unauthenticated users attempting to access protected routes to `/` (root).
  - Redirects authenticated users attempting to access `/login` or `/signup` to `/` (root).
- **Public Routes:** `/login`, `/signup`, `/auth/callback` are accessible without authentication.
- **Protected Routes:** Routes intended for authenticated users are grouped under `src/app/(protected)/`. Access is enforced by the middleware.

## Key Directories

- **`/ (root)`:** Contains the main entry `layout.tsx` and the universal `page.tsx` that serves both authenticated and unauthenticated users.
- **`/(protected)/`:** A route group for pages and layouts requiring user authentication. Routes within this group (e.g., `/organizations`) are protected by middleware. It also defines a shared layout for these protected sections.
- **`/auth/`:** Handles authentication-related backend logic.
  - **`/auth/callback/`:** Contains a `route.ts` handler for Supabase authentication callbacks (e.g., after email verification or OAuth flows).
- **`/login/`:** Public route displaying the user login form (`LoginForm` component).
- **`/signup/`:** Public route displaying the user registration form (`SignUpForm` component).
- **`/data-intake/`:** Feature section for data intake processes (Protected - requires login, located within `(protected)` group).
- **`/organizations/`:** Feature section for managing organizations (Protected - requires login, located within `(protected)` group).
- **`/forecast-definition/`:** Feature section for creating and managing forecasts (Protected - requires login, located within `(protected)` group).
- **`/api/`:** Contains server-side API route handlers. (See `api/README.md`)
- **`/api-test/`:** Contains pages for testing API endpoints during development. (See `api-test/README.md`)

## Unified Entry Point

The root page (`/page.tsx`) serves as the universal entry point for the application:
- **Unauthenticated users** see a public landing page with feature highlights and sign-up/sign-in options
- **Authenticated users** see a dashboard with navigation to application features
- This eliminates the need for separate landing pages and creates a seamless user experience 