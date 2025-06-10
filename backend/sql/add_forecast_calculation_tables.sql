-- Forecast Calculation Results Storage
-- Supabase Project ID: rfjcfypsaixxenafuxky

-- Calculation results storage
CREATE TABLE forecast_calculation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_id UUID NOT NULL REFERENCES forecasts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  results JSONB NOT NULL, -- Stores MetricCalculationResult[]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_forecast_calculation_results_forecast_id ON forecast_calculation_results(forecast_id);
CREATE INDEX idx_forecast_calculation_results_org_id ON forecast_calculation_results(organization_id);
CREATE INDEX idx_forecast_calculation_results_calculated_at ON forecast_calculation_results(calculated_at DESC);

-- Add compound index for efficient lookups
CREATE INDEX idx_forecast_calculation_results_forecast_org ON forecast_calculation_results(forecast_id, organization_id);

-- RLS policies
ALTER TABLE forecast_calculation_results ENABLE ROW LEVEL SECURITY;

-- Users can view calculation results for their organization forecasts
CREATE POLICY "Users can view calculation results for their organization forecasts" 
ON forecast_calculation_results FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Users can insert calculation results for their organization forecasts
CREATE POLICY "Users can insert calculation results for their organization forecasts" 
ON forecast_calculation_results FOR INSERT 
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'editor')
  )
);

-- Users can update calculation results for their organization forecasts
CREATE POLICY "Users can update calculation results for their organization forecasts" 
ON forecast_calculation_results FOR UPDATE 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'editor')
  )
);

-- Users can delete calculation results for their organization forecasts
CREATE POLICY "Users can delete calculation results for their organization forecasts" 
ON forecast_calculation_results FOR DELETE 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'editor')
  )
);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_forecast_calculation_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_forecast_calculation_results_updated_at
  BEFORE UPDATE ON forecast_calculation_results
  FOR EACH ROW
  EXECUTE FUNCTION update_forecast_calculation_results_updated_at(); 