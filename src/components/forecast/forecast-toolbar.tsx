'use client';

import { useState, useEffect } from 'react';
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
import { 
  PlusCircle, 
  Save, 
  Trash2,
  Copy,
  Database, 
  Pencil,
  Calculator,
  BarChart3,
  Flame
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';

interface ForecastToolbarProps {
  onSave: () => Promise<void>;
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
  const selectedDate = date ? new Date(date) : undefined;
  
  return (
    <Popover>
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
          }}
          initialFocus
          className="bg-slate-800 text-slate-200"
        />
      </PopoverContent>
    </Popover>
  );
};

const ForecastToolbar: React.FC<ForecastToolbarProps> = ({ onSave }) => {
  const { toast } = useToast();
  
  // Node configuration panel state
  const [configPanelOpen, setConfigPanelOpen] = useState(false);
  
  // Unsaved changes dialog state
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  
  // Zustand store selectors
  const { 
    forecastName,
    forecastStartDate,
    forecastEndDate,
    isDirty,
    selectedNodeId,
    addNode,
    setForecastMetadata,
    resetStore,
    setSelectedNodeId
  } = useForecastGraphStore(
    useShallow((state) => ({
      forecastName: state.forecastName,
      forecastStartDate: state.forecastStartDate,
      forecastEndDate: state.forecastEndDate,
      isDirty: state.isDirty,
      selectedNodeId: state.selectedNodeId,
      addNode: state.addNode,
      setForecastMetadata: state.setForecastMetadata,
      resetStore: state.resetStore,
      setSelectedNodeId: state.setSelectedNodeId
    }))
  );
  
  // Effect to open/close panel based on selectedNodeId from store
  useEffect(() => {
    if (selectedNodeId) {
      setConfigPanelOpen(true);
    } else {
      setConfigPanelOpen(false);
    }
  }, [selectedNodeId]);
  
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
    
    // Open configuration panel for the new node
    // setSelectedNodeId(nodeId); // This is already done by onNodesChange
    // setConfigPanelOpen(true); // This will be handled by the useEffect
    
    toast({
      title: 'Node Added',
      description: `${nodeKind} node added. Configure its properties.`,
    });
  };
  
  // Handle node selection for configuration
  const handleOpenNodeConfig = () => {
    if (selectedNodeId) {
      setConfigPanelOpen(true); // This is fine for the button click
    } else {
      toast({
        title: 'No Node Selected',
        description: 'Please select a node to configure.',
      });
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Forecast Metadata Section */}
      <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
        <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
          Forecast Details
        </h3>
        <div className="space-y-3">
          <div>
            <label htmlFor="forecastName" className="text-sm font-medium text-slate-300 mb-1 block">Name</label>
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
            Data Node
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleAddNode('CONSTANT')}
            className="flex items-center gap-2 justify-start bg-slate-800 hover:bg-green-700 border-green-500 text-green-400 hover:text-white"
          >
            <Pencil className="h-4 w-4" />
            Constant Node
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleAddNode('OPERATOR')}
            className="flex items-center gap-2 justify-start bg-slate-800 hover:bg-yellow-700 border-yellow-500 text-yellow-400 hover:text-white"
          >
            <Calculator className="h-4 w-4" />
            Operator Node
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleAddNode('METRIC')}
            className="flex items-center gap-2 justify-start bg-slate-800 hover:bg-purple-700 border-purple-500 text-purple-400 hover:text-white"
          >
            <BarChart3 className="h-4 w-4" />
            Metric Node
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleAddNode('SEED')}
            className="flex items-center gap-2 justify-start bg-slate-800 hover:bg-pink-700 border-pink-500 text-pink-400 hover:text-white"
          >
            <Flame className="h-4 w-4" />
            Seed Node
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
            Save Forecast
          </Button>
          
          {selectedNodeId && (
            <div className="pt-2 border-t border-slate-600 space-y-2">
              <p className="text-xs text-slate-400 font-medium">Selected Node Actions:</p>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={handleOpenNodeConfig}
                className="w-full flex items-center gap-2 justify-center bg-slate-600 hover:bg-slate-500 text-slate-200"
              >
                <PlusCircle className="h-4 w-4" />
                Configure Node
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {/* Implement duplicate with edges */}}
                className="w-full flex items-center gap-2 justify-center bg-slate-800 hover:bg-slate-600 border-slate-600 text-slate-300"
              >
                <Copy className="h-4 w-4" />
                Duplicate Node
              </Button>
            </div>
          )}
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
      
      {/* Node configuration panel */}
      <NodeConfigPanel 
        open={configPanelOpen} 
        onOpenChange={(isOpen) => {
          setConfigPanelOpen(isOpen);
          if (!isOpen) {
            setSelectedNodeId(null); // Deselect node when panel is closed by user
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
  );
};

export default ForecastToolbar; 