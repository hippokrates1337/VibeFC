'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  useForecastGraphStore, 
  ForecastNodeKind, 
  DataNodeAttributes,
  ConstantNodeAttributes,
  OperatorNodeAttributes,
  MetricNodeAttributes,
  SeedNodeAttributes,
  ForecastNodeClient
} from '@/lib/store/forecast-graph-store';
import { useVariableStore } from '@/lib/store/variables';
import { X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Toggle } from '@/components/ui/toggle';

interface NodeConfigPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Custom hook for debounced store updates
const useDebouncedUpdate = (delay: number = 300) => {
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef<((value: any) => void) | null>(null);

  const debouncedCallback = useCallback((callback: (value: any) => void, value: any) => {
    callbackRef.current = callback;
    
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
    
    timeoutIdRef.current = setTimeout(() => {
      if (callbackRef.current) {
        callbackRef.current(value);
      }
    }, delay);
  }, [delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, []);

  return debouncedCallback;
};

const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({ 
  open,
  onOpenChange
}) => {
  const selectedNodeId = useForecastGraphStore(state => state.selectedNodeId);
  const nodes = useForecastGraphStore(state => state.nodes);
  const updateNodeData = useForecastGraphStore(state => state.updateNodeData);
  const deleteNode = useForecastGraphStore(state => state.deleteNode);
  const setSelectedGraphNodeId = useForecastGraphStore(state => state.setSelectedNodeId);
  
  // Memoize selected node to prevent unnecessary re-renders
  const selectedNode = useMemo(() => 
    nodes.find(node => node.id === selectedNodeId), 
    [nodes, selectedNodeId]
  );
  
  // Get variables and selectedOrgId from the variable store
  const allVariables = useVariableStore(state => state.variables);
  const selectedOrgIdForVariables = useVariableStore(state => state.selectedOrganizationId);
  
  // Filter variables for the currently selected organization context of the variable store
  const organizationVariables = allVariables.filter(variable => variable.organizationId === selectedOrgIdForVariables);
  
  // Handle node deletion with confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Local state for form inputs to provide immediate UI feedback
  const [localFormData, setLocalFormData] = useState<Record<string, any>>({});

  // Debounced update function
  const debouncedUpdate = useDebouncedUpdate(300);

  // Initialize local form data when selected node changes
  // Use selectedNodeId to avoid infinite loops
  useEffect(() => {
    if (selectedNode?.data) {
      setLocalFormData(selectedNode.data);
    } else {
      setLocalFormData({});
    }
  }, [selectedNodeId]); // Only depend on selectedNodeId, not the entire node object
  
  const handleDeleteNode = () => {
    if (selectedNodeId) {
      deleteNode(selectedNodeId);
      setSelectedGraphNodeId(null);
      onOpenChange(false);
      setShowDeleteConfirm(false);
    }
  };
  
  const handleClose = () => {
    setShowDeleteConfirm(false);
    onOpenChange(false);
  };

  // Helper function to update both local state and trigger debounced store update
  const handleInputChange = (field: string, value: any) => {
    const newData = { ...localFormData, [field]: value };
    setLocalFormData(newData);
    debouncedUpdate((updates: Record<string, any>) => {
      if (selectedNode) {
        updateNodeData(selectedNode.id, updates);
      }
    }, { [field]: value });
  };

  // Render appropriate form based on node type
  const renderNodeForm = () => {
    if (!selectedNode) return null;
    
    switch(selectedNode.type) {
      case 'DATA':
        return renderDataNodeForm(selectedNode);
      case 'CONSTANT':
        return renderConstantNodeForm(selectedNode);
      case 'OPERATOR':
        return renderOperatorNodeForm(selectedNode);
      case 'METRIC':
        return renderMetricNodeForm(selectedNode);
      case 'SEED':
        return renderSeedNodeForm(selectedNode);
      default:
        return <p>Unknown node type</p>;
    }
  };

  // Specific form renderers with proper typing
  const renderDataNodeForm = (node: ForecastNodeClient) => {
    const data = node.data as DataNodeAttributes;
    return (
      <>
        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium text-slate-300">Name</label>
          <Input 
            id="name"
            value={localFormData.name || ''}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Node name"
            className="bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-400"
          />
        </div>
        
        <div className="space-y-1">
          <label htmlFor="variableId" className="text-sm font-medium text-slate-300">Variable</label>
          <Select 
            value={localFormData.variableId || ''} 
            onValueChange={(value) => handleInputChange('variableId', value)}
          >
            <SelectTrigger id="variableId" className="bg-slate-700 border-slate-600 text-slate-200">
              <SelectValue placeholder="Select variable" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {organizationVariables.length > 0 ? (
                organizationVariables.map(variable => (
                  <SelectItem key={variable.id} value={variable.id} className="text-slate-200 hover:bg-slate-700">
                    {variable.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-vars" disabled className="text-slate-400">
                  {selectedOrgIdForVariables ? 'No variables for this organization' : 'Please select an organization first'}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1">
          <label htmlFor="offsetMonths" className="text-sm font-medium text-slate-300">Offset (months)</label>
          <Input 
            id="offsetMonths"
            type="number" 
            value={localFormData.offsetMonths || 0}
            onChange={(e) => handleInputChange('offsetMonths', parseInt(e.target.value) || 0)}
            className="bg-slate-700 border-slate-600 text-slate-200"
          />
        </div>
      </>
    );
  };

  const renderConstantNodeForm = (node: ForecastNodeClient) => {
    const data = node.data as ConstantNodeAttributes;
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300">Value</label>
        <Input 
          type="number" 
          value={localFormData.value || 0}
          onChange={(e) => handleInputChange('value', parseFloat(e.target.value) || 0)}
          className="bg-slate-700 border-slate-600 text-slate-200"
        />
      </div>
    );
  };

  const renderOperatorNodeForm = (node: ForecastNodeClient) => {
    const data = node.data as OperatorNodeAttributes;
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300">Operation</label>
        <Select 
          value={localFormData.op || '+'} 
          onValueChange={(value) => handleInputChange('op', value)}
        >
          <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-200">
            <SelectValue placeholder="Select operation" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-600">
            <SelectItem value="+" className="text-slate-200 hover:bg-slate-700">Add (+)</SelectItem>
            <SelectItem value="-" className="text-slate-200 hover:bg-slate-700">Subtract (-)</SelectItem>
            <SelectItem value="*" className="text-slate-200 hover:bg-slate-700">Multiply (*)</SelectItem>
            <SelectItem value="/" className="text-slate-200 hover:bg-slate-700">Divide (/)</SelectItem>
            <SelectItem value="^" className="text-slate-200 hover:bg-slate-700">Power (^)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  };

  const renderMetricNodeForm = (node: ForecastNodeClient) => {
    const data = node.data as MetricNodeAttributes;
    const isCalculated = localFormData.useCalculated ?? false;
    
    return (
      <>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Label</label>
          <Input 
            value={localFormData.label || ''}
            onChange={(e) => handleInputChange('label', e.target.value)}
            placeholder="Metric label"
            className="bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-400"
          />
        </div>
        
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Data Source</label>
          <Toggle
            options={[
              { value: 'variable', label: 'Variable' },
              { value: 'calculated', label: 'Calculated' }
            ]}
            value={isCalculated ? 'calculated' : 'variable'}
            onValueChange={(value) => handleInputChange('useCalculated', value === 'calculated')}
            className="w-full"
          />
        </div>
        
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Budget Variable</label>
          <Select 
            value={localFormData.budgetVariableId || ''} 
            onValueChange={(value) => handleInputChange('budgetVariableId', value)}
            disabled={isCalculated}
          >
            <SelectTrigger className={`bg-slate-700 border-slate-600 text-slate-200 ${isCalculated ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <SelectValue placeholder="Select budget variable" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {organizationVariables.map(variable => (
                <SelectItem key={variable.id} value={variable.id} className="text-slate-200 hover:bg-slate-700">
                  {variable.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Historical Variable</label>
          <Select 
            value={localFormData.historicalVariableId || ''} 
            onValueChange={(value) => handleInputChange('historicalVariableId', value)}
            disabled={isCalculated}
          >
            <SelectTrigger className={`bg-slate-700 border-slate-600 text-slate-200 ${isCalculated ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <SelectValue placeholder="Select historical variable" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {organizationVariables.map(variable => (
                <SelectItem key={variable.id} value={variable.id} className="text-slate-200 hover:bg-slate-700">
                  {variable.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </>
    );
  };

  const renderSeedNodeForm = (node: ForecastNodeClient) => {
    const data = node.data as SeedNodeAttributes;
    
    // Get all METRIC nodes from the current forecast graph (excluding the current node)
    const metricNodes = nodes.filter(n => n.type === 'METRIC' && n.id !== node.id);
    
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300">Source Metric Node</label>
        <Select 
          value={localFormData.sourceMetricId || ''} 
          onValueChange={(value) => handleInputChange('sourceMetricId', value)}
        >
          <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-200">
            <SelectValue placeholder="Select source metric node" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-600">
            {metricNodes.length > 0 ? (
              metricNodes.map(metricNode => (
                <SelectItem key={metricNode.id} value={metricNode.id} className="text-slate-200 hover:bg-slate-700">
                  {(metricNode.data as MetricNodeAttributes)?.label || `Metric ${metricNode.id.slice(0, 8)}...`}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="no-metrics" disabled className="text-slate-400">
                No metric nodes available in this forecast
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        {metricNodes.length === 0 && (
          <p className="text-xs text-slate-400 mt-1">
            Create a METRIC node first to use as a source for this SEED node.
          </p>
        )}
      </div>
    );
  };

  // Early return AFTER all hooks have been called - REMOVED to prevent Sheet cleanup issues
  // if (!selectedNode) return null;

  return (
    <Sheet open={open && !!selectedNode} onOpenChange={onOpenChange}>
      <SheetContent 
        className="sm:max-w-md bg-slate-800 border-slate-700 text-slate-200"
      >
        {selectedNode ? (
          <>
            <SheetHeader>
              <SheetTitle className="text-slate-200">Configure {selectedNode.type} Node</SheetTitle>
              <SheetDescription className="text-slate-400">
                Modify the properties of the selected {selectedNode.type} node below.
              </SheetDescription>
            </SheetHeader>
            
            <div className="py-4 space-y-4">
              {showDeleteConfirm ? (
                <Alert variant="destructive" className="bg-red-900/20 border-red-500/50 text-red-300">
                  <AlertDescription>
                    Are you sure you want to delete this node? This will also remove any connected edges.
                    <div className="flex gap-2 mt-2">
                      <Button variant="destructive" size="sm" onClick={handleDeleteNode} className="bg-red-600 hover:bg-red-700">Delete</Button>
                      <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)} className="bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600">Cancel</Button>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                renderNodeForm()
              )}
            </div>
            
            <SheetFooter className="flex justify-between sm:justify-between">
              <Button 
                variant="destructive" 
                onClick={() => setShowDeleteConfirm(true)}
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Node
              </Button>
              <SheetClose asChild>
                <Button variant="outline" size="sm" onClick={handleClose} className="bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600">
                  Close
                </Button>
              </SheetClose>
            </SheetFooter>
          </>
        ) : (
          <div className="p-4">
            <p className="text-slate-400">No node selected</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default NodeConfigPanel; 