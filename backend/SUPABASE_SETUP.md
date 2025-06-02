# Supabase Setup for VibeFC Backend

This guide will help you set up your Supabase project for use with the VibeFC application.

## Prerequisites

1. Create a Supabase account at [https://supabase.com](https://supabase.com)
2. Create a new Supabase project

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
// If you need to perform operations that bypass Row Level Security (RLS),
// for specific admin tasks or system processes, you would configure a separate client
// with SUPABASE_SERVICE_ROLE_KEY="your-service-role-key".
// The main application services (like SupabaseService) are designed to use
// the anon key along with the user's JWT to respect RLS.
```

- You can find your Supabase URL and keys in the Supabase dashboard under Project Settings > API.
- The `SUPABASE_ANON_KEY` is the **public anon key**.
- The `SUPABASE_SERVICE_ROLE_KEY` (if used for admin tasks) has full access and bypasses RLS; use it cautiously.

### 3. Create Database Schema

1. In your Supabase dashboard, navigate to the SQL Editor.
2. Execute the SQL script from `backend/sql/create_variables_table.sql` to create the necessary tables and policies.

The schema includes:
- `id`: UUID primary key
- `name`: Variable name
- `type`: Variable type (ACTUAL, BUDGET, INPUT, or UNKNOWN)
- `values`: JSONB array of time series data points
- `user_id`: User identifier for row-level security
- `organization_id`: Organization identifier (UUID, FK to organizations)
- `created_at` and `updated_at`: Timestamps

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
3. Use the user's JWT token for authenticated requests.

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security) 