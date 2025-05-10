# Sign Up (`src/app/signup/`)

This directory contains the public route for new user registration.

- **`page.tsx`**: Displays the main sign-up interface, rendering the `SignUpForm` component from `src/components/auth/SignUpForm`.

This route is accessible to unauthenticated users. Authenticated users attempting to access this page will be redirected to the application root (`/`) by the middleware. 