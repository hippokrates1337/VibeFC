# Login (`src/app/login/`)

This directory contains the public route for user sign-in.

- **`page.tsx`**: Displays the main login interface, rendering the `LoginForm` component from `src/components/auth/LoginForm`.

This route is accessible to unauthenticated users. Authenticated users attempting to access this page will be redirected to the application root (`/`) by the middleware. 