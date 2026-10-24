import type { 
  UnifiedCalculationResult, 
  ForecastPeriods
} from '../types';
import type { ForecastGraphValidation } from '@/lib/services/forecast-calculation/graph-validation';

export interface CalculationState {
  calculationResults: UnifiedCalculationResult | null;
  isCalculating: boolean;
  calculationError: string | null;
  lastCalculatedAt: Date | null;
  forecastPeriods: ForecastPeriods | null;
  /** Last validation, including structured issues for highlighting nodes on the canvas. */
  graphValidation: ForecastGraphValidation | null;
  isValidatingGraph: boolean;
}
