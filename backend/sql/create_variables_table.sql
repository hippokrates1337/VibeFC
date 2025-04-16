  -- Create variables table in Supabase
  CREATE TABLE IF NOT EXISTS public.variables (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('ACTUAL', 'BUDGET', 'INPUT', 'UNKNOWN')),
    values JSONB NOT NULL, -- Array of time series data: [{date: string, value: number}]
    user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Create RLS policies for the variables table
  ALTER TABLE public.variables ENABLE ROW LEVEL SECURITY;

  -- Create policy for users to select their own variables
  CREATE POLICY "Users can view their own variables" 
    ON public.variables 
    FOR SELECT 
    USING (auth.uid()::text = user_id);

  -- Create policy for users to insert their own variables
  CREATE POLICY "Users can insert their own variables" 
    ON public.variables 
    FOR INSERT 
    WITH CHECK (auth.uid()::text = user_id);

  -- Create policy for users to update their own variables
  CREATE POLICY "Users can update their own variables" 
    ON public.variables 
    FOR UPDATE 
    USING (auth.uid()::text = user_id);

  -- Create policy for users to delete their own variables
  CREATE POLICY "Users can delete their own variables" 
    ON public.variables 
    FOR DELETE 
    USING (auth.uid()::text = user_id); 