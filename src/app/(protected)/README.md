# Protected Routes (`src/app/(protected)/`)

This directory utilizes a Next.js Route Group `(protected)` to organize routes that require user authentication.

- **Middleware Enforcement:** Access to any route defined within this directory (or its subdirectories) is protected by `src/middleware.ts`. Unauthenticated users will be redirected to `/login`.
- **Shared Layout (`layout.tsx`):** This file likely defines a common UI structure (e.g., navigation sidebar, header) shared across all protected sections of the application.

## Available Protected Routes

- **`data-intake/`** - Data management and variable upload functionality
- **`forecast-definition/`** - Forecast creation and editing with graphical interface
- **`forecast-display/`** - Forecast results visualization and historical comparison (NEW)
- **`organizations/`** - Organization settings and member management 