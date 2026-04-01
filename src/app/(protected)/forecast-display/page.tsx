'use client';

import { useState, useEffect } from 'react';
import { useOrganizationStore } from '@/lib/store/organization';
import { 
  useForecastGraph,
  useForecastGraphActions,
  useCalculations,
  useCalculationActions
} from '@/lib/store/forecast-graph-store/hooks';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, BarChart3, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Forecast } from '@/lib/api/forecast';
import { PeriodManagementPanel } from '@/components/forecast/period-management-panel';
import { ForecastResultsTable } from '@/components/forecast/forecast-results-table';
import { forecastApi, mapForecastToClientFormat } from '@/lib/api/forecast';

// Helper function to safely format dates
const formatDateSafe = (dateString: string | null | undefined, formatPattern: string): string => {
  if (!dateString) {
    return 'N/A';
  }
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    return format(date, formatPattern);
  } catch (error) {
    console.warn(`Error formatting date string "${dateString}":`, error);
    return 'N/A';
  }
};

// Helper function to format forecast period
const formatForecastPeriod = (startDate: string | null | undefined, endDate: string | null | undefined): string => {
  const formattedStart = formatDateSafe(startDate, 'MMM yyyy');
  const formattedEnd = formatDateSafe(endDate, 'MMM yyyy');
  if (formattedStart === 'N/A' || formattedEnd === 'N/A') {
    return 'Period not defined';
  }
  
  return `${formattedStart} - ${formattedEnd}`;
};

interface ForecastSelectorProps {
  selectedForecastId: string | null;
  onForecastSelect: (forecastId: string) => void;
  forecasts: Forecast[];
  isLoading: boolean;
  error: string | null;
}

function ForecastSelector({ selectedForecastId, onForecastSelect, forecasts, isLoading, error }: ForecastSelectorProps) {
  if (error) {
    return (
      <Card className="bg-red-900/20 border-red-800">
        <CardContent className="flex items-center gap-3 pt-6">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div>
            <p className="text-red-400 font-medium">Error loading forecasts</p>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-300">
        Select Forecast
      </label>
      <Select 
        value={selectedForecastId || ''} 
        onValueChange={onForecastSelect}
        disabled={isLoading}
      >
        <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-200">
          <SelectValue placeholder={isLoading ? "Loading forecasts..." : "Select a forecast to analyze"} />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-600">
          {isLoading ? (
            <SelectItem value="loading" disabled className="text-slate-400">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading forecasts...
              </div>
            </SelectItem>
          ) : forecasts.length > 0 ? (
            forecasts.map((forecast) => (
              <SelectItem 
                key={forecast.id} 
                value={forecast.id} 
                className="text-slate-200 hover:bg-slate-700"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{forecast.name}</span>
                  <span className="text-xs text-slate-400">
                    {formatForecastPeriod(forecast.forecastStartDate, forecast.forecastEndDate)}
                  </span>
                </div>
              </SelectItem>
            ))
          ) : (
            <SelectItem value="no-forecasts" disabled className="text-slate-400">
              No forecasts available for this organization
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function ForecastDisplayPage() {
  const [selectedForecastId, setSelectedForecastId] = useState<string | null>(null);
  const [isForecastLoaded, setIsForecastLoaded] = useState(false);
  
  const currentOrganization = useOrganizationStore((state) => state.currentOrganization);
  
  // Get forecasts from store
  const { organizationForecasts: forecasts, isLoading: isForecastListLoading, error: forecastError } = useForecastGraph();
  const { loadForecast } = useForecastGraphActions();
  
  // Get forecast data and unified calculation results
  const { forecastName, forecastStartDate, forecastEndDate } = useForecastGraph();
  const { calculationResults, isCalculating, calculationError } = useCalculations();
  const { loadUnifiedCalculationResults } = useCalculationActions();

  // Get selected forecast details
  const selectedForecast = selectedForecastId 
    ? forecasts.find((f: any) => f.id === selectedForecastId) 
    : null;

  // Helper to map forecast fields to camelCase for UI
  const getForecastMetadataFromApi = (forecast: any) => {
    if (!forecast) return null;
    return {
      id: forecast.id,
      name: forecast.name,
      startDate: forecast.forecastStartDate || '',
      endDate: forecast.forecastEndDate || '',
      updatedAt: forecast.updatedAt || '',
      organizationId: forecast.organizationId || null,
    };
  };

  const selectedForecastMeta = getForecastMetadataFromApi(selectedForecast);

  // Load forecast when selection changes
  useEffect(() => {
    const fetchAndLoadForecast = async () => {
      if (selectedForecastMeta && !isForecastLoaded) {
        try {
          const response = await forecastApi.getForecast(selectedForecastMeta.id);
          if (response.error || !response.data) {
            throw new Error(response.error?.message || 'Failed to load forecast details.');
          }
          const clientData = mapForecastToClientFormat(response.data);
          loadForecast(clientData);
          setIsForecastLoaded(true);

          // Auto-load existing calculation results
          console.log('[ForecastDisplayPage] Auto-loading calculation results for forecast');
          try {
            await loadUnifiedCalculationResults();
            console.log('[ForecastDisplayPage] Auto-loaded existing calculation results');
          } catch (loadError) {
            console.log('[ForecastDisplayPage] No existing calculation results found or failed to load:', loadError);
          }
        } catch (err) {
          console.error('Error loading forecast:', err);
        }
      } else if (!selectedForecastMeta) {
        setIsForecastLoaded(false);
      }
    };
    fetchAndLoadForecast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedForecastMeta, loadForecast, isForecastLoaded, loadUnifiedCalculationResults]);

  const handleForecastSelect = (forecastId: string) => {
    if (forecastId === 'no-forecasts' || forecastId === 'loading') return;
    setSelectedForecastId(forecastId);
    setIsForecastLoaded(false); // Reset to trigger reload
  };

  // Check if we have data to display results
  const hasCalculationData = calculationResults;
  const showResults = selectedForecast && hasCalculationData;

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container py-10 space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Forecast Display</h1>
            <p className="text-slate-400 mt-1">
              Configure periods and analyze unified forecast results with historical comparison
            </p>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <BarChart3 className="h-5 w-5" />
            <span className="text-sm">
              {currentOrganization?.name || 'No organization selected'}
            </span>
          </div>
        </div>

        {/* Forecast Selection */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100">Forecast Selection</CardTitle>
            <CardDescription className="text-slate-400">
              Choose a forecast to configure periods and view unified calculation results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ForecastSelector
              selectedForecastId={selectedForecastId}
              onForecastSelect={handleForecastSelect}
              forecasts={forecasts}
              isLoading={isForecastListLoading}
              error={forecastError}
            />
            
            {selectedForecastMeta && (
              <div className="mt-4 p-4 bg-slate-700 rounded-lg border border-slate-600">
                <h3 className="text-lg font-medium text-slate-100 mb-2">
                  {selectedForecastMeta.name}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Forecast Period:</span>
                    <div className="text-slate-200 font-medium">
                      {formatForecastPeriod(selectedForecastMeta.startDate, selectedForecastMeta.endDate)}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Last Updated:</span>
                    <div className="text-slate-200 font-medium">
                      {formatDateSafe(selectedForecastMeta.updatedAt, 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Period Management & Unified Calculation */}
        {selectedForecast && (
          <>
            <PeriodManagementPanel />
            
            {/* Calculation Status */}
            {isCalculating && (
              <Alert className="mt-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Calculating all value types (historical, forecast, budget)...
                </AlertDescription>
              </Alert>
            )}
            
            {/* Calculation Errors */}
            {calculationError && (
              <Alert className="mt-4 border-red-600 text-red-400">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Unified calculation error: {calculationError}
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* Results Display — ForecastResultsTable provides its own card ("Unified Forecast Results") */}
        {selectedForecast && (
          showResults ? (
            <ForecastResultsTable />
          ) : (
            <div className="rounded-lg border border-slate-700 bg-slate-800">
              <div className="flex items-center justify-center py-16 px-4">
                <div className="text-center max-w-md">
                  <BarChart3 className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-300 mb-2">
                    No Calculation Results
                  </h3>
                  <p className="text-slate-400 text-sm">
                    {forecastName ? (
                      <>
                        Forecast is loaded. Configure periods above and trigger unified calculation
                        to see results for all value types (historical, forecast, budget).
                      </>
                    ) : (
                      <>
                        Forecast data is still loading. Please wait for the forecast
                        configuration to complete.
                      </>
                    )}
                  </p>
                  {isForecastLoaded && forecastName && (
                    <div className="mt-4 text-xs text-slate-500">
                      Forecast: {forecastName}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        )}

        {/* No Forecast Selected State */}
        {!selectedForecast && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="flex items-center justify-center py-16">
              <div className="text-center">
                <BarChart3 className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-300 mb-2">
                  Select a Forecast
                </h3>
                <p className="text-slate-400 text-sm max-w-md">
                  Choose a forecast from the dropdown above to configure periods and view 
                  unified calculation results with historical, forecast, and budget data.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 