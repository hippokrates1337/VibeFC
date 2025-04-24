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
SUPABASE_KEY="your-service-role-key"
```

- You can find your Supabase URL and keys in the Supabase dashboard under Project Settings > API.
- For development, you should use the **service_role** key as it has full access to the database.
- For production, consider using more restricted keys and implementing proper authentication.

### 3. Create Database Schema

1. In your Supabase dashboard, navigate to the SQL Editor.
2. Execute the SQL script from `backend/sql/create_variables_table.sql` to create the necessary tables and policies.

The schema includes:
- `id`: UUID primary key
- `name`: Variable name
- `type`: Variable type (ACTUAL, BUDGET, INPUT, or UNKNOWN)
- `values`: JSONB array of time series data points
- `user_id`: User identifier for row-level security
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
      "name": "Revenue",
      "type": "ACTUAL",
      "userId": "user123",
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