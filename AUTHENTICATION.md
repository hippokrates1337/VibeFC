# Authentication Setup for VibeFC

This guide will help you set up authentication for VibeFC using Supabase.

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up or sign in
2. Create a new project
3. Note your project URL and anon public key (found in Project Settings > API)

## 2. Configure Environment Variables

You can either:

a) Run the setup script:
```bash
npm run setup-env
```

b) Manually create a `.env.local` file in the project root with:
```
# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# API configuration
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## 3. Set Up Database Schema

Execute the following SQL in your Supabase SQL Editor:

```sql
-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create enum for organization roles
CREATE TYPE organization_role AS ENUM ('admin', 'editor', 'viewer');

-- Create organization members table
CREATE TABLE IF NOT EXISTS organization_members (
  id BIGSERIAL PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role organization_role NOT NULL DEFAULT 'viewer',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Add organization_id column to existing tables that need it
ALTER TABLE variables ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
```

## 4. Set Up Row Level Security (RLS) Policies

```sql
-- Enable RLS on tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE variables ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view organizations they belong to" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (
    auth.uid() = owner_id
  );

CREATE POLICY "Organization admins can update their organizations" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Organization admins can delete their organizations" ON organizations
  FOR DELETE USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Organization members policies
CREATE POLICY "Members can view other members in their organizations" ON organization_members
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can add members to their organizations" ON organization_members
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update member roles in their organizations" ON organization_members
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can remove members from their organizations" ON organization_members
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Variables policies
CREATE POLICY "Members can view organization variables" ON variables
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Editors and admins can create variables" ON variables
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('editor', 'admin')
    )
  );

CREATE POLICY "Editors and admins can update variables" ON variables
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('editor', 'admin')
    )
  );

CREATE POLICY "Admins can delete variables" ON variables
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

## 5. Configure Supabase Auth

1. Go to Authentication > Settings in your Supabase dashboard
2. Under Site URL, enter your application's URL (e.g., `http://localhost:3000`)
3. Under Redirect URLs, add:
   - `http://localhost:3000/auth/callback`
   - The production URL if applicable

## 6. Enable Email/Password Auth

1. Go to Authentication > Providers
2. Ensure Email provider is enabled
3. Configure settings as needed (e.g., email templates)

## 7. Start the Application

```bash
npm run dev
```

You should now be redirected to the login page when opening the application. After signing up and logging in, you'll be able to create and manage organizations.

## 8. Creating Your First User

1. Visit your application at `http://localhost:3000`
2. You should be redirected to the login page
3. Click "Sign up" to create a new account
4. Verify your email address if email verification is enabled
5. Log in with your new account
6. You'll be prompted to create an organization

## Troubleshooting

If you encounter issues:

1. Check your browser console for errors
2. Verify that your environment variables are set correctly
3. Make sure the Supabase SQL was executed successfully
4. Check that RLS policies are properly configured
5. Ensure your Supabase auth settings are correct 