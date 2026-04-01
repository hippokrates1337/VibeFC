import type { 
  UnifiedCalculationResult, 
  ForecastPeriods, 
  GraphValidationResult 
} from '../types';

export interface CalculationState {
  calculationResults: UnifiedCalculationResult | null;
  isCalculating: boolean;
  calculationError: string | null;
  lastCalculatedAt: Date | null;
  forecastPeriods: ForecastPeriods | null;
  graphValidation: GraphValidationResult | null;
  isValidatingGraph: boolean;
}
