-- Add organization_id column to the variables table
ALTER TABLE public.variables
ADD COLUMN organization_id UUID;

-- Add a foreign key constraint to the organizations table (assuming it exists)
-- Make organization_id NOT NULL if every variable MUST belong to an organization
ALTER TABLE public.variables
ADD CONSTRAINT fk_organization
FOREIGN KEY (organization_id)
REFERENCES public.organizations (id)
ON DELETE SET NULL; -- Or ON DELETE CASCADE / RESTRICT depending on requirements

-- Optional: Add an index for performance
CREATE INDEX idx_variables_organization_id ON public.variables(organization_id);

-- Update existing rows with a default organization ID if necessary
-- Replace 'default-org-uuid' with an actual default organization ID or handle NULLs
-- UPDATE public.variables
-- SET organization_id = 'default-org-uuid'
-- WHERE organization_id IS NULL;

-- After potentially updating existing rows, consider making the column NOT NULL
-- ALTER TABLE public.variables
-- ALTER COLUMN organization_id SET NOT NULL;

-- Update RLS Policies (Example - adjust based on your actual policies)
-- Ensure existing policies consider organization_id
-- Example: Allow users to select variables belonging to their organizations
-- DROP POLICY IF EXISTS "Allow select for users based on user_id" ON public.variables;
-- CREATE POLICY "Allow select based on user and organization" ON public.variables
-- FOR SELECT USING (
--  auth.uid() = user_id AND
--  organization_id IN (
--    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
--  )
-- );

-- Example: Allow users to insert variables for their organizations
-- DROP POLICY IF EXISTS "Allow insert for users based on user_id" ON public.variables;
-- CREATE POLICY "Allow insert for users based on user and organization" ON public.variables
-- FOR INSERT WITH CHECK (
--  auth.uid() = user_id AND
--  organization_id IN (
--    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
--  )
-- );

-- Add similar policies for UPDATE and DELETE, checking organization membership 