-- Create the forecast_node_kind_enum type
CREATE TYPE forecast_node_kind_enum AS ENUM ('DATA', 'CONSTANT', 'OPERATOR', 'METRIC', 'SEED');

-- Create forecasts table
CREATE TABLE IF NOT EXISTS public.forecasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  forecast_start_date DATE NOT NULL,
  forecast_end_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create forecast_nodes table
CREATE TABLE IF NOT EXISTS public.forecast_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  forecast_id UUID NOT NULL REFERENCES public.forecasts(id) ON DELETE CASCADE,
  kind forecast_node_kind_enum NOT NULL,
  attributes JSONB NOT NULL, -- Store kind-specific attributes in JSONB
  position JSONB NOT NULL,   -- Store x, y coordinates in JSONB
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create forecast_edges table
CREATE TABLE IF NOT EXISTS public.forecast_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  forecast_id UUID NOT NULL REFERENCES public.forecasts(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES public.forecast_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES public.forecast_nodes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security for all forecast-related tables
ALTER TABLE public.forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_edges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for forecasts table
CREATE POLICY "Users can view forecasts in their organizations"
  ON public.forecasts
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert forecasts in their organizations"
  ON public.forecasts
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update forecasts in their organizations"
  ON public.forecasts
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete forecasts in their organizations"
  ON public.forecasts
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for forecast_nodes table
CREATE POLICY "Users can view forecast nodes in their organizations"
  ON public.forecast_nodes
  FOR SELECT
  USING (
    forecast_id IN (
      SELECT id FROM public.forecasts
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert forecast nodes in their organizations"
  ON public.forecast_nodes
  FOR INSERT
  WITH CHECK (
    forecast_id IN (
      SELECT id FROM public.forecasts
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update forecast nodes in their organizations"
  ON public.forecast_nodes
  FOR UPDATE
  USING (
    forecast_id IN (
      SELECT id FROM public.forecasts
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete forecast nodes in their organizations"
  ON public.forecast_nodes
  FOR DELETE
  USING (
    forecast_id IN (
      SELECT id FROM public.forecasts
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for forecast_edges table
CREATE POLICY "Users can view forecast edges in their organizations"
  ON public.forecast_edges
  FOR SELECT
  USING (
    forecast_id IN (
      SELECT id FROM public.forecasts
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert forecast edges in their organizations"
  ON public.forecast_edges
  FOR INSERT
  WITH CHECK (
    forecast_id IN (
      SELECT id FROM public.forecasts
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete forecast edges in their organizations"
  ON public.forecast_edges
  FOR DELETE
  USING (
    forecast_id IN (
      SELECT id FROM public.forecasts
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid()
      )
    )
  ); 