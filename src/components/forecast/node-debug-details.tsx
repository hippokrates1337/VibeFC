'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Info, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  TrendingUp,
  Database,
  Hash,
  Calculator,
  Target,
  Shuffle,
  Copy,
  ExternalLink
} from 'lucide-react';
import { formatExecutionTime, getNodeTypeColor } from '@/lib/api/debug-calculation';
import type { 
  NodeDebugDetailsProps,
  DebugCalculationStep,
  DebugTreeNode,
  CalculationType 
} from '@/types/debug';

interface NodeStatistics {
  totalSteps: number;
  totalExecutionTime: number;
  averageExecutionTime: number;
  errorCount: number;
  successCount: number;
  calculationTypes: CalculationType[];
  monthsProcessed: string[];
  outputRange: { min: number | null; max: number | null };
}

/**
 * Node Type Icon Component
 */
function getNodeTypeIcon(nodeType: string, className: string = "h-4 w-4") {
  switch (nodeType) {
    case 'METRIC':
      return <Target className={className} />;
    case 'DATA':
      return <Database className={className} />;
    case 'CONSTANT':
      return <Hash className={className} />;
    case 'OPERATOR':
      return <Calculator className={className} />;
    case 'SEED':
      return <Shuffle className={className} />;
    default:
      return <Info className={className} />;
  }
}

/**
 * Node Attributes Component
 */
interface NodeAttributesProps {
  nodeType: string;
  nodeData: any;
}

function NodeAttributes({ nodeType, nodeData }: NodeAttributesProps) {
  const renderAttributes = () => {
    switch (nodeType) {
      case 'DATA':
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-slate-400">Variable ID:</span>
                <div className="font-mono text-blue-400 break-all">
                  {nodeData?.variableId || 'N/A'}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Name:</span>
                <div className="text-slate-200">
                  {nodeData?.name || 'Unnamed'}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Offset Months:</span>
                <div className="text-slate-200">
                  {nodeData?.offsetMonths || 0}
                </div>
              </div>
            </div>
          </div>
        );

      case 'CONSTANT':
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-slate-400">Value:</span>
                <div className="text-green-400 font-mono text-lg">
                  {nodeData?.value !== undefined ? nodeData.value.toLocaleString() : 'N/A'}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Name:</span>
                <div className="text-slate-200">
                  {nodeData?.name || 'Unnamed Constant'}
                </div>
              </div>
            </div>
          </div>
        );

      case 'OPERATOR':
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-slate-400">Operation:</span>
                <div className="text-purple-400 font-mono text-lg">
                  {nodeData?.op || 'Unknown'}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Input Order:</span>
                <div className="text-slate-200">
                  {nodeData?.inputOrder ? nodeData.inputOrder.join(', ') : 'Natural order'}
                </div>
              </div>
            </div>
          </div>
        );

      case 'METRIC':
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-slate-400">Label:</span>
                <div className="text-slate-200 font-medium">
                  {nodeData?.label || 'Unnamed Metric'}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Use Calculated:</span>
                <div className="text-slate-200">
                  {nodeData?.useCalculated ? 'Yes' : 'No'}
                </div>
              </div>
              {nodeData?.budgetVariableId && (
                <div>
                  <span className="text-slate-400">Budget Variable:</span>
                  <div className="font-mono text-blue-400 text-xs break-all">
                    {nodeData.budgetVariableId}
                  </div>
                </div>
              )}
              {nodeData?.historicalVariableId && (
                <div>
                  <span className="text-slate-400">Historical Variable:</span>
                  <div className="font-mono text-blue-400 text-xs break-all">
                    {nodeData.historicalVariableId}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'SEED':
        return (
          <div className="space-y-2">
            <div className="text-sm">
              <div>
                <span className="text-slate-400">Source Metric ID:</span>
                <div className="font-mono text-blue-400 break-all">
                  {nodeData?.sourceMetricId || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-slate-400">
            No specific attributes for this node type
          </div>
        );
    }
  };

  return (
    <Card className="bg-slate-700 border-slate-600">
      <CardHeader className="pb-3">
        <CardTitle className="text-slate-100 text-sm">Node Attributes</CardTitle>
      </CardHeader>
      <CardContent>
        {renderAttributes()}
      </CardContent>
    </Card>
  );
}

/**
 * Node Statistics Component
 */
interface NodeStatisticsProps {
  statistics: NodeStatistics;
  nodeType: string;
}

function NodeStatisticsCard({ statistics, nodeType }: NodeStatisticsProps) {
  return (
    <Card className="bg-slate-700 border-slate-600">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-slate-100 text-sm">
          <TrendingUp className="h-4 w-4" />
          Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Execution Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-slate-800 rounded">
            <div className="text-lg font-bold text-slate-100">{statistics.totalSteps}</div>
            <div className="text-xs text-slate-400">Total Steps</div>
          </div>
          <div className="text-center p-3 bg-slate-800 rounded">
            <div className="text-lg font-bold text-slate-100">
              {formatExecutionTime(statistics.totalExecutionTime)}
            </div>
            <div className="text-xs text-slate-400">Total Time</div>
          </div>
          <div className="text-center p-3 bg-slate-800 rounded">
            <div className="text-lg font-bold text-slate-100">
              {formatExecutionTime(statistics.averageExecutionTime)}
            </div>
            <div className="text-xs text-slate-400">Avg Time</div>
          </div>
          <div className="text-center p-3 bg-slate-800 rounded">
            <div className="text-lg font-bold text-slate-100">
              {statistics.successCount}/{statistics.totalSteps}
            </div>
            <div className="text-xs text-slate-400">Success Rate</div>
          </div>
        </div>

        {/* Output Range */}
        {statistics.outputRange.min !== null && statistics.outputRange.max !== null && (
          <div>
            <div className="text-sm font-medium text-slate-300 mb-2">Output Range</div>
            <div className="flex items-center justify-between p-2 bg-slate-800 rounded">
              <div className="text-sm">
                <span className="text-slate-400">Min: </span>
                <span className="text-green-400 font-mono">
                  {statistics.outputRange.min?.toLocaleString() || 'N/A'}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-slate-400">Max: </span>
                <span className="text-green-400 font-mono">
                  {statistics.outputRange.max?.toLocaleString() || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Calculation Types */}
        <div>
          <div className="text-sm font-medium text-slate-300 mb-2">Calculation Types</div>
          <div className="flex gap-1">
            {statistics.calculationTypes.map(type => (
              <Badge key={type} variant="secondary" className="text-xs bg-slate-600">
                {type}
              </Badge>
            ))}
          </div>
        </div>

        {/* Months Processed */}
        <div>
          <div className="text-sm font-medium text-slate-300 mb-2">
            Months Processed ({statistics.monthsProcessed.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {statistics.monthsProcessed.slice(0, 6).map(month => (
              <Badge key={month} variant="outline" className="text-xs border-slate-500 text-slate-300">
                {month}
              </Badge>
            ))}
            {statistics.monthsProcessed.length > 6 && (
              <Badge variant="outline" className="text-xs border-slate-500 text-slate-300">
                +{statistics.monthsProcessed.length - 6} more
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Monthly Results Component
 */
interface MonthlyResultsProps {
  steps: DebugCalculationStep[];
  nodeType: string;
}

function MonthlyResults({ steps, nodeType }: MonthlyResultsProps) {
  const monthlyData = useMemo(() => {
    const data = new Map<string, { 
      month: string; 
      byCalcType: Map<CalculationType, DebugCalculationStep[]>;
    }>();

    steps.forEach(step => {
      if (!data.has(step.month)) {
        data.set(step.month, {
          month: step.month,
          byCalcType: new Map()
        });
      }
      
      const monthData = data.get(step.month)!;
      if (!monthData.byCalcType.has(step.calculationType)) {
        monthData.byCalcType.set(step.calculationType, []);
      }
      
      monthData.byCalcType.get(step.calculationType)!.push(step);
    });

    return Array.from(data.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [steps]);

  const formatOutput = (output: number | null): string => {
    if (output === null) return 'null';
    if (typeof output === 'number') {
      return output.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    return String(output);
  };

  return (
    <Card className="bg-slate-700 border-slate-600">
      <CardHeader className="pb-3">
        <CardTitle className="text-slate-100 text-sm">Monthly Calculation Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {monthlyData.map(({ month, byCalcType }) => (
            <div key={month} className="p-3 bg-slate-800 rounded">
              <div className="font-medium text-slate-200 mb-2">{month}</div>
              <div className="space-y-2">
                {Array.from(byCalcType.entries()).map(([calcType, steps]) => (
                  <div key={calcType} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs bg-slate-600">
                        {calcType}
                      </Badge>
                      <span className="text-slate-400">
                        ({steps.length} step{steps.length > 1 ? 's' : ''})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {steps.map(step => (
                        <div key={step.stepNumber} className="flex items-center gap-1">
                          {step.errorMessage ? (
                            <AlertTriangle className="h-3 w-3 text-red-400" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3 text-green-400" />
                          )}
                          <span className={`font-mono text-xs ${
                            step.errorMessage 
                              ? 'text-red-400' 
                              : step.output === null 
                                ? 'text-slate-500' 
                                : 'text-green-400'
                          }`}>
                            {formatOutput(step.output)}
                          </span>
                          <span className="text-slate-500 text-xs">
                            ({formatExecutionTime(step.executionTimeMs)})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Dependencies Component
 */
interface DependenciesProps {
  node: DebugTreeNode;
  calculationTree: any;
}

function Dependencies({ node, calculationTree }: DependenciesProps) {
  const dependencies = useMemo(() => {
    const deps: Array<{ nodeId: string; type: string; label: string }> = [];
    
    // Direct children
    if (node.children) {
      node.children.forEach(child => {
        deps.push({
          nodeId: child.nodeId,
          type: child.nodeType,
          label: child.label || `${child.nodeType} Node`
        });
      });
    }

    // SEED dependencies
    if (node.nodeType === 'SEED' && node.nodeData?.sourceMetricId) {
      deps.push({
        nodeId: node.nodeData.sourceMetricId,
        type: 'METRIC',
        label: 'Source Metric'
      });
    }

    return deps;
  }, [node]);

  const dependents = useMemo(() => {
    // Find nodes that depend on this node
    const deps: Array<{ nodeId: string; type: string; label: string }> = [];
    
    if (calculationTree?.dependencyGraph) {
      Object.entries(calculationTree.dependencyGraph).forEach(([nodeId, dependentIds]) => {
        if ((dependentIds as string[]).includes(node.nodeId)) {
          // Find the node details
          // This would require traversing the tree to find the node
          deps.push({
            nodeId,
            type: 'Unknown',
            label: 'Dependent Node'
          });
        }
      });
    }

    return deps;
  }, [node.nodeId, calculationTree]);

  return (
    <Card className="bg-slate-700 border-slate-600">
      <CardHeader className="pb-3">
        <CardTitle className="text-slate-100 text-sm">Dependencies</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dependencies (what this node depends on) */}
        <div>
          <div className="text-sm font-medium text-slate-300 mb-2">
            Depends On ({dependencies.length})
          </div>
          {dependencies.length > 0 ? (
            <div className="space-y-1">
              {dependencies.map(dep => (
                <div key={dep.nodeId} className="flex items-center justify-between p-2 bg-slate-800 rounded">
                  <div className="flex items-center gap-2">
                    {getNodeTypeIcon(dep.type, "h-3 w-3")}
                    <span className="text-sm text-slate-200">{dep.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge 
                      variant="outline" 
                      className="text-xs border-0 text-white"
                      style={{ backgroundColor: getNodeTypeColor(dep.type) }}
                    >
                      {dep.type}
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-400 italic">No dependencies</div>
          )}
        </div>

        {/* Dependents (what depends on this node) */}
        <div>
          <div className="text-sm font-medium text-slate-300 mb-2">
            Dependents ({dependents.length})
          </div>
          {dependents.length > 0 ? (
            <div className="space-y-1">
              {dependents.map(dep => (
                <div key={dep.nodeId} className="flex items-center justify-between p-2 bg-slate-800 rounded">
                  <div className="flex items-center gap-2">
                    {getNodeTypeIcon(dep.type, "h-3 w-3")}
                    <span className="text-sm text-slate-200">{dep.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge 
                      variant="outline" 
                      className="text-xs border-0 text-white"
                      style={{ backgroundColor: getNodeTypeColor(dep.type) }}
                    >
                      {dep.type}
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-400 italic">No dependents</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Main Node Debug Details Component
 */
export function NodeDebugDetails({ nodeId, debugResults, calculationTree }: NodeDebugDetailsProps) {
  // Find the node in the tree
  const node = useMemo(() => {
    if (!calculationTree?.trees) return null;
    
    const findNode = (nodes: DebugTreeNode[]): DebugTreeNode | null => {
      for (const node of nodes) {
        if (node.nodeId === nodeId) {
          return node;
        }
        if (node.children) {
          const found = findNode(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    return findNode(calculationTree.trees);
  }, [nodeId, calculationTree]);

  // Get steps for this node
  const nodeSteps = useMemo(() => {
    return debugResults.debugInfo.calculationSteps.filter(step => step.nodeId === nodeId);
  }, [nodeId, debugResults]);

  // Calculate statistics
  const statistics = useMemo((): NodeStatistics => {
    const outputs = nodeSteps
      .map(step => step.output)
      .filter(output => output !== null) as number[];
    
    const calculationTypes = [...new Set(nodeSteps.map(step => step.calculationType))];
    const monthsProcessed = [...new Set(nodeSteps.map(step => step.month))];
    const errorCount = nodeSteps.filter(step => step.errorMessage).length;
    const totalExecutionTime = nodeSteps.reduce((sum, step) => sum + step.executionTimeMs, 0);

    return {
      totalSteps: nodeSteps.length,
      totalExecutionTime,
      averageExecutionTime: nodeSteps.length > 0 ? totalExecutionTime / nodeSteps.length : 0,
      errorCount,
      successCount: nodeSteps.length - errorCount,
      calculationTypes,
      monthsProcessed,
      outputRange: {
        min: outputs.length > 0 ? Math.min(...outputs) : null,
        max: outputs.length > 0 ? Math.max(...outputs) : null
      }
    };
  }, [nodeSteps]);

  const handleCopyNodeId = () => {
    navigator.clipboard.writeText(nodeId);
  };

  if (!node) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center">
            <Info className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">
              Node Not Found
            </h3>
            <p className="text-slate-400 text-sm">
              Could not find node with ID: {nodeId}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Node Header */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-slate-100">
                {getNodeTypeIcon(node.nodeType, "h-5 w-5")}
                {node.label || `${node.nodeType} Node`}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge 
                  variant="outline" 
                  className="border-0 text-white"
                  style={{ backgroundColor: getNodeTypeColor(node.nodeType) }}
                >
                  {node.nodeType}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-slate-400">
                  <span>ID:</span>
                  <code className="text-blue-400 font-mono text-xs">{nodeId}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyNodeId}
                    className="h-5 w-5 p-0 text-slate-400 hover:text-slate-200"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400">Execution Status</div>
              <div className="flex items-center gap-1 mt-1">
                {statistics.errorCount > 0 ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="text-red-400 text-sm">{statistics.errorCount} errors</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    <span className="text-green-400 text-sm">All successful</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="space-y-4">
          <NodeAttributes nodeType={node.nodeType} nodeData={node.nodeData} />
          <NodeStatisticsCard statistics={statistics} nodeType={node.nodeType} />
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <Dependencies node={node} calculationTree={calculationTree} />
          <MonthlyResults steps={nodeSteps} nodeType={node.nodeType} />
        </div>
      </div>
    </div>
  );
}
