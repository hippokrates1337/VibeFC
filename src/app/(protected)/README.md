# Protected Routes (`src/app/(protected)/`)

This directory utilizes a Next.js Route Group `(protected)` to organize routes that require user authentication.

- **Middleware Enforcement:** Access to any route defined within this directory (or its subdirectories) is protected by `src/middleware.ts`. Unauthenticated users will be redirected to `/login`.
- **Shared Layout (`layout.tsx`):** This file likely defines a common UI structure (e.g., navigation sidebar, header) shared across all protected sections of the application.
- **Subdirectories (e.g., `organizations/`):** Feature-specific routes that require authentication are placed here. 