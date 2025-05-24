'use client';

import { useEffect, useState } from 'react';
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

interface NodeConfigPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({ 
  open,
  onOpenChange
}) => {
  const selectedNodeId = useForecastGraphStore(state => state.selectedNodeId);
  const nodes = useForecastGraphStore(state => state.nodes);
  const updateNodeData = useForecastGraphStore(state => state.updateNodeData);
  const deleteNode = useForecastGraphStore(state => state.deleteNode);
  const setSelectedGraphNodeId = useForecastGraphStore(state => state.setSelectedNodeId);
  
  const selectedNode = nodes.find(node => node.id === selectedNodeId);
  
  // Get variables and selectedOrgId from the variable store
  const allVariables = useVariableStore(state => state.variables);
  const selectedOrgIdForVariables = useVariableStore(state => state.selectedOrganizationId);
  
  // Filter variables for the currently selected organization context of the variable store
  const organizationVariables = allVariables.filter(variable => variable.organizationId === selectedOrgIdForVariables);
  
  // Close panel when no node is selected
  useEffect(() => {
    if (!selectedNodeId && open) {
      onOpenChange(false);
    }
  }, [selectedNodeId, open, onOpenChange]);
  
  // Handle node deletion with confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
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
  
  if (!selectedNode) return null;

  // Render appropriate form based on node type
  const renderNodeForm = () => {
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
            value={data.name || ''}
            onChange={(e) => updateNodeData(node.id, { name: e.target.value })}
            placeholder="Node name"
            className="bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-400"
          />
        </div>
        
        <div className="space-y-1">
          <label htmlFor="variableId" className="text-sm font-medium text-slate-300">Variable</label>
          <Select 
            value={data.variableId || ''} 
            onValueChange={(value) => updateNodeData(node.id, { variableId: value })}
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
            value={data.offsetMonths || 0}
            onChange={(e) => updateNodeData(node.id, { offsetMonths: parseInt(e.target.value) || 0 })}
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
          value={data.value || 0}
          onChange={(e) => updateNodeData(node.id, { value: parseFloat(e.target.value) || 0 })}
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
          value={data.op || '+'} 
          onValueChange={(value) => updateNodeData(node.id, { op: value as any })}
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
    return (
      <>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Label</label>
          <Input 
            value={data.label || ''}
            onChange={(e) => updateNodeData(node.id, { label: e.target.value })}
            placeholder="Metric label"
            className="bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-400"
          />
        </div>
        
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Budget Variable</label>
          <Select 
            value={data.budgetVariableId || ''} 
            onValueChange={(value) => updateNodeData(node.id, { budgetVariableId: value })}
          >
            <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-200">
              <SelectValue placeholder="Select budget variable" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {organizationVariables.map(variable => (
                <SelectItem key={variable.id} value={variable.id} className="text-slate-200 hover:bg-slate-700">
                  {variable.name} (Budget)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Historical Variable</label>
          <Select 
            value={data.historicalVariableId || ''} 
            onValueChange={(value) => updateNodeData(node.id, { historicalVariableId: value })}
          >
            <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-200">
              <SelectValue placeholder="Select historical variable" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {organizationVariables.map(variable => (
                <SelectItem key={variable.id} value={variable.id} className="text-slate-200 hover:bg-slate-700">
                  {variable.name} (Historical)
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
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300">Source Metric</label>
        <Select 
          value={data.sourceMetricId || ''} 
          onValueChange={(value) => updateNodeData(node.id, { sourceMetricId: value })}
        >
          <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-200">
            <SelectValue placeholder="Select source metric" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-600">
            {organizationVariables.filter(v => v.type === 'ACTUAL' || v.type === 'BUDGET').map(metric => (
              <SelectItem key={metric.id} value={metric.id} className="text-slate-200 hover:bg-slate-700">
                {metric.name}
              </SelectItem>
            ))}
            {organizationVariables.filter(v => v.type === 'ACTUAL' || v.type === 'BUDGET').length === 0 && (
                <SelectItem value="no-metrics" disabled className="text-slate-400">
                  No metrics available for this organization
                </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md no-overlay-config-panel bg-slate-800 border-slate-700 text-slate-200">
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
      </SheetContent>
    </Sheet>
  );
};

export default NodeConfigPanel; 