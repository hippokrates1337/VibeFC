'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Forecast, forecastApi } from '@/lib/api/forecast';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Loader2, BarChart3, Calendar, Clock } from 'lucide-react';
import { useOrganizationStore } from '@/lib/store/organization';
import { useOrganizationForecasts, useIsForecastLoading, useForecastError } from '@/lib/store/forecast-graph-store';
import { useForecastGraphStore } from '@/lib/store/forecast-graph-store';

// Helper function to safely format dates
const formatDateSafe = (dateString: string | null | undefined, formatPattern: string): string => {
  if (!dateString) {
    return 'N/A';
  }
  try {
    const date = new Date(dateString);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    return format(date, formatPattern);
  } catch (error) {
    console.warn(`Error formatting date string "${dateString}":`, error);
    return 'N/A';
  }
};

// Helper function to format forecast period in MM-YYYY format
const formatForecastPeriod = (startDate: string | null | undefined, endDate: string | null | undefined): string => {
  const formattedStart = formatDateSafe(startDate, 'MM-yyyy');
  const formattedEnd = formatDateSafe(endDate, 'MM-yyyy');
  
  if (formattedStart === 'N/A' || formattedEnd === 'N/A') {
    return 'Period not defined';
  }
  
  return `${formattedStart} to ${formattedEnd}`;
};

// Helper function to get forecast summary stats
const getForecastSummary = (forecast: Forecast): string => {
  // Since we don't have access to nodes/edges in the list view,
  // we'll show a meaningful placeholder based on available data
  const startDate = formatDateSafe(forecast.forecastStartDate, 'MMM yyyy');
  const endDate = formatDateSafe(forecast.forecastEndDate, 'MMM yyyy');
  
  if (startDate !== 'N/A' && endDate !== 'N/A') {
    return `Forecast model • ${startDate} - ${endDate}`;
  }
  
  return 'Forecast model ready to edit';
};

// Enhanced graph preview component that shows realistic graph structure
const GraphPreview = ({ forecast }: { forecast: Forecast }) => {
  const [graphSummary, setGraphSummary] = useState<{
    nodeCount: number;
    edgeCount: number;
    nodeTypes: string[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch graph summary when component mounts
  useEffect(() => {
    const fetchGraphSummary = async () => {
      setIsLoading(true);
      try {
        // This is a simple approach - we could optimize this by having a backend endpoint
        // that returns forecasts with summary data in one call
        const response = await forecastApi.getForecast(forecast.id);
        if (response.data) {
          const nodeTypes = response.data.nodes.map(node => node.kind);
          const uniqueNodeTypes = nodeTypes.filter((type, index, arr) => arr.indexOf(type) === index);
          
          setGraphSummary({
            nodeCount: response.data.nodes.length,
            edgeCount: response.data.edges.length,
            nodeTypes: uniqueNodeTypes
          });
        }
      } catch (error) {
        console.warn(`Failed to fetch graph summary for forecast ${forecast.id}:`, error);
        // Fallback to empty graph
        setGraphSummary({
          nodeCount: 0,
          edgeCount: 0,
          nodeTypes: []
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchGraphSummary();
  }, [forecast.id]);

  // Color mapping for different node types
  const getNodeColor = (type: string, index: number) => {
    const colors = {
      'DATA': 'text-blue-400',
      'CONSTANT': 'text-green-400', 
      'OPERATOR': 'text-yellow-400',
      'METRIC': 'text-purple-400',
      'SEED': 'text-red-400'
    };
    return colors[type as keyof typeof colors] || `text-slate-${400 + (index % 3) * 100}`;
  };

  // Generate realistic node positions based on actual data
  const generateNodePositions = (nodeCount: number, nodeTypes: string[]) => {
    if (nodeCount === 0) return [];
    
    const positions = [];
    const maxNodes = Math.min(nodeCount, 8); // Limit visual nodes to keep it clean
    
    for (let i = 0; i < maxNodes; i++) {
      const angle = (i / maxNodes) * 2 * Math.PI;
      const radius = 25;
      const x = 60 + radius * Math.cos(angle);
      const y = 40 + radius * Math.sin(angle);
      const type = nodeTypes[i % nodeTypes.length];
      
      positions.push({ x, y, type, index: i });
    }
    
    return positions;
  };

  // Generate edges based on actual edge count
  const generateEdges = (nodePositions: any[], edgeCount: number) => {
    if (nodePositions.length < 2 || edgeCount === 0) return [];
    
    const edges = [];
    const maxEdges = Math.min(edgeCount, nodePositions.length - 1);
    
    for (let i = 0; i < maxEdges; i++) {
      const sourceIndex = i;
      const targetIndex = (i + 1) % nodePositions.length;
      const source = nodePositions[sourceIndex];
      const target = nodePositions[targetIndex];
      
      edges.push({ source, target });
    }
    
    return edges;
  };

  if (isLoading) {
    return (
      <div className="h-32 flex items-center justify-center bg-slate-700 rounded-md border border-slate-600 p-4">
        <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
      </div>
    );
  }

  const nodePositions = generateNodePositions(graphSummary?.nodeCount || 0, graphSummary?.nodeTypes || []);
  const edges = generateEdges(nodePositions, graphSummary?.edgeCount || 0);

  return (
    <div className="h-32 flex flex-col items-center justify-center bg-slate-700 rounded-md border border-slate-600 p-4 relative overflow-hidden">
      {/* Graph visualization */}
      <div className="absolute inset-0 flex items-center justify-center opacity-50">
        <svg width="120" height="80" viewBox="0 0 120 80" className="text-slate-500">
          {/* Render edges first (behind nodes) */}
          {edges.map((edge, index) => (
            <line
              key={`edge-${index}`}
              x1={edge.source.x}
              y1={edge.source.y}
              x2={edge.target.x}
              y2={edge.target.y}
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-slate-400"
            />
          ))}
          
          {/* Render nodes */}
          {nodePositions.map((node, index) => (
            <circle
              key={`node-${index}`}
              cx={node.x}
              cy={node.y}
              r="4"
              fill="currentColor"
              className={getNodeColor(node.type, node.index)}
            />
          ))}
        </svg>
      </div>
      
      {/* Content */}
      <BarChart3 className="h-8 w-8 text-blue-400 mb-2 relative z-10" />
      <div className="text-center relative z-10">
        {graphSummary && graphSummary.nodeCount > 0 ? (
          <>
            <p className="text-sm text-slate-300 font-medium">
              {graphSummary.nodeCount} nodes, {graphSummary.edgeCount} connections
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {getForecastSummary(forecast)}
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-300 font-medium">
            {getForecastSummary(forecast)}
          </p>
        )}
      </div>
    </div>
  );
};

export default function ForecastDefinitionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const currentOrganizationFromStore = useOrganizationStore((state) => state.currentOrganization);

  const forecasts = useOrganizationForecasts();
  const isForecastListLoading = useIsForecastLoading();
  const forecastError = useForecastError();
  
  // Get the action to load forecasts into the store
  const loadOrganizationForecasts = useForecastGraphStore((state) => state.loadOrganizationForecasts);
  const setForecastLoading = useForecastGraphStore((state) => state.setLoading);
  const setForecastError = useForecastGraphStore((state) => state.setError);

  // Load forecasts when organization changes
  useEffect(() => {
    const fetchForecasts = async () => {
      if (!currentOrganizationFromStore?.id) {
        // Clear forecasts if no organization selected
        loadOrganizationForecasts([]);
        return;
      }

      try {
        setForecastLoading(true);
        setForecastError(null);
        
        const { data, error } = await forecastApi.getForecasts(currentOrganizationFromStore.id);
        
        if (error) {
          console.error('Failed to fetch organization forecasts:', error.message);
          setForecastError(error.message);
          loadOrganizationForecasts([]);
          return;
        }
        
        if (data) {
          loadOrganizationForecasts(data);
        } else {
          loadOrganizationForecasts([]);
        }
      } catch (apiError: any) {
        console.error('Error calling forecastApi.getForecasts:', apiError);
        setForecastError(apiError?.message || 'Failed to fetch forecasts');
        loadOrganizationForecasts([]);
      } finally {
        setForecastLoading(false);
      }
    };

    fetchForecasts();
  }, [currentOrganizationFromStore?.id, loadOrganizationForecasts, setForecastLoading, setForecastError]);

  // Create a new forecast
  const handleCreateForecast = async () => {
    if (!currentOrganizationFromStore?.id) {
      toast({
        title: 'Organization Not Selected',
        description: 'Please select an organization before creating a forecast.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCreating(true);
      
      // Default values for new forecast in ISO 8601 format
      const today = new Date();
      const startDate = today.toISOString(); 
      
      const endDateObj = new Date(today);
      endDateObj.setMonth(endDateObj.getMonth() + 12);
      endDateObj.setDate(0); // Last day of the 11th month from now (12 months total period)
      const endDate = endDateObj.toISOString();
      
      const { data, error } = await forecastApi.createForecast(
        'New Forecast',
        startDate,
        endDate,
        currentOrganizationFromStore.id
      );
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data) {
        router.push(`/forecast-definition/${data.id}`);
      }
    } catch (error: any) {
      console.error('Error creating forecast:', error);
      toast({
        title: 'Error',
        description: 'Failed to create forecast: ' + error.message,
        variant: 'destructive',
      });
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-100">Forecast Definition</h1>
            <p className="text-slate-400 mt-1">
              Create and manage forecast models with our graphical editor
            </p>
          </div>
          <Button 
            onClick={handleCreateForecast} 
            disabled={isCreating}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create New Forecast'
            )}
          </Button>
        </div>
        
        {isForecastListLoading && !isCreating ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : forecastError ? (
          <div className="flex flex-col items-center justify-center mt-10 p-10 border border-slate-700 rounded-lg bg-slate-800">
            <h3 className="text-lg font-medium text-red-400">Error loading forecasts</h3>
            <p className="text-slate-400 mt-1 mb-4">{forecastError}</p>
          </div>
        ) : (
          <>
            {forecasts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {forecasts.map((forecast) => (
                  <Card key={forecast.id} className="overflow-hidden bg-slate-800 border-slate-700 hover:bg-slate-750 transition-colors">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl text-slate-100">{forecast.name}</CardTitle>
                      <CardDescription className="text-slate-400">
                        {formatForecastPeriod(forecast.forecastStartDate, forecast.forecastEndDate)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <GraphPreview forecast={forecast} />
                    </CardContent>
                    <CardFooter className="flex justify-between border-t border-slate-700 p-4 bg-slate-800">
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Updated {formatDateSafe(forecast.updatedAt, 'MMM d, yyyy')}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/forecast-definition/${forecast.id}`)}
                        className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 hover:text-white"
                      >
                        Open Editor
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center mt-10 p-10 border border-slate-700 rounded-lg bg-slate-800">
                <h3 className="text-lg font-medium text-slate-200">No forecasts found</h3>
                <p className="text-slate-400 mt-1 mb-4">Create your first forecast to get started</p>
                <Button onClick={handleCreateForecast} disabled={isCreating} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Forecast'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
        
        <Toaster />
      </div>
    </div>
  );
} 