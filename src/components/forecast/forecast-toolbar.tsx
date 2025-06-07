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
import { useForecastGraphStore, ForecastNodeKind } from '@/lib/store/forecast-graph-store';
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
  
  // Zustand store selectors
  const { 
    forecastId,
    forecastName,
    forecastStartDate,
    forecastEndDate,
    organizationId,
    isDirty,
    selectedNodeId,
    configPanelOpen,
    nodes,
    edges,
    addNode,
    setForecastMetadata,
    resetStore,
    setSelectedNodeId,
    setConfigPanelOpen,
    duplicateNodeWithEdges,
    // Graph validation state
    graphValidation,
    isValidatingGraph,
    setValidatingGraph,
    setGraphValidation,
    // Calculation state
    calculateForecast,
    isCalculating,
    calculationError,
    calculationResults
  } = useForecastGraphStore(
    useShallow((state) => ({
      forecastId: state.forecastId,
      forecastName: state.forecastName,
      forecastStartDate: state.forecastStartDate,
      forecastEndDate: state.forecastEndDate,
      organizationId: state.organizationId,
      isDirty: state.isDirty,
      selectedNodeId: state.selectedNodeId,
      configPanelOpen: state.configPanelOpen,
      nodes: state.nodes,
      edges: state.edges,
      addNode: state.addNode,
      setForecastMetadata: state.setForecastMetadata,
      resetStore: state.resetStore,
      setSelectedNodeId: state.setSelectedNodeId,
      setConfigPanelOpen: state.setConfigPanelOpen,
      duplicateNodeWithEdges: state.duplicateNodeWithEdges,
      // Graph validation state
      graphValidation: state.graphValidation,
      isValidatingGraph: state.isValidatingGraph,
      setValidatingGraph: state.setValidatingGraph,
      setGraphValidation: state.setGraphValidation,
      // Calculation state
      calculateForecast: state.calculateForecast,
      isCalculating: state.isCalculating,
      calculationError: state.calculationError,
      calculationResults: state.calculationResults
    }))
  );
  
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
        description: 'Please provide both start and end dates for the forecast period.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await onSave();
      toast({
        title: 'Success',
        description: 'Forecast saved successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save forecast. Please try again.',
        variant: 'destructive',
      });
      console.error('Save error:', error);
    }
  };
  
  // Check for unsaved changes before destructive actions
  const checkUnsavedChanges = (action: () => void) => {
    if (isDirty) {
      setPendingAction(() => action);
      setUnsavedDialogOpen(true);
    } else {
      action();
    }
  };
  
  // Execute pending action from dialog
  const executePendingAction = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    setUnsavedDialogOpen(false);
  };
  
  // Handle reload with unsaved changes check
  const handleReload = async () => {
    if (!onReload) return;
    
    try {
      await onReload();
      toast({
        title: 'Reloaded',
        description: 'Fresh data loaded from server.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reload data. Please try again.',
        variant: 'destructive',
      });
      console.error('Reload error:', error);
    }
  };
  
  // Add a new node of the specified kind
  const handleAddNode = (nodeKind: ForecastNodeKind) => {
    const nodeId = addNode({ 
      type: nodeKind, 
      data: {}, 
      position: { 
        x: Math.random() * 300 + 50, 
        y: Math.random() * 300 + 50 
      } 
    });
    
    // Select the new node and open configuration panel for it
    setSelectedNodeId(nodeId);
    setConfigPanelOpen(true);
    
    toast({
      title: 'Node Added',
      description: `${nodeKind} node added. Configure its properties.`,
    });
  };
  
  // Handle node selection for configuration
  const handleOpenNodeConfig = () => {
    if (selectedNodeId) {
      setConfigPanelOpen(true);
    } else {
      toast({
        title: 'No Node Selected',
        description: 'Please select a node to configure.',
      });
    }
  };

  // Handle node duplication
  const handleDuplicateNode = (e?: React.MouseEvent) => {
    // Prevent event bubbling that might trigger Sheet close
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (selectedNodeId) {
      const newNodeId = duplicateNodeWithEdges(selectedNodeId);
      if (newNodeId) {
        setSelectedNodeId(newNodeId); // Select the new duplicated node
        toast({
          title: 'Node Duplicated',
          description: 'Node and its connections have been duplicated.',
        });
      } else {
        toast({
          title: 'Duplication Failed',
          description: 'Could not duplicate the selected node.',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'No Node Selected',
        description: 'Please select a node to duplicate.',
      });
    }
  };

  // Check if forecast has metric nodes (required for calculation)
  const hasMetricNodes = nodes.some(node => node.type === 'METRIC');
  
  // Check if calculation is possible - no longer requires pre-validation
  const canCalculate = !isDirty && 
                      hasMetricNodes && 
                      !isCalculating && 
                      !isValidatingGraph &&
                      forecastId && 
                      organizationId;



  // Handle calculation with automatic validation
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
      console.log(`[ForecastToolbar] Validating graph before calculation`);
      setValidatingGraph(true);
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

      // Proceed with calculation
      console.log(`[ForecastToolbar] Starting calculation for forecast ${forecastId}`);
      await calculateForecast();
      
      toast({
        title: 'Calculation Complete',
        description: 'Forecast has been calculated successfully.',
      });
    } catch (error) {
      console.error('[ForecastToolbar] Calculation failed:', error);
      
      // Handle specific error types with better guidance
      let title = 'Calculation Failed';
      let description = 'An unknown error occurred';
      
      if (error instanceof Error) {
        const errorMessage = error.message;
        
        // Historical data errors
        if (errorMessage.includes('Historical data for') && errorMessage.includes('not found')) {
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
      setValidatingGraph(false);
    }
  };


  
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
            className="flex items-center gap-2 justify-start bg-slate-800 hover:bg-pink-700 border-pink-500 text-pink-400 hover:text-white"
          >
            <Flame className="h-4 w-4" />
            Seed
          </Button>
        </div>
      </div>
      
      {/* Actions Section */}
      <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
        <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
          Actions
        </h3>
        <div className="space-y-2">
          <Button 
            variant="default" 
            size="sm"
            onClick={handleSave}
            className="w-full flex items-center gap-2 justify-center bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!isDirty}
          >
            <Save className="h-4 w-4" />
            Save
          </Button>
          
          {onReload && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => checkUnsavedChanges(handleReload)}
              className="w-full flex items-center gap-2 justify-center bg-slate-800 hover:bg-slate-600 border-slate-600 text-slate-300"
            >
              <RefreshCw className="h-4 w-4" />
              Reload
            </Button>
          )}
          
          <div className="pt-2 border-t border-slate-600 space-y-2">
            <p className="text-xs text-slate-400 font-medium">Node Actions:</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={(e) => handleDuplicateNode(e)}
              disabled={!selectedNodeId}
              className="w-full flex items-center gap-2 justify-center bg-slate-800 hover:bg-slate-600 border-slate-600 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Copy className="h-4 w-4" />
              Duplicate Node
            </Button>
          </div>
        </div>
      </div>
      
      {/* Status Section */}
      {(isDirty || selectedNodeId) && (
        <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
          <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
            Status
          </h3>
          <div className="space-y-1">
            {isDirty && (
              <div className="flex items-center gap-2 text-xs text-amber-400">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                Unsaved changes
              </div>
            )}
            {selectedNodeId && (
              <div className="flex items-center gap-2 text-xs text-blue-400">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                Node selected
              </div>
            )}
          </div>
        </div>
      )}
      


      {/* Calculation Section */}
      <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
        <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-indigo-400 rounded-full"></span>
          Calculation
        </h3>
        <div className="space-y-2">
          <Button
            onClick={handleCalculate}
            disabled={!canCalculate}
            variant="default"
            size="sm"
            className="w-full flex items-center gap-2 justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white"
          >
            {isCalculating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isValidatingGraph ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Calculator className="h-4 w-4" />
            )}
            {isCalculating ? 'Calculating...' : isValidatingGraph ? 'Validating...' : 'Calculate Forecast'}
          </Button>

          {!canCalculate && !isCalculating && (
            <div className="text-xs text-slate-400 px-2">
              {isDirty && 'Save changes first'}
              {!isDirty && !hasMetricNodes && 'Add a METRIC node'}
              {!isDirty && hasMetricNodes && !forecastId && 'Missing forecast ID'}
              {!isDirty && hasMetricNodes && !organizationId && 'Missing organization ID'}
            </div>
          )}
        </div>
      </div>

      {/* Graph Status */}
      <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
        <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
          Graph Status
        </h3>
        <div className="space-y-1 text-xs text-slate-400">
          <div>Nodes: {nodes.length}</div>
          <div>Edges: {edges.length}</div>
          <div>Metric Nodes: {nodes.filter(n => n.type === 'METRIC').length}</div>
          <div>Data Nodes: {nodes.filter(n => n.type === 'DATA').length}</div>
          <div>Operator Nodes: {nodes.filter(n => n.type === 'OPERATOR').length}</div>
          <div>Constant Nodes: {nodes.filter(n => n.type === 'CONSTANT').length}</div>
          <div>Seed Nodes: {nodes.filter(n => n.type === 'SEED').length}</div>
          {graphValidation && (
            <div className={`font-medium ${graphValidation.isValid ? 'text-green-400' : 'text-red-400'}`}>
              Status: {graphValidation.isValid ? 'Valid' : `${graphValidation.errors.length} errors`}
            </div>
          )}
        </div>
      </div>

      {/* Back Navigation */}
      <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
        <Button 
          onClick={onBack}
          variant="ghost" 
          size="sm"
          className="w-full flex items-center gap-2 justify-center text-slate-300 hover:text-white hover:bg-slate-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Forecasts
        </Button>
      </div>
      
      {/* Node configuration panel */}
      <NodeConfigPanel 
        open={configPanelOpen} 
        onOpenChange={(isOpen) => {
          setConfigPanelOpen(isOpen);
          // Only deselect the node if the panel is being manually closed by the user
          if (!isOpen) {
            setSelectedNodeId(null);
          }
        }}
      />
      
      {/* Unsaved changes dialog */}
      <AlertDialog open={unsavedDialogOpen} onOpenChange={setUnsavedDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-200">Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              You have unsaved changes that will be lost. Do you want to save them first?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUnsavedDialogOpen(false)} className="bg-slate-700 text-slate-200 hover:bg-slate-600 border-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
              Save Changes
            </AlertDialogAction>
            <AlertDialogAction onClick={executePendingAction} className="bg-red-600 hover:bg-red-700 text-white">
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </CalculationErrorBoundary>
  );
};

export default ForecastToolbar; 