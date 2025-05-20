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
          <label htmlFor="name" className="text-sm font-medium">Name</label>
          <Input 
            id="name"
            value={data.name || ''}
            onChange={(e) => updateNodeData(node.id, { name: e.target.value })}
            placeholder="Node name"
          />
        </div>
        
        <div className="space-y-1">
          <label htmlFor="variableId" className="text-sm font-medium">Variable</label>
          <Select 
            value={data.variableId || ''} 
            onValueChange={(value) => updateNodeData(node.id, { variableId: value })}
          >
            <SelectTrigger id="variableId">
              <SelectValue placeholder="Select variable" />
            </SelectTrigger>
            <SelectContent>
              {organizationVariables.length > 0 ? (
                organizationVariables.map(variable => (
                  <SelectItem key={variable.id} value={variable.id}>
                    {variable.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-vars" disabled>
                  {selectedOrgIdForVariables ? 'No variables for this organization' : 'Please select an organization first'}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1">
          <label htmlFor="offsetMonths" className="text-sm font-medium">Offset (months)</label>
          <Input 
            id="offsetMonths"
            type="number" 
            value={data.offsetMonths || 0}
            onChange={(e) => updateNodeData(node.id, { offsetMonths: parseInt(e.target.value) || 0 })}
          />
        </div>
      </>
    );
  };

  const renderConstantNodeForm = (node: ForecastNodeClient) => {
    const data = node.data as ConstantNodeAttributes;
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium">Value</label>
        <Input 
          type="number" 
          value={data.value || 0}
          onChange={(e) => updateNodeData(node.id, { value: parseFloat(e.target.value) || 0 })}
        />
      </div>
    );
  };

  const renderOperatorNodeForm = (node: ForecastNodeClient) => {
    const data = node.data as OperatorNodeAttributes;
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium">Operation</label>
        <Select 
          value={data.op || '+'} 
          onValueChange={(value) => updateNodeData(node.id, { op: value as any })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select operation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="+">Add (+)</SelectItem>
            <SelectItem value="-">Subtract (-)</SelectItem>
            <SelectItem value="*">Multiply (*)</SelectItem>
            <SelectItem value="/">Divide (/)</SelectItem>
            <SelectItem value="^">Power (^)</SelectItem>
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
          <label className="text-sm font-medium">Label</label>
          <Input 
            value={data.label || ''}
            onChange={(e) => updateNodeData(node.id, { label: e.target.value })}
            placeholder="Metric label"
          />
        </div>
        
        <div className="space-y-1">
          <label className="text-sm font-medium">Budget Variable</label>
          <Select 
            value={data.budgetVariableId || ''} 
            onValueChange={(value) => updateNodeData(node.id, { budgetVariableId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select budget variable" />
            </SelectTrigger>
            <SelectContent>
              {organizationVariables.map(variable => (
                <SelectItem key={variable.id} value={variable.id}>
                  {variable.name} (Budget)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1">
          <label className="text-sm font-medium">Historical Variable</label>
          <Select 
            value={data.historicalVariableId || ''} 
            onValueChange={(value) => updateNodeData(node.id, { historicalVariableId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select historical variable" />
            </SelectTrigger>
            <SelectContent>
              {organizationVariables.map(variable => (
                <SelectItem key={variable.id} value={variable.id}>
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
        <label className="text-sm font-medium">Source Metric</label>
        <Select 
          value={data.sourceMetricId || ''} 
          onValueChange={(value) => updateNodeData(node.id, { sourceMetricId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select source metric" />
          </SelectTrigger>
          <SelectContent>
            {organizationVariables.filter(v => v.type === 'ACTUAL' || v.type === 'BUDGET').map(metric => (
              <SelectItem key={metric.id} value={metric.id}>
                {metric.name}
              </SelectItem>
            ))}
            {organizationVariables.filter(v => v.type === 'ACTUAL' || v.type === 'BUDGET').length === 0 && (
                <SelectItem value="no-metrics" disabled>
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
      <SheetContent className="sm:max-w-md no-overlay-config-panel">
        <SheetHeader>
          <SheetTitle>Configure {selectedNode.type} Node</SheetTitle>
          <SheetDescription>
            Modify the properties of the selected {selectedNode.type} node below.
          </SheetDescription>
        </SheetHeader>
        
        <div className="py-4 space-y-4">
          {showDeleteConfirm ? (
            <Alert variant="destructive">
              <AlertDescription>
                Are you sure you want to delete this node? This will also remove any connected edges.
                <div className="flex gap-2 mt-2">
                  <Button variant="destructive" size="sm" onClick={handleDeleteNode}>Delete</Button>
                  <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
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
          >
            Delete Node
          </Button>
          <SheetClose asChild>
            <Button variant="outline" size="sm" onClick={handleClose}>
              Close
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default NodeConfigPanel; 