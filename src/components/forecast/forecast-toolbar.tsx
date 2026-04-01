'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { 
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  useForecastGraph,
  useForecastGraphActions,
  useCalculations,
  useCalculationActions,
  useSelectedNode
} from '@/lib/store/forecast-graph-store/hooks';
import { ForecastNodeKind } from '@/lib/store/forecast-graph-store/types';
import { calculateSmartNodePosition } from '@/lib/store/forecast-graph-store/utils';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '@/components/ui/use-toast';
import NodeConfigPanel from '@/components/forecast/node-config-panel';
import { GraphValidationDisplay } from './graph-validation-display';
import { CalculationErrorBoundary } from './calculation-error-boundary';
import { GraphConverter } from '@/lib/services/forecast-calculation/graph-converter';
import { 
  Save, 
  Trash2,
  Copy,
  Database, 
  Pencil,
  Calculator,
  BarChart3,
  Flame,
  ArrowLeft,
  RefreshCw,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';

interface ForecastToolbarProps {
  onSave: () => Promise<void>;
  onBack: () => void;
  onReload?: () => Promise<void>;
}

// Custom date picker component since we don't have the full shadcn DatePicker
interface SimpleDatePickerProps {
  date?: string | null;
  setDate: (date?: string) => void;
  placeholder?: string;
  id?: string;
}

const SimpleDatePicker: React.FC<SimpleDatePickerProps> = ({ 
  date, 
  setDate, 
  placeholder,
  id
}: SimpleDatePickerProps) => {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    // Initialize month based on current date or today
    return date ? new Date(date) : new Date();
  });
  
  const selectedDate = date ? new Date(date) : undefined;
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700",
            !date && "text-slate-400"
          )}
          aria-label={date || placeholder || "Pick a date"}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date || placeholder || "Pick a date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-slate-800 border-slate-600" role="dialog">
        <Calendar
          mode="single"
          selected={selectedDate}
          month={month}
          onMonthChange={setMonth}
          onSelect={(d: Date | undefined) => {
            if (d) {
              // Format to YYYY-MM-DD using local date parts to avoid timezone issues
              const year = d.getFullYear();
              const month = (d.getMonth() + 1).toString().padStart(2, '0');
              const day = d.getDate().toString().padStart(2, '0');
              setDate(`${year}-${month}-${day}`);
            } else {
              setDate(undefined);
            }
            // Close the popover after selection
            setOpen(false);
          }}
          initialFocus
          className="bg-slate-800 text-slate-200"
        />
      </PopoverContent>
    </Popover>
  );
};

const ForecastToolbar: React.FC<ForecastToolbarProps> = ({ onSave, onBack, onReload }) => {
  const { toast } = useToast();
  
  // Unsaved changes dialog state
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  
  // Get state from grouped hooks
  const { 
    forecastId,
    forecastName,
    forecastStartDate,
    forecastEndDate,
    organizationId,
    nodes,
    edges,
    isDirty,
    selectedNodeId,
    configPanelOpen,
    lastEditedNodePosition
  } = useForecastGraph();
  
  const selectedNode = useSelectedNode();
  
  const { 
    graphValidation,
    isValidatingGraph,
    isCalculating,
    calculationError,
    calculationResults
  } = useCalculations();
  
  const { 
    addNode,
    setForecastMetadata,
    resetStore,
    setSelectedNodeId,
    setConfigPanelOpen,
    duplicateNodeWithEdges
  } = useForecastGraphActions();
  
  const { 
    calculateUnified,
    setGraphValidation
  } = useCalculationActions();
  
  
  // Handle save with validation
  const handleSave = async () => {
    if (!forecastName) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a name for the forecast.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!forecastStartDate || !forecastEndDate) {
      toast({
        title: 'Validation Error',
        description: 'Please provide both start and end dates for the forecast.',
        variant: 'destructive',
      });
      return;
    }
    
    await onSave();
  };

  const checkUnsavedChanges = (action: () => void) => {
    if (isDirty) {
      setPendingAction(() => action);
      setUnsavedDialogOpen(true);
    } else {
      action();
    }
  };

  const executePendingAction = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    setUnsavedDialogOpen(false);
  };

  const handleReload = async () => {
    if (onReload) {
      await onReload();
    }
  };

  // Smart node positioning
  const generateNodePosition = (): { x: number; y: number } => {
    if (lastEditedNodePosition) {
      return calculateSmartNodePosition(lastEditedNodePosition, nodes);
    }
    
    // Default position if no last edited position
    return { x: 300, y: 200 };
  };

  const handleAddNode = (nodeKind: ForecastNodeKind) => {
    const position = generateNodePosition();
    addNode({
      type: nodeKind,
      data: {},
      position
    });
  };

  const handleOpenNodeConfig = () => {
    if (selectedNodeId) {
      setConfigPanelOpen(true);
    } else {
      toast({
        title: 'No Node Selected',
        description: 'Please select a node to configure.',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicateNode = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    if (!selectedNodeId) {
      toast({
        title: 'No Node Selected',
        description: 'Please select a node to duplicate.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedNode) {
      console.error('Selected node not found in nodes array');
      return;
    }

    try {
      const newNodeId = duplicateNodeWithEdges(selectedNodeId);
      
      if (newNodeId) {
        toast({
          title: 'Node Duplicated',
          description: `${selectedNode.type} node duplicated successfully.`,
        });
      } else {
        throw new Error('Duplication failed');
      }
    } catch (error) {
      console.error('Error duplicating node:', error);
      toast({
        title: 'Duplication Failed',
        description: 'Failed to duplicate the selected node. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // NEW: Updated calculation method to use unified system (Phase 7)
  const handleCalculate = async () => {
    if (!forecastId || !organizationId) {
      toast({
        title: 'Calculation Error',
        description: 'Missing forecast or organization information.',
        variant: 'destructive',
      });
      return;
    }

    if (isDirty) {
      toast({
        title: 'Save Required',
        description: 'Please save your changes before calculating the forecast.',
        variant: 'destructive',
      });
      return;
    }

    if (!hasMetricNodes) {
      toast({
        title: 'Metric Required',
        description: 'Add at least one METRIC node to calculate the forecast.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Automatically validate graph before calculation
      console.log(`[ForecastToolbar] Validating graph before unified calculation`);
      const graphConverter = new GraphConverter();
      const validation = graphConverter.validateGraph(nodes, edges);
      setGraphValidation(validation);
      
      if (!validation.isValid) {
        toast({
          title: 'Graph Validation Failed',
          description: `Found ${validation.errors.length} error(s): ${validation.errors.join(', ')}`,
          variant: 'destructive',
        });
        return;
      }

      if (validation.warnings.length > 0) {
        console.warn('[ForecastToolbar] Graph validation warnings:', validation.warnings);
      }

      // NEW: Use unified calculation system (Phase 7)
      console.log(`[ForecastToolbar] Starting unified calculation for forecast ${forecastId}`);
      await calculateUnified({
        calculationTypes: ['forecast', 'historical', 'budget'],
        includeIntermediateNodes: true,
      });
      
      toast({
        title: 'Unified Calculation Complete',
        description: 'All calculation types (forecast, historical, budget) completed successfully.',
      });
    } catch (error) {
      console.error('[ForecastToolbar] Unified calculation failed:', error);
      
      // Handle specific error types with better guidance
      let title = 'Calculation Failed';
      let description = 'An unknown error occurred';
      
      if (error instanceof Error) {
        const errorMessage = error.message;
        
        // Period configuration errors
        if (errorMessage.includes('Period validation') || errorMessage.includes('MM-YYYY')) {
          title = 'Period Configuration Error';
          description = 'Invalid period configuration. Please check forecast periods in the display page.';
        }
        // Historical data errors
        else if (errorMessage.includes('Historical data for') && errorMessage.includes('not found')) {
          title = 'Missing Historical Data';
          description = errorMessage.replace('Missing historical data: ', '');
        }
        // Variable configuration errors
        else if (errorMessage.includes('Historical variable') && errorMessage.includes('not found')) {
          title = 'Variable Configuration Error';
          description = errorMessage.replace('Variable configuration error: ', '');
        }
        // Metric configuration errors
        else if (errorMessage.includes('has no historical variable configured')) {
          title = 'Metric Configuration Required';
          description = errorMessage.replace('Configuration error: ', '');
        }
        // Graph structure errors
        else if (errorMessage.includes('not found in calculation trees')) {
          title = 'Graph Structure Error';
          description = errorMessage.replace('Graph structure error: ', '');
        }
        // Node evaluation errors
        else if (errorMessage.includes('Node evaluation failed')) {
          title = 'Node Calculation Error';
          description = errorMessage.replace('Node calculation error: ', '');
        }
        // Data integrity issues
        else if (errorMessage.includes('Data integrity issue') || errorMessage.includes('out of sync')) {
          title = 'Data Sync Required';
          description = 'Your graph data needs to be saved. Please save your changes and try calculating again.';
        }
        // SEED node configuration errors
        else if (errorMessage.includes('non-existent metric') || errorMessage.includes('SEED node')) {
          title = 'Graph Configuration Error';
          description = 'A SEED node references a metric that no longer exists. Please check your SEED node configurations or save your current changes.';
        }
        // Generic error message
        else {
          description = errorMessage;
        }
      }
      
      toast({
        title,
        description,
        variant: 'destructive',
        duration: 8000, // Show error messages longer for better readability
      });
    } finally {
    }
  };

  // Check if there are any METRIC nodes in the graph
  const hasMetricNodes = nodes.some(node => node.type === 'METRIC');

  return (
    <CalculationErrorBoundary>
      <div className="space-y-6">
      {/* Forecast Metadata Section */}
      <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
        <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
          Forecast Details
        </h3>
        <div className="space-y-3">
          <div>
            <label htmlFor="forecastName" className="text-sm font-medium text-slate-300 mb-1 block">Forecast Name</label>
            <Input
              id="forecastName"
              value={forecastName}
              onChange={(e) => setForecastMetadata({ name: e.target.value })}
              placeholder="Enter forecast name"
              className="bg-slate-800 border-slate-600 text-slate-200 placeholder:text-slate-400"
            />
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label htmlFor="forecastStartDate" className="text-sm font-medium text-slate-300 mb-1 block">Start Date</label>
              <SimpleDatePicker
                id="forecastStartDate"
                date={forecastStartDate}
                setDate={(date) => setForecastMetadata({ startDate: date })}
                placeholder="Select start date"
              />
            </div>
            
            <div>
              <label htmlFor="forecastEndDate" className="text-sm font-medium text-slate-300 mb-1 block">End Date</label>
              <SimpleDatePicker
                id="forecastEndDate"
                date={forecastEndDate}
                setDate={(date) => setForecastMetadata({ endDate: date })}
                placeholder="Select end date"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Node Creation Section */}
      <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
        <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
          Add Nodes
        </h3>
        <div className="grid grid-cols-1 gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleAddNode('DATA')}
            className="flex items-center gap-2 justify-start bg-slate-800 hover:bg-blue-700 border-blue-500 text-blue-400 hover:text-white"
          >
            <Database className="h-4 w-4" />
            Data
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleAddNode('CONSTANT')}
            className="flex items-center gap-2 justify-start bg-slate-800 hover:bg-green-700 border-green-500 text-green-400 hover:text-white"
          >
            <Pencil className="h-4 w-4" />
            Constant
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleAddNode('OPERATOR')}
            className="flex items-center gap-2 justify-start bg-slate-800 hover:bg-yellow-700 border-yellow-500 text-yellow-400 hover:text-white"
          >
            <Calculator className="h-4 w-4" />
            Operator
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleAddNode('METRIC')}
            className="flex items-center gap-2 justify-start bg-slate-800 hover:bg-purple-700 border-purple-500 text-purple-400 hover:text-white"
          >
            <BarChart3 className="h-4 w-4" />
            Metric
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleAddNode('SEED')}
            className="flex items-center gap-2 justify-start bg-slate-800 hover:bg-red-700 border-red-500 text-red-400 hover:text-white"
          >
            <Flame className="h-4 w-4" />
            Seed
          </Button>
        </div>
      </div>
      
      {/* Node Configuration Section */}
      <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
        <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
          Node Actions
        </h3>
        <div className="flex flex-col gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleOpenNodeConfig}
            disabled={!selectedNodeId}
            className="flex items-center gap-2 justify-start bg-slate-800 hover:bg-slate-600 border-slate-500 text-slate-300 hover:text-white disabled:opacity-50"
          >
            <Pencil className="h-4 w-4" />
            Configure Selected Node
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDuplicateNode}
            disabled={!selectedNodeId}
            className="flex items-center gap-2 justify-start bg-slate-800 hover:bg-slate-600 border-slate-500 text-slate-300 hover:text-white disabled:opacity-50"
          >
            <Copy className="h-4 w-4" />
            Duplicate Selected Node
          </Button>
        </div>
      </div>
      
      {/* Graph Validation Section */}
      <GraphValidationDisplay onValidate={async () => {
        const graphConverter = new GraphConverter();
        const validation = graphConverter.validateGraph(nodes, edges);
        setGraphValidation(validation);
      }} />
      
      {/* NEW: Unified Calculation Section (Phase 7) */}
      <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
        <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
          Unified Calculation
        </h3>
        <div className="space-y-3">
          <Button 
            onClick={handleCalculate}
            disabled={isCalculating || isDirty || !hasMetricNodes}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            {isCalculating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Calculator className="mr-2 h-4 w-4" />
                Calculate All (Forecast, Historical, Budget)
              </>
            )}
          </Button>
          
          {calculationError && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Calculation Error</div>
                  <div className="mt-1">{calculationError}</div>
                </div>
              </div>
            </div>
          )}
          
          {calculationResults && (
            <div className="p-3 bg-green-900/50 border border-green-700 rounded text-green-200 text-sm">
              <div className="flex items-start gap-2">
                <BarChart3 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Calculation Complete</div>
                  <div className="mt-1">
                    Types: {calculationResults.calculationTypes?.join(', ') || 'Unknown'}
                  </div>
                  <div className="text-xs text-green-300 mt-1">
                    Last calculated: {calculationResults.calculatedAt ? new Date(calculationResults.calculatedAt).toLocaleString() : 'Unknown'}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {isDirty && (
            <div className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-700 rounded p-2">
              <AlertTriangle className="h-3 w-3 inline mr-1" />
              Save your changes before calculating
            </div>
          )}
          
          {!hasMetricNodes && (
            <div className="text-xs text-orange-400 bg-orange-900/20 border border-orange-700 rounded p-2">
              <AlertTriangle className="h-3 w-3 inline mr-1" />
              Add at least one METRIC node to calculate
            </div>
          )}
        </div>
      </div>
      
      {/* Control Actions Section */}
      <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
        <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
          Actions
        </h3>
        <div className="flex flex-col gap-2">
          <Button 
            onClick={handleSave}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Forecast
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => checkUnsavedChanges(onBack)}
            className="w-full bg-slate-800 hover:bg-slate-600 border-slate-500 text-slate-300 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to List
          </Button>
          
          {onReload && (
            <Button 
              variant="outline" 
              onClick={() => checkUnsavedChanges(handleReload)}
              className="w-full bg-slate-800 hover:bg-slate-600 border-slate-500 text-slate-300 hover:text-white"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload Forecast
            </Button>
          )}
        </div>
      </div>
      
      {/* Node Configuration Panel */}
      <NodeConfigPanel 
        open={configPanelOpen}
        onOpenChange={setConfigPanelOpen}
      />
      
      {/* Unsaved Changes Dialog */}
      <AlertDialog open={unsavedDialogOpen} onOpenChange={setUnsavedDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-200">Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              You have unsaved changes. Are you sure you want to continue without saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-slate-200 hover:bg-slate-600 border-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={executePendingAction} className="bg-red-600 hover:bg-red-700 text-white">
              Continue Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </CalculationErrorBoundary>
  );
};

export default ForecastToolbar; 