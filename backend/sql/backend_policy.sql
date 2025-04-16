-- Create policy for backend service to insert variables
-- This policy allows the backend service to insert records with user_id = 'frontend-user'
-- or user_id = 'debug-user' or other backend-specific user IDs

-- First, drop any existing policy with the same name (if you need to update it)
DROP POLICY IF EXISTS "Backend service can insert variables" ON public.variables;

-- Create the policy
CREATE POLICY "Backend service can insert variables" 
  ON public.variables 
  FOR INSERT 
  WITH CHECK (
    user_id = 'frontend-user' OR 
    user_id = 'debug-user' OR
    user_id = 'anonymous' OR
    user_id LIKE 'backend-%'
  );

-- Optional: Create similar policies for update/delete if needed
CREATE POLICY "Backend service can update variables" 
  ON public.variables 
  FOR UPDATE 
  USING (
    user_id = 'frontend-user' OR 
    user_id = 'debug-user' OR
    user_id = 'anonymous' OR
    user_id LIKE 'backend-%'
  );

CREATE POLICY "Backend service can delete variables" 
  ON public.variables 
  FOR DELETE 
  USING (
    user_id = 'frontend-user' OR 
    user_id = 'debug-user' OR
    user_id = 'anonymous' OR
    user_id LIKE 'backend-%'
  );

-- For testing, you might want to add a policy to allow selecting all records
CREATE POLICY "Backend service can view all variables" 
  ON public.variables 
  FOR SELECT 
  USING (true);  -- Allows viewing all records 