# Source Directory (`src/`)

This directory contains the core source code for the VibeFC frontend application, built with Next.js and adhering to the defined project standards.

## Structure

- **`app/`**: Contains the application routes, layouts, and pages following the Next.js App Router convention.
- **`components/`**: Houses reusable UI components, potentially organized by feature. Includes shared components and those built using `shadcn/ui`.
- **`lib/`**: Includes shared utility functions, helper modules, and library code used across the application.
- **`providers/`**: Contains React Context providers or similar state management/dependency injection setups used globally or across features.
- **`types/`**: Defines shared TypeScript interfaces and type definitions used throughout the frontend codebase.
- **`hooks/`**: Reserved for global custom hooks (currently empty - uses distributed hook architecture).

## Testing Setup

- **`setupTests.ts`**: Configuration file for the Jest testing framework.
- **`test-utils.tsx`**: Custom React Testing Library utilities with error boundary support.
- **`test-utils.md`**: Documentation for test utilities and migration scripts.

The test utilities provide error-resilient testing by wrapping components in error boundaries, preventing test failures from unhandled component errors. See `test-utils.md` for detailed usage and migration information.

## Standards

Development within this directory follows the guidelines outlined in `frontend-rules.mdc` and `_cursorrules.mdc`, emphasizing:

- **Next.js App Router**: For routing and layouts.
- **Server Components**: Default component type, with Client Components used sparingly (`'use client'`).
- **Styling**: Tailwind CSS and `shadcn/ui` for UI development.
- **State Management**: Primarily local state and URL state (`nuqs`), with Context API in `providers/`.
- **Testing**: Jest and React Testing Library for unit and component tests with custom error boundary utilities. 