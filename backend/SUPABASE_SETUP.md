# Supabase Setup for VibeFC Backend

This guide will help you set up your Supabase project for use with the VibeFC application.

## Environments

| Project | Used by | Data |
|---|---|---|
| `vibefc-dev` | local development (`.env.local`, `backend/.env`), Playwright e2e, manual testing | disposable |
| production (`yspnngenawwvocgucxmh`) | the Vercel deployment only; keys live in the Vercel project settings | real users |

Never put production keys into a local env file, and never run tests against production.

## Schema: Supabase CLI migrations

The schema lives in `supabase/migrations/*.sql` and is applied with the Supabase CLI
(a pinned dev dependency, run it as `npx supabase …`). No Docker is needed for the remote
commands below. CI applies every migration to a throwaway database on each pull request.

One-time per machine:

```bash
npx supabase login
npx supabase link --project-ref <vibefc-dev project ref>
```

`link` asks for the project's database password (Project Settings → Database). The link is
stored in `supabase/.temp` (git-ignored), so it is per machine.

Day to day:

```bash
npm run db:new -- add_edge_rank      # creates supabase/migrations/<timestamp>_add_edge_rank.sql
npm run db:push                      # applies pending migrations to the linked project
npm run db:list                      # local vs remote migration history
```

Rules: never edit a migration that has been pushed anywhere; add a new one. Push to dev
first, then to production (`npx supabase db push --project-ref <prod ref>`).

## Setup Steps

### 1. Install Dependencies

Make sure you have the required dependencies installed:

```bash
npm install @supabase/supabase-js uuid
```

### 2. Configure Environment Variables

Update your `.env` file with your Supabase credentials:

```
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_ANON_KEY="your-public-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
# Optional: URL users land on after accepting an email invite (Auth redirect)
# SUPABASE_INVITE_REDIRECT_TO="https://your-app.example.com/login"
```

- You can find your Supabase URL and keys in the Supabase dashboard under Project Settings > API.
- The `SUPABASE_ANON_KEY` is the **public anon key**; Nest uses it with the caller’s JWT so RLS applies.
- The `SUPABASE_SERVICE_ROLE_KEY` is **required** for organization invitations: Nest calls `auth.admin.inviteUserByEmail` and claims pending invites server-side. It bypasses RLS—keep it secret and server-only (never in the browser).

### 2b. Auth email (invitations)

Invites use Supabase Auth’s email flow. Configure **SMTP** (or a supported mail provider) under **Authentication → Emails** in the dashboard; otherwise `inviteUserByEmail` will not deliver messages. See [Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

### 3. Create Database Schema

Link the new project and run `npm run db:push` (see "Schema: Supabase CLI migrations"
above). Do not paste SQL into the dashboard's SQL editor: changes made there are not in
the migration history and will drift from the repo.

The `variables` table includes:
- `id`: UUID primary key
- `name`: Variable name
- `type`: Variable type (ACTUAL, BUDGET, INPUT, or UNKNOWN)
- `values`: JSONB array of time series data points
- `user_id`: User identifier for row-level security
- `organization_id`: Organization identifier (UUID, FK to organizations)
- `created_at` and `updated_at`: Timestamps

The baseline migration also creates organizations, forecasts, RPCs, profiles, invitations, and related RLS.

### 4. Test the Connection

Start the backend and make a test API call to ensure the connection is working correctly:

```bash
npm run start:dev
```

Then make a POST request to `/data-intake/variables` with appropriate data.

### 5. Example Request Payload

Here's an example of the expected payload format for the add-variables endpoint:

```json
{
  "variables": [
    {
      "id": "client-generated-uuid-v4", // Client should generate a UUID v4 for each new variable
      "name": "Revenue",
      "type": "ACTUAL",
      // user_id and organization_id are technically optional in the payload if the user is authenticated,
      // as the backend may populate them from the JWT.
      // However, if provided, organization_id is mandatory as per DTO.
      "user_id": "user-auth-uuid-123", 
      "organization_id": "org-uuid-456", 
      "values": [
        { "date": "2024-01-01", "value": 1000 },
        { "date": "2024-02-01", "value": 1250 },
        { "date": "2024-03-01", "value": 1500 }
      ]
    }
  ]
}
```

## Authentication Setup

For authentication with Supabase:

1. Enable the authentication methods you want to use in the Supabase dashboard (Auth > Settings).
2. Update your frontend to use Supabase Auth.
3. Use the user's JWT token for authenticated requests (the Next.js app stores the access token in the `sb-access-token` cookie for Nest API calls).

After sign-in or sign-up, the frontend calls `POST /users/me/claim-invites` so any rows in `organization_invitations` matching the user’s email are turned into `organization_members` rows.

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security) 