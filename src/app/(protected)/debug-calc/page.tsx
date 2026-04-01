'use client';

import { useState, useEffect } from 'react';
import { useOrganizationStore } from '@/lib/store/organization';
import { 
  useForecastGraph,
  useForecastGraphActions
} from '@/lib/store/forecast-graph-store/hooks';
import { useDebug, useDebugActions, useDebugComputed } from '@/lib/store/forecast-graph-store/hooks/use-debug';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Bug, 
  AlertCircle, 
  PlayCircle, 
  TreePine, 
  List,
  BarChart3,
  Settings2,
  Download,
  Maximize2
} from 'lucide-react';
import { format } from 'date-fns';
import { Forecast } from '@/lib/api/forecast';
import { forecastApi, mapForecastToClientFormat } from '@/lib/api/forecast';
import { createDefaultDebugRequest, formatExecutionTime } from '@/lib/api/debug-calculation';
import type { DebugLevel, CalculationType } from '@/types/debug';
import { CalculationTreeVisualization } from '@/components/forecast/calculation-tree-visualization';
import { StepExecutionLog } from '@/components/forecast/step-execution-log';
import { NodeDebugDetails } from '@/components/forecast/node-debug-details';
import { PerformanceMetrics } from '@/components/forecast/performance-metrics';
import { DebugExportModal } from '@/components/forecast/debug-export-modal';

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
        Select Forecast for Debug Analysis
      </label>
      <Select 
        value={selectedForecastId || ''} 
        onValueChange={onForecastSelect}
        disabled={isLoading}
      >
        <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-200">
          <SelectValue placeholder={isLoading ? "Loading forecasts..." : "Select a forecast to debug"} />
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

interface DebugConfigurationProps {
  onTriggerDebug: (config: any) => void;
  isDebugging: boolean;
}

function DebugConfiguration({ onTriggerDebug, isDebugging }: DebugConfigurationProps) {
  const [debugLevel, setDebugLevel] = useState<DebugLevel>('detailed');
  const [calculationTypes, setCalculationTypes] = useState<Set<CalculationType>>(
    new Set(['historical', 'forecast', 'budget'] as CalculationType[])
  );
  const [includeIntermediateNodes, setIncludeIntermediateNodes] = useState(true);
  const [includePerformanceMetrics, setIncludePerformanceMetrics] = useState(true);
  const [includeMemoryUsage, setIncludeMemoryUsage] = useState(false);

  const handleTriggerDebug = () => {
    const config = {
      debugLevel,
      calculationTypes: Array.from(calculationTypes),
      includeIntermediateNodes,
      includePerformanceMetrics,
      includeMemoryUsage
    };
    onTriggerDebug(config);
  };

  const toggleCalculationType = (type: CalculationType) => {
    const newTypes = new Set(calculationTypes);
    if (newTypes.has(type)) {
      newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    setCalculationTypes(newTypes);
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-100">
          <Settings2 className="h-5 w-5" />
          Debug Configuration
        </CardTitle>
        <CardDescription className="text-slate-400">
          Configure the level of detail and types of calculations to debug
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Debug Level */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Debug Level</label>
          <Select value={debugLevel} onValueChange={(value: DebugLevel) => setDebugLevel(value)}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              <SelectItem value="basic" className="text-slate-200">
                Basic (100 steps max)
              </SelectItem>
              <SelectItem value="detailed" className="text-slate-200">
                Detailed (1000 steps max)
              </SelectItem>
              <SelectItem value="verbose" className="text-slate-200">
                Verbose (10000 steps max)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Calculation Types */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Calculation Types</label>
          <div className="flex flex-wrap gap-2">
            {(['historical', 'forecast', 'budget'] as CalculationType[]).map((type) => (
              <Button
                key={type}
                variant={calculationTypes.has(type) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleCalculationType(type)}
                className={calculationTypes.has(type) 
                  ? "bg-blue-600 hover:bg-blue-700" 
                  : "border-slate-600 text-slate-300 hover:bg-slate-700"
                }
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-300">Debug Options</label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={includeIntermediateNodes}
                onChange={(e) => setIncludeIntermediateNodes(e.target.checked)}
                className="rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-300">Include intermediate nodes</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={includePerformanceMetrics}
                onChange={(e) => setIncludePerformanceMetrics(e.target.checked)}
                className="rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-300">Include performance metrics</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={includeMemoryUsage}
                onChange={(e) => setIncludeMemoryUsage(e.target.checked)}
                className="rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-300">Include memory usage</span>
            </label>
          </div>
        </div>

        {/* Trigger Button */}
        <Button
          onClick={handleTriggerDebug}
          disabled={isDebugging || calculationTypes.size === 0}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50"
        >
          {isDebugging ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running Debug Calculation...
            </>
          ) : (
            <>
              <PlayCircle className="h-4 w-4 mr-2" />
              Run Debug Calculation
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

interface DebugResultsOverviewProps {
  debugResults: any;
  onViewModeChange: (mode: 'tree' | 'steps' | 'metrics' | 'split') => void;
  currentViewMode: 'tree' | 'steps' | 'metrics' | 'split';
  onExportClick: () => void;
}

function DebugResultsOverview({ debugResults, onViewModeChange, currentViewMode, onExportClick }: DebugResultsOverviewProps) {
  if (!debugResults) return null;

  const { debugInfo } = debugResults;
  const { calculationSteps, calculationTree, performanceMetrics } = debugInfo;

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <Bug className="h-5 w-5" />
              Debug Results Overview
            </CardTitle>
            <CardDescription className="text-slate-400">
              Calculation completed at {formatDateSafe(debugResults.calculatedAt, 'MMM d, yyyy HH:mm:ss')}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="border-slate-600 text-slate-300"
                onClick={onExportClick}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-700 p-4 rounded-lg">
            <div className="text-2xl font-bold text-slate-100">{calculationSteps.length}</div>
            <div className="text-sm text-slate-400">Calculation Steps</div>
          </div>
          <div className="bg-slate-700 p-4 rounded-lg">
            <div className="text-2xl font-bold text-slate-100">{calculationTree.totalNodes}</div>
            <div className="text-sm text-slate-400">Total Nodes</div>
          </div>
          <div className="bg-slate-700 p-4 rounded-lg">
            <div className="text-2xl font-bold text-slate-100">
              {formatExecutionTime(performanceMetrics.totalExecutionTimeMs)}
            </div>
            <div className="text-sm text-slate-400">Execution Time</div>
          </div>
          <div className="bg-slate-700 p-4 rounded-lg">
            <div className="text-2xl font-bold text-slate-100">
              {performanceMetrics.cacheHitRate.toFixed(1)}%
            </div>
            <div className="text-sm text-slate-400">Cache Hit Rate</div>
          </div>
        </div>

        {/* Calculation Types */}
        <div>
          <label className="text-sm font-medium text-slate-300 mb-2 block">Calculation Types</label>
          <div className="flex gap-2">
            {debugResults.calculationTypes.map((type: string) => (
              <Badge key={type} variant="secondary" className="bg-blue-900 text-blue-200">
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Badge>
            ))}
          </div>
        </div>

        {/* View Mode Selector */}
        <div>
          <label className="text-sm font-medium text-slate-300 mb-2 block">View Mode</label>
          <div className="flex gap-2">
            {([
              { mode: 'tree', icon: TreePine, label: 'Tree View' },
              { mode: 'steps', icon: List, label: 'Steps Log' },
              { mode: 'metrics', icon: BarChart3, label: 'Metrics' },
              { mode: 'split', icon: Settings2, label: 'Split View' }
            ] as const).map(({ mode, icon: Icon, label }) => (
              <Button
                key={mode}
                variant={currentViewMode === mode ? "default" : "outline"}
                size="sm"
                onClick={() => onViewModeChange(mode)}
                className={currentViewMode === mode 
                  ? "bg-blue-600 hover:bg-blue-700" 
                  : "border-slate-600 text-slate-300 hover:bg-slate-700"
                }
              >
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Errors and Warnings */}
        {(debugInfo.errors?.length > 0 || debugInfo.warnings?.length > 0) && (
          <div className="space-y-3">
            {debugInfo.errors?.length > 0 && (
              <Alert className="border-red-600 bg-red-900/20">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-300">
                  <div className="font-medium mb-2">
                    {debugInfo.errors.length} error(s) detected during calculation
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-red-200/90">
                    {debugInfo.errors.map((msg: string, i: number) => (
                      <li key={`err-${i}`}>{msg}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            {debugInfo.warnings?.length > 0 && (
              <Alert className="border-yellow-600 bg-yellow-900/20">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-yellow-200">
                  <div className="font-medium mb-2">
                    {debugInfo.warnings.length} warning(s) detected during calculation
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-yellow-100/90">
                    {debugInfo.warnings.map((msg: string, i: number) => (
                      <li key={`warn-${i}`}>{msg}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DebugCalcPage() {
  const [selectedForecastId, setSelectedForecastId] = useState<string | null>(null);
  const [isForecastLoaded, setIsForecastLoaded] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  
  const currentOrganization = useOrganizationStore((state) => state.currentOrganization);
  
  // Debug organization state
  console.log('[DebugPage] Current organization:', currentOrganization?.id, currentOrganization?.name);
  
  // Get forecasts from store
  const { organizationForecasts: forecasts, isLoading: isForecastListLoading, error: forecastError } = useForecastGraph();
  const { loadForecast, loadOrganizationForecasts } = useForecastGraphActions();
  
  // Debug logging for forecasts
  console.log('[DebugPage] Available forecasts count:', forecasts.length);
  if (forecasts.length > 0) {
    console.log('[DebugPage] First forecast sample:', forecasts[0]);
  }
  
  // Get debug state and actions
  const debug = useDebug();
  const debugActions = useDebugActions();
  const debugComputed = useDebugComputed();

  // Get selected forecast details
  const selectedForecast = selectedForecastId 
    ? forecasts.find((f: any) => f.id === selectedForecastId) 
    : null;
    
  // Debug logging for selected forecast
  console.log('[DebugPage] Selected forecast ID:', selectedForecastId);
  console.log('[DebugPage] Selected forecast found:', !!selectedForecast);

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
  
  // Debug logging for key states
  console.log('[DebugPage] Key states:', {
    hasSelectedForecast: !!selectedForecast,
    isForecastLoaded,
    hasSelectedMeta: !!selectedForecastMeta,
    isDebugging: debug.isDebugging,
    hasDebugResults: !!debug.debugResults,
    debugError: debug.debugError
  });

  // Load organization forecasts when component mounts
  useEffect(() => {
    const loadForecasts = async () => {
      if (currentOrganization?.id && forecasts.length === 0 && !isForecastListLoading) {
        try {
          console.log('[DebugPage] Loading organization forecasts for:', currentOrganization.id);
          await loadOrganizationForecasts(currentOrganization.id);
        } catch (error) {
          console.error('[DebugPage] Failed to load organization forecasts:', error);
        }
      }
    };
    loadForecasts();
  }, [currentOrganization?.id, forecasts.length, isForecastListLoading, loadOrganizationForecasts]);

  // Load forecast when selection changes
  useEffect(() => {
    const fetchAndLoadForecast = async () => {
      if (selectedForecastMeta && !isForecastLoaded) {
        try {
          console.log('[DebugPage] Loading forecast:', selectedForecastMeta.id);
          const response = await forecastApi.getForecast(selectedForecastMeta.id);
          if (response.error || !response.data) {
            console.error('[DebugPage] Failed to load forecast:', response.error);
            throw new Error(response.error?.message || 'Failed to load forecast details.');
          }
          const clientData = mapForecastToClientFormat(response.data);
          loadForecast(clientData);
          setIsForecastLoaded(true);

          // Clear any previous debug data when switching forecasts
          debugActions.clearDebugData();
          console.log('[DebugPage] Forecast loaded successfully');
        } catch (err) {
          console.error('[DebugPage] Error loading forecast:', err);
        }
      } else if (!selectedForecastMeta) {
        setIsForecastLoaded(false);
      }
    };
    fetchAndLoadForecast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedForecastMeta, loadForecast, isForecastLoaded, debugActions]);

  const handleForecastSelect = (forecastId: string) => {
    if (forecastId === 'no-forecasts' || forecastId === 'loading') return;
    setSelectedForecastId(forecastId);
    setIsForecastLoaded(false); // Reset to trigger reload
  };

  const handleTriggerDebug = async (config: any) => {
    try {
      await debugActions.triggerDebugCalculation(config);
    } catch (error) {
      console.error('Debug calculation failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container py-10 space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Debug Calc</h1>
            <p className="text-slate-400 mt-1">
              Debug and analyze forecast calculations step-by-step with detailed performance metrics
            </p>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Bug className="h-5 w-5" />
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
              Choose a forecast to debug and analyze its calculation process
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

        {/* Debug Configuration */}
        {selectedForecast && isForecastLoaded && (
          <DebugConfiguration 
            onTriggerDebug={handleTriggerDebug}
            isDebugging={debug.isDebugging}
          />
        )}

        {/* Debug Errors */}
        {debug.debugError && (
          <Alert className="border-red-600 bg-red-900/20">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-400">
              Debug calculation error: {debug.debugError}
            </AlertDescription>
          </Alert>
        )}

        {/* Results Overview */}
        {debug.debugResults && (
          <DebugResultsOverview 
            debugResults={debug.debugResults}
            onViewModeChange={debugActions.setViewMode}
            currentViewMode={debug.viewMode}
            onExportClick={() => setIsExportModalOpen(true)}
          />
        )}

        {/* Debug Visualization Components */}
        {debug.debugResults && (
          <>
            {/* Tree View */}
            {(debug.viewMode === 'tree' || debug.viewMode === 'split') && (
              <CalculationTreeVisualization
                tree={debug.calculationTree!}
                selectedNode={debug.selectedNode || undefined}
                onNodeSelect={debugActions.selectNode}
                onNodeHover={(nodeId) => {
                  // Optional: implement hover effects
                }}
                highlightedNodes={new Set()}
                expandedNodes={debug.expandedNodes}
                onNodeToggle={debugActions.toggleNodeExpansion}
              />
            )}

            {/* Step Execution Log */}
            {(debug.viewMode === 'steps' || debug.viewMode === 'split') && (
              <StepExecutionLog
                steps={debugComputed.filteredSteps}
                selectedStep={debug.selectedStep || undefined}
                onStepSelect={debugActions.selectStep}
                filters={debug.filters}
                onFiltersChange={debugActions.updateDebugFilters}
                calculationTree={debug.calculationTree}
              />
            )}

            {/* Performance Metrics */}
            {debug.viewMode === 'metrics' && (
              <PerformanceMetrics
                metrics={debug.debugResults.debugInfo.performanceMetrics}
                onNodeFocus={(nodeIdOrAction) => {
                  if (nodeIdOrAction === 'export') {
                    setIsExportModalOpen(true);
                  } else {
                    debugActions.selectNode(nodeIdOrAction);
                  }
                }}
              />
            )}

            {/* Split View Layout */}
            {debug.viewMode === 'split' && debug.debugResults && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Performance Summary */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-100">
                      <BarChart3 className="h-5 w-5" />
                      Performance Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-slate-700 rounded">
                        <div className="text-lg font-bold text-slate-100">
                          {formatExecutionTime(debug.debugResults.debugInfo.performanceMetrics.totalExecutionTimeMs)}
                        </div>
                        <div className="text-xs text-slate-400">Total Time</div>
                      </div>
                      <div className="text-center p-3 bg-slate-700 rounded">
                        <div className="text-lg font-bold text-slate-100">
                          {debug.debugResults.debugInfo.performanceMetrics.cacheHitRate.toFixed(1)}%
                        </div>
                        <div className="text-xs text-slate-400">Cache Hit Rate</div>
                      </div>
                      <div className="text-center p-3 bg-slate-700 rounded">
                        <div className="text-lg font-bold text-slate-100">
                          {debugComputed.errorCount}
                        </div>
                        <div className="text-xs text-slate-400">Errors</div>
                      </div>
                      <div className="text-center p-3 bg-slate-700 rounded">
                        <div className="text-lg font-bold text-slate-100">
                          {debugComputed.filteredStepCount}
                        </div>
                        <div className="text-xs text-slate-400">Steps</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Node Details (if selected) */}
                {debug.selectedNode && debug.debugResults && debug.calculationTree && (
                  <NodeDebugDetails
                    nodeId={debug.selectedNode}
                    debugResults={debug.debugResults}
                    calculationTree={debug.calculationTree}
                  />
                )}

                {/* Quick Actions */}
                {!debug.selectedNode && (
                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-slate-100">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button
                        variant="outline"
                        className="w-full justify-start border-slate-600 text-slate-300"
                        onClick={() => debugActions.setViewMode('tree')}
                      >
                        <TreePine className="h-4 w-4 mr-2" />
                        Focus on Tree View
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start border-slate-600 text-slate-300"
                        onClick={() => debugActions.setViewMode('steps')}
                      >
                        <List className="h-4 w-4 mr-2" />
                        Focus on Steps Log
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start border-slate-600 text-slate-300"
                        onClick={() => debugActions.setViewMode('metrics')}
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        View Performance Metrics
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start border-slate-600 text-slate-300"
                        onClick={() => debugActions.setAllNodesExpanded(true)}
                      >
                        <Maximize2 className="h-4 w-4 mr-2" />
                        Expand All Tree Nodes
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </>
        )}

        {/* No Forecast Selected State */}
        {!selectedForecast && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="flex items-center justify-center py-16">
              <div className="text-center">
                <Bug className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-300 mb-2">
                  Select a Forecast to Debug
                </h3>
                <p className="text-slate-400 text-sm max-w-md">
                  Choose a forecast from the dropdown above to start debugging its calculation process.
                  You'll be able to see step-by-step execution, performance metrics, and detailed insights.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Export Modal */}
        {debug.debugResults && (
          <DebugExportModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            debugData={debug.debugResults}
          />
        )}
      </div>
    </div>
  );
}
