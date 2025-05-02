# Authentication Callbacks (`src/app/auth/`)

This directory handles backend routes related to the authentication process.

- **`/callback/route.ts`**: This route handler is used by Supabase to redirect the user after certain authentication events, such as:
  - Email link verification (passwordless or email change).
  - OAuth provider sign-in flow completion.

It typically processes the authentication result (e.g., exchanges a code for a session) and then redirects the user to the appropriate application page. 