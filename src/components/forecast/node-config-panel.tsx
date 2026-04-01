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
  useForecastGraph,
  useForecastGraphActions,
  useSelectedNode
} from '@/lib/store/forecast-graph-store/hooks';
import {
  ForecastNodeKind, 
  DataNodeAttributes,
  ConstantNodeAttributes,
  OperatorNodeAttributes,
  MetricNodeAttributes,
  SeedNodeAttributes,
  ForecastNodeClient
} from '@/lib/store/forecast-graph-store/types';
import { useVariableStore, Variable } from '@/lib/store/variables';
import { X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Toggle } from '@/components/ui/toggle';
import {
  formatConstantNodeValue,
  parseConstantNodeValueInput
} from '@/lib/utils/format-constant-node-value';

const PANEL_SYNC_UNSET = Symbol('panelSyncUnset');

interface NodeConfigPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Helper component for grouped variable selection
interface GroupedVariableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  id?: string;
  disabled?: boolean;
  variables: Variable[];
}

const GroupedVariableSelect: React.FC<GroupedVariableSelectProps> = ({
  value,
  onValueChange,
  placeholder,
  id,
  disabled = false,
  variables
}) => {
  // Group variables by type with proper ordering
  const groupedVariables = useMemo(() => {
    const groups = variables.reduce((acc, variable) => {
      const type = variable.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(variable);
      return acc;
    }, {} as Record<string, Variable[]>);

    // Sort variables within each group by name
    Object.keys(groups).forEach(type => {
      groups[type].sort((a, b) => a.name.localeCompare(b.name));
    });

    return groups;
  }, [variables]);

  const typeOrder = ['ACTUAL', 'BUDGET', 'INPUT', 'UNKNOWN'];
  const typeLabels = {
    ACTUAL: 'Actual Data',
    BUDGET: 'Budget Data', 
    INPUT: 'Input Data',
    UNKNOWN: 'Other Data'
  };

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger 
        id={id} 
        className={`bg-slate-700 border-slate-600 text-slate-200 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={disabled}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-slate-800 border-slate-600">
        {variables.length > 0 ? (
          typeOrder.map(type => {
            const typeVariables = groupedVariables[type];
            if (!typeVariables || typeVariables.length === 0) return null;
            
            return (
              <div key={type}>
                {/* Group header */}
                <div className="px-2 py-1.5 text-xs font-medium text-slate-400 bg-slate-700/50 border-b border-slate-600">
                  {typeLabels[type as keyof typeof typeLabels]}
                </div>
                {/* Group items */}
                {typeVariables.map(variable => (
                  <SelectItem 
                    key={variable.id} 
                    value={variable.id} 
                    className="text-slate-200 hover:bg-slate-700 pl-4"
                  >
                    {variable.name}
                  </SelectItem>
                ))}
              </div>
            );
          })
        ) : (
          <SelectItem value="no-vars" disabled className="text-slate-400">
            No variables available for this organization
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
};

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
  const { selectedNodeId, nodes } = useForecastGraph();
  const { updateNodeData, deleteNode, setSelectedNodeId: setSelectedGraphNodeId } = useForecastGraphActions();
  const selectedNode = useSelectedNode();
  
  // Get variables and selectedOrgId from the variable store
  const allVariables = useVariableStore(state => state.variables);
  const selectedOrgIdForVariables = useVariableStore(state => state.selectedOrganizationId);
  
  // Filter variables for the currently selected organization context of the variable store
  const organizationVariables = allVariables.filter(variable => variable.organizationId === selectedOrgIdForVariables);
  
  // Handle node deletion with confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Local state for form inputs to provide immediate UI feedback
  const [localFormData, setLocalFormData] = useState<Record<string, any>>({});
  /** Text field for CONSTANT value (de-DE); avoids number input leading-zero issues */
  const [constantValueText, setConstantValueText] = useState('');
  /** Integer text drafts — avoid `type="number"` + `|| 0` forcing a stuck leading zero */
  const [dataOffsetMonthsText, setDataOffsetMonthsText] = useState('');
  const [operatorOffsetMonthsText, setOperatorOffsetMonthsText] = useState('');

  const prevPanelNodeIdRef = useRef<string | null | typeof PANEL_SYNC_UNSET>(PANEL_SYNC_UNSET);

  // Debounced update function
  const debouncedUpdate = useDebouncedUpdate(300);

  // Initialize local form + numeric drafts only when the selected node id changes (not when `nodes` updates from store)
  useEffect(() => {
    const sid = selectedNodeId ?? null;
    if (sid === prevPanelNodeIdRef.current) {
      return;
    }
    prevPanelNodeIdRef.current = sid;

    if (!sid) {
      setLocalFormData({});
      setConstantValueText('');
      setDataOffsetMonthsText('');
      setOperatorOffsetMonthsText('');
      return;
    }

    const node = nodes.find((n) => n.id === sid);
    if (!node?.data) {
      setLocalFormData({});
      setConstantValueText('');
      setDataOffsetMonthsText('');
      setOperatorOffsetMonthsText('');
      return;
    }

    setLocalFormData(node.data);

    if (node.type === 'CONSTANT') {
      const d = node.data as ConstantNodeAttributes;
      const v = typeof d.value === 'number' && Number.isFinite(d.value) ? d.value : 0;
      setConstantValueText(formatConstantNodeValue(v));
    } else {
      setConstantValueText('');
    }

    if (node.type === 'DATA') {
      const d = node.data as DataNodeAttributes;
      setDataOffsetMonthsText(String(d.offsetMonths ?? 0));
    } else {
      setDataOffsetMonthsText('');
    }

    if (node.type === 'OPERATOR') {
      const d = node.data as OperatorNodeAttributes;
      if (d.op === 'offset') {
        setOperatorOffsetMonthsText(String(d.offsetMonths ?? 1));
      } else {
        setOperatorOffsetMonthsText('');
      }
    } else {
      setOperatorOffsetMonthsText('');
    }
  }, [selectedNodeId, nodes]);
  
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

  const handleConstantValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setConstantValueText(text);
    const parsed = parseConstantNodeValueInput(text);
    if (parsed !== null && Number.isFinite(parsed)) {
      setLocalFormData((prev) => ({ ...prev, value: parsed }));
      debouncedUpdate((updates: Record<string, any>) => {
        if (selectedNode) {
          updateNodeData(selectedNode.id, updates);
        }
      }, { value: parsed });
    }
  };

  const handleConstantValueBlur = () => {
    const parsed = parseConstantNodeValueInput(constantValueText);
    const final = parsed !== null && Number.isFinite(parsed) ? parsed : 0;
    setConstantValueText(formatConstantNodeValue(final));
    setLocalFormData((prev) => ({ ...prev, value: final }));
    if (selectedNode) {
      updateNodeData(selectedNode.id, { value: final });
    }
  };

  const handleDataOffsetMonthsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = e.target.value.replace(/[^\d-]/g, '');
    setDataOffsetMonthsText(t);
    if (t === '' || t === '-') {
      return;
    }
    const p = parseInt(t, 10);
    if (Number.isFinite(p)) {
      setLocalFormData((prev) => ({ ...prev, offsetMonths: p }));
      debouncedUpdate((updates: Record<string, any>) => {
        if (selectedNode) {
          updateNodeData(selectedNode.id, updates);
        }
      }, { offsetMonths: p });
    }
  };

  const handleDataOffsetMonthsBlur = () => {
    const p = parseInt(dataOffsetMonthsText, 10);
    const final = Number.isFinite(p) ? p : 0;
    setDataOffsetMonthsText(String(final));
    setLocalFormData((prev) => ({ ...prev, offsetMonths: final }));
    if (selectedNode) {
      updateNodeData(selectedNode.id, { offsetMonths: final });
    }
  };

  const handleOperatorOffsetMonthsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = e.target.value.replace(/\D/g, '');
    setOperatorOffsetMonthsText(t);
    if (t === '') {
      return;
    }
    const p = parseInt(t, 10);
    if (Number.isFinite(p)) {
      const offsetMonths = Math.max(0, p);
      setLocalFormData((prev) => ({ ...prev, offsetMonths }));
      debouncedUpdate((updates: Record<string, any>) => {
        if (selectedNode) {
          updateNodeData(selectedNode.id, updates);
        }
      }, { offsetMonths });
    }
  };

  const handleOperatorOffsetMonthsBlur = () => {
    const p = parseInt(operatorOffsetMonthsText, 10);
    const final = Number.isFinite(p) ? Math.max(0, p) : 1;
    setOperatorOffsetMonthsText(String(final));
    setLocalFormData((prev) => ({ ...prev, offsetMonths: final }));
    if (selectedNode) {
      updateNodeData(selectedNode.id, { offsetMonths: final });
    }
  };

  const handleOperatorOpChange = (value: string) => {
    if (value === 'offset') {
      const offsetMonths = localFormData.offsetMonths ?? 1;
      setOperatorOffsetMonthsText(String(offsetMonths));
      const newData = { ...localFormData, op: value, offsetMonths };
      setLocalFormData(newData);
      debouncedUpdate((updates: Record<string, any>) => {
        if (selectedNode) {
          updateNodeData(selectedNode.id, updates);
        }
      }, { op: value, offsetMonths });
    } else {
      setOperatorOffsetMonthsText('');
      handleInputChange('op', value);
    }
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
          <GroupedVariableSelect
            id="variableId"
            value={localFormData.variableId || ''}
            onValueChange={(value) => handleInputChange('variableId', value)}
            placeholder="Select variable"
            variables={organizationVariables}
          />
        </div>
        
        <div className="space-y-1">
          <label htmlFor="offsetMonths" className="text-sm font-medium text-slate-300">Offset (months)</label>
          <Input
            id="offsetMonths"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={dataOffsetMonthsText}
            onChange={handleDataOffsetMonthsChange}
            onBlur={handleDataOffsetMonthsBlur}
            className="bg-slate-700 border-slate-600 text-slate-200"
          />
        </div>
      </>
    );
  };

  const renderConstantNodeForm = (node: ForecastNodeClient) => {
    const data = node.data as ConstantNodeAttributes;
    return (
      <>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Name</label>
          <Input 
            value={localFormData.name || ''}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Constant node name"
            className="bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-400"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300" htmlFor="constant-node-value">
            Value
          </label>
          <Input
            id="constant-node-value"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={constantValueText}
            onChange={handleConstantValueChange}
            onBlur={handleConstantValueBlur}
            className="bg-slate-700 border-slate-600 text-slate-200"
          />
        </div>
      </>
    );
  };

  const renderOperatorNodeForm = (_node: ForecastNodeClient) => {
    const isOffset = localFormData.op === 'offset';
    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Operation</label>
          <Select 
            value={localFormData.op || '+'} 
            onValueChange={handleOperatorOpChange}
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
              <SelectItem value="offset" className="text-slate-200 hover:bg-slate-700">Offset (lag)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isOffset && (
          <div className="space-y-1">
            <label htmlFor="operatorOffsetMonths" className="text-sm font-medium text-slate-300">
              Lag (months)
            </label>
            <Input
              id="operatorOffsetMonths"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={operatorOffsetMonthsText}
              onChange={handleOperatorOffsetMonthsChange}
              onBlur={handleOperatorOffsetMonthsBlur}
              className="bg-slate-700 border-slate-600 text-slate-200"
            />
          </div>
        )}
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
          <label className="text-sm font-medium text-slate-300">FY series kind</label>
          <p className="text-xs text-slate-500 mb-1">
            Stock: FY uses December values. Flow: FY sums months in the calendar year.
          </p>
          <Select
            value={(localFormData.metricSeriesKind as string) || 'flow'}
            onValueChange={(value) =>
              handleInputChange('metricSeriesKind', value as 'stock' | 'flow')
            }
          >
            <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              <SelectItem value="flow" className="text-slate-200">
                Flow (sum months)
              </SelectItem>
              <SelectItem value="stock" className="text-slate-200">
                Stock (December)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Budget Variable</label>
          <GroupedVariableSelect
            value={localFormData.budgetVariableId || ''}
            onValueChange={(value) => handleInputChange('budgetVariableId', value)}
            placeholder="Select budget variable"
            disabled={isCalculated}
            variables={organizationVariables}
          />
        </div>
        
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Historical Variable</label>
          <GroupedVariableSelect
            value={localFormData.historicalVariableId || ''}
            onValueChange={(value) => handleInputChange('historicalVariableId', value)}
            placeholder="Select historical variable"
            disabled={isCalculated}
            variables={organizationVariables}
          />
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