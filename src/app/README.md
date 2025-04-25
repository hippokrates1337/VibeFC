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