-- 1. Create the organization_role enum type
CREATE TYPE organization_role AS ENUM ('admin', 'editor', 'viewer');

-- 2. Create the organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 3. Create the organization_members mapping table
CREATE TABLE organization_members (
  id BIGSERIAL PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role organization_role NOT NULL DEFAULT 'viewer',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

-- 4. Add organization_id to your existing data tables
-- Example for variables table:
ALTER TABLE variables
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add more ALTER TABLE statements for other tables as needed 