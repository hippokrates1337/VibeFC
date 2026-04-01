'use client';

import { useEffect, useState, useMemo } from 'react';
import { Calendar, AlertTriangle, CheckCircle, Calculator } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';

import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

import { 
  useForecastGraph,
  useCalculations,
  useCalculationActions
} from '@/lib/store/forecast-graph-store/hooks';
import { useForecastGraphStore } from '@/lib/store/forecast-graph-store/store';

interface PeriodManagementPanelProps {
  className?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Helper to convert Date to MM-YYYY
const dateToMMYYYY = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}-${year}`;
};

// Helper to convert MM-YYYY to Date (first day of month)
const mmyyyyToDate = (mmyyyy: string): Date | null => {
  if (!mmyyyy || !mmyyyy.match(/^\d{2}-\d{4}$/)) return null;
  const [month, year] = mmyyyy.split('-');
  return new Date(parseInt(year), parseInt(month) - 1, 1);
};

// Generate month options for selectors (current year ± 5 years)
const generateMonthOptions = (): { value: string; label: string }[] => {
  const options: { value: string; label: string }[] = [];
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 5;
  const endYear = currentYear + 5;

  for (let year = startYear; year <= endYear; year++) {
    for (let month = 1; month <= 12; month++) {
      const mmyyyy = `${String(month).padStart(2, '0')}-${year}`;
      const date = new Date(year, month - 1, 1);
      options.push({
        value: mmyyyy,
        label: format(date, 'MMM yyyy')
      });
    }
  }

  return options;
};

export function PeriodManagementPanel({ className }: PeriodManagementPanelProps) {
  // Store hooks
  const { forecastName, forecastStartDate, forecastEndDate } = useForecastGraph();
  const { forecastPeriods, isCalculating, calculationError, calculationResults } = useCalculations();
  const { updateForecastPeriods, calculateUnified, loadUnifiedCalculationResults } = useCalculationActions();

  // Local state for period inputs
  const [localForecastStart, setLocalForecastStart] = useState<string>('');
  const [localForecastEnd, setLocalForecastEnd] = useState<string>('');
  const [localActualStart, setLocalActualStart] = useState<string>('');
  const [localActualEnd, setLocalActualEnd] = useState<string>('');

  // Month options for selectors
  const monthOptions = useMemo(() => generateMonthOptions(), []);

  // Sync local state with store state
  useEffect(() => {
    if (forecastPeriods) {
      setLocalForecastStart(forecastPeriods.forecastStartMonth || '');
      setLocalForecastEnd(forecastPeriods.forecastEndMonth || '');
      setLocalActualStart(forecastPeriods.actualStartMonth || '');
      setLocalActualEnd(forecastPeriods.actualEndMonth || '');
    } else {
      // Initialize from legacy forecast metadata if available
      if (forecastStartDate && forecastEndDate) {
        const startDate = parseISO(forecastStartDate);
        const endDate = parseISO(forecastEndDate);
        if (isValid(startDate) && isValid(endDate)) {
          const forecastStart = dateToMMYYYY(startDate);
          const forecastEnd = dateToMMYYYY(endDate);
          setLocalForecastStart(forecastStart);
          setLocalForecastEnd(forecastEnd);
          
          // Auto-generate actual period (6 months before forecast start to 1 month before forecast start)
          const actualEndDate = new Date(startDate);
          actualEndDate.setMonth(actualEndDate.getMonth() - 1);
          const actualStartDate = new Date(startDate);
          actualStartDate.setMonth(actualStartDate.getMonth() - 6);
          
          const actualStart = dateToMMYYYY(actualStartDate);
          const actualEnd = dateToMMYYYY(actualEndDate);
          setLocalActualStart(actualStart);
          setLocalActualEnd(actualEnd);
        }
      }
    }
  }, [forecastPeriods, forecastStartDate, forecastEndDate]);

  // Load existing calculation results on mount
  useEffect(() => {
    if (forecastName && !calculationResults) {
      loadUnifiedCalculationResults().catch(error => {
        console.log('[PeriodManagementPanel] No existing calculation results found:', error.message);
      });
    }
  }, [forecastName, calculationResults, loadUnifiedCalculationResults]);

  // Validation logic
  const validation = useMemo((): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if all required periods are set
    if (!localForecastStart || !localForecastEnd) {
      errors.push('Forecast start and end periods are required');
    }

    if (!localActualStart || !localActualEnd) {
      warnings.push('Actual periods are recommended for complete analysis');
    }

    // Validate MM-YYYY format
    const mmyyyyRegex = /^\d{2}-\d{4}$/;
    if (localForecastStart && !mmyyyyRegex.test(localForecastStart)) {
      errors.push('Invalid forecast start period format');
    }
    if (localForecastEnd && !mmyyyyRegex.test(localForecastEnd)) {
      errors.push('Invalid forecast end period format');
    }
    if (localActualStart && !mmyyyyRegex.test(localActualStart)) {
      errors.push('Invalid actual start period format');
    }
    if (localActualEnd && !mmyyyyRegex.test(localActualEnd)) {
      errors.push('Invalid actual end period format');
    }

    // Validate period order (chronological, not lexicographic — MM-YYYY strings sort incorrectly across years)
    if (localForecastStart && localForecastEnd) {
      const ds = mmyyyyToDate(localForecastStart);
      const de = mmyyyyToDate(localForecastEnd);
      if (ds && de && ds >= de) {
        errors.push('Forecast start period must be before end period');
      }
    }

    if (localActualStart && localActualEnd) {
      const ds = mmyyyyToDate(localActualStart);
      const de = mmyyyyToDate(localActualEnd);
      if (ds && de && ds >= de) {
        errors.push('Actual start period must be before end period');
      }
    }

    // Validate actual vs forecast periods
    if (localActualStart && localActualEnd && localForecastStart && localForecastEnd) {
      const aStart = mmyyyyToDate(localActualStart);
      const aEnd = mmyyyyToDate(localActualEnd);
      const fStart = mmyyyyToDate(localForecastStart);
      const fEnd = mmyyyyToDate(localForecastEnd);
      const periodsOverlap =
        !!(aStart && aEnd && fStart && fEnd && aStart <= fEnd && aEnd >= fStart);
      if (periodsOverlap) {
        errors.push('Actual period cannot overlap with forecast period');
      }

      // Warn if actual period starts on or after forecast start (chronological)
      if (aStart && fStart && aStart >= fStart) {
        warnings.push('Actual period typically comes before forecast period');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, [localForecastStart, localForecastEnd, localActualStart, localActualEnd]);

  // Handle period changes and auto-save
  const handlePeriodChange = async (field: 'forecastStart' | 'forecastEnd' | 'actualStart' | 'actualEnd', value: string) => {
    // Merge with latest store-backed periods so we never save empty/stale forecast months (persisted
    // or local state can lag behind the DB after navigation).
    const storePeriods = useForecastGraphStore.getState().forecastPeriods;

    // Update local state
    switch (field) {
      case 'forecastStart':
        setLocalForecastStart(value);
        break;
      case 'forecastEnd':
        setLocalForecastEnd(value);
        break;
      case 'actualStart':
        setLocalActualStart(value);
        break;
      case 'actualEnd':
        setLocalActualEnd(value);
        break;
    }

    const newPeriods = {
      forecastStartMonth:
        field === 'forecastStart'
          ? value
          : storePeriods?.forecastStartMonth ?? localForecastStart,
      forecastEndMonth:
        field === 'forecastEnd'
          ? value
          : storePeriods?.forecastEndMonth ?? localForecastEnd,
      actualStartMonth:
        field === 'actualStart' ? value : storePeriods?.actualStartMonth ?? localActualStart,
      actualEndMonth:
        field === 'actualEnd' ? value : storePeriods?.actualEndMonth ?? localActualEnd,
    };

    // Only save if all required periods are set
    if (newPeriods.forecastStartMonth && newPeriods.forecastEndMonth) {
      try {
        await updateForecastPeriods(newPeriods);
        console.log('[PeriodManagementPanel] Periods auto-saved successfully');
      } catch (error) {
        console.error('[PeriodManagementPanel] Failed to auto-save periods:', error);
      }
    }
  };

  const handleCalculate = async () => {
    if (!validation.isValid) {
      return;
    }

    try {
      await calculateUnified({
        calculationTypes: ['historical', 'forecast', 'budget'],
        includeIntermediateNodes: true,
      });
    } catch (error) {
      console.error('[PeriodManagementPanel] Calculation failed:', error);
    }
  };

  const canCalculate = validation.isValid && !isCalculating;

  return (
    <Card className={cn("bg-slate-800 border-slate-700", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-200">
          <Calendar className="h-5 w-5" />
          Period Management & Calculation
        </CardTitle>
        <CardDescription className="text-slate-400">
          Configure forecast and actual periods (MM-YYYY), then calculate historical, forecast, and budget values in one run.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Forecast Period Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-slate-200">Forecast Period</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">
                Start Month
              </label>
              <Select
                value={localForecastStart}
                onValueChange={(value) => handlePeriodChange('forecastStart', value)}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-200">
                  <SelectValue placeholder="Select start month" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600 max-h-48">
                  {monthOptions.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      className="text-slate-200 hover:bg-slate-700"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">
                End Month
              </label>
              <Select
                value={localForecastEnd}
                onValueChange={(value) => handlePeriodChange('forecastEnd', value)}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-200">
                  <SelectValue placeholder="Select end month" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600 max-h-48">
                  {monthOptions.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      className="text-slate-200 hover:bg-slate-700"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Actual Period Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-slate-200">Actual Period</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">
                Start Month
              </label>
              <Select
                value={localActualStart}
                onValueChange={(value) => handlePeriodChange('actualStart', value)}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-200">
                  <SelectValue placeholder="Select start month" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600 max-h-48">
                  {monthOptions.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      className="text-slate-200 hover:bg-slate-700"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">
                End Month
              </label>
              <Select
                value={localActualEnd}
                onValueChange={(value) => handlePeriodChange('actualEnd', value)}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-200">
                  <SelectValue placeholder="Select end month" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600 max-h-48">
                  {monthOptions.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      className="text-slate-200 hover:bg-slate-700"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Validation Messages */}
        {validation.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Validation Errors</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {validation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {validation.warnings.length > 0 && validation.errors.length === 0 && (
          <Alert className="bg-yellow-900/20 border-yellow-600/50 text-yellow-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warnings</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {validation.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Calculation Error */}
        {calculationError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Calculation Error</AlertTitle>
            <AlertDescription>{calculationError}</AlertDescription>
          </Alert>
        )}

        {/* Success Message */}
        {validation.isValid && validation.errors.length === 0 && (
          <Alert className="bg-green-900/20 border-green-600/50 text-green-200">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Periods Configured</AlertTitle>
            <AlertDescription>
              Periods are properly configured and saved.
              {isCalculating ? ' Calculating…' : ' You can run calculation when ready.'}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <Button
            onClick={handleCalculate}
            disabled={!canCalculate}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-48"
          >
            <Calculator className="h-4 w-4 mr-2" />
            {isCalculating ? 'Calculating...' : 'Calculate'}
          </Button>
          
          {calculationResults && (
            <div className="text-sm text-slate-400">
              Last calculated: {format(calculationResults.calculatedAt, 'MMM d, yyyy HH:mm')}
              <br />
              Types: {calculationResults.calculationTypes.join(', ')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 