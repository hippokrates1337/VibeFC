'use client';

import React, { useState, useMemo, useCallback, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  List, 
  Search, 
  Filter, 
  Download, 
  ChevronUp, 
  ChevronDown,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Eye,
  X
} from 'lucide-react';
import { formatExecutionTime, getNodeTypeColor } from '@/lib/api/debug-calculation';
import type { 
  DebugCalculationStep, 
  StepExecutionLogProps, 
  DebugFilters,
  CalculationType 
} from '@/types/debug';

interface StepTableColumn {
  key: keyof DebugCalculationStep | 'actions';
  label: string;
  width?: string;
  sortable?: boolean;
  filterable?: boolean;
}

const STEP_COLUMNS: StepTableColumn[] = [
  { key: 'stepNumber', label: '#', width: '60px', sortable: true },
  { key: 'nodeId', label: 'Node ID', width: '200px', sortable: true, filterable: true },
  { key: 'nodeType', label: 'Type', width: '100px', sortable: true, filterable: true },
  { key: 'month', label: 'Month', width: '100px', sortable: true, filterable: true },
  { key: 'calculationType', label: 'Calc Type', width: '100px', sortable: true, filterable: true },
  { key: 'output', label: 'Output', width: '120px', sortable: true },
  { key: 'executionTimeMs', label: 'Time', width: '100px', sortable: true },
  { key: 'actions', label: 'Actions', width: '100px' }
];

type SortDirection = 'asc' | 'desc';
type SortConfig = {
  key: keyof DebugCalculationStep;
  direction: SortDirection;
} | null;

/**
 * Filter Panel Component
 */
interface FilterPanelProps {
  filters: DebugFilters;
  onFiltersChange: (filters: DebugFilters) => void;
  availableNodeTypes: string[];
  availableCalculationTypes: CalculationType[];
  availableMonths: string[];
  stepCount: number;
  isOpen: boolean;
  onToggle: () => void;
}

function FilterPanel({ 
  filters, 
  onFiltersChange, 
  availableNodeTypes,
  availableCalculationTypes,
  availableMonths,
  stepCount,
  isOpen,
  onToggle 
}: FilterPanelProps) {
  const handleNodeTypeToggle = (nodeType: string) => {
    const newNodeTypes = new Set(filters.nodeTypes);
    if (newNodeTypes.has(nodeType)) {
      newNodeTypes.delete(nodeType);
    } else {
      newNodeTypes.add(nodeType);
    }
    onFiltersChange({ ...filters, nodeTypes: newNodeTypes });
  };

  const handleCalculationTypeToggle = (calcType: CalculationType) => {
    const newCalcTypes = new Set(filters.calculationTypes);
    if (newCalcTypes.has(calcType)) {
      newCalcTypes.delete(calcType);
    } else {
      newCalcTypes.add(calcType);
    }
    onFiltersChange({ ...filters, calculationTypes: newCalcTypes });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      nodeTypes: new Set(),
      calculationTypes: new Set(),
      monthRange: {},
      executionTimeRange: {},
      showErrorsOnly: false,
      searchTerm: ''
    });
  };

  const activeFiltersCount = 
    filters.nodeTypes.size + 
    filters.calculationTypes.size + 
    (filters.showErrorsOnly ? 1 : 0) + 
    (filters.searchTerm ? 1 : 0) +
    (filters.executionTimeRange.min !== undefined ? 1 : 0) +
    (filters.executionTimeRange.max !== undefined ? 1 : 0);

  return (
    <Card className="bg-slate-700 border-slate-600">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-100 text-lg">
            <Filter className="h-4 w-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2 bg-blue-600 text-blue-100">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearFilters} className="border-slate-500 text-slate-300">
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onToggle} className="text-slate-300">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="text-sm text-slate-400">
          {stepCount} steps {activeFiltersCount > 0 ? '(filtered)' : '(total)'}
        </div>
      </CardHeader>
      
      {isOpen && (
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search nodes, types, months..."
                value={filters.searchTerm}
                onChange={(e) => onFiltersChange({ ...filters, searchTerm: e.target.value })}
                className="pl-10 bg-slate-800 border-slate-600 text-slate-200"
              />
            </div>
          </div>

          {/* Node Types */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Node Types</label>
            <div className="flex flex-wrap gap-2">
              {availableNodeTypes.map(nodeType => (
                <Button
                  key={nodeType}
                  variant={filters.nodeTypes.has(nodeType) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleNodeTypeToggle(nodeType)}
                  className={`${
                    filters.nodeTypes.has(nodeType) 
                      ? "text-white border-0" 
                      : "border-slate-600 text-slate-300 hover:bg-slate-700"
                  }`}
                  style={filters.nodeTypes.has(nodeType) ? {
                    backgroundColor: getNodeTypeColor(nodeType),
                    borderColor: getNodeTypeColor(nodeType)
                  } : {}}
                >
                  {nodeType}
                </Button>
              ))}
            </div>
          </div>

          {/* Calculation Types */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Calculation Types</label>
            <div className="flex flex-wrap gap-2">
              {availableCalculationTypes.map(calcType => (
                <Button
                  key={calcType}
                  variant={filters.calculationTypes.has(calcType) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleCalculationTypeToggle(calcType)}
                  className={filters.calculationTypes.has(calcType) 
                    ? "bg-blue-600 hover:bg-blue-700" 
                    : "border-slate-600 text-slate-300 hover:bg-slate-700"
                  }
                >
                  {calcType.charAt(0).toUpperCase() + calcType.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Execution Time Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Execution Time (ms)</label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Min"
                type="number"
                value={filters.executionTimeRange.min || ''}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  executionTimeRange: {
                    ...filters.executionTimeRange,
                    min: e.target.value ? Number(e.target.value) : undefined
                  }
                })}
                className="bg-slate-800 border-slate-600 text-slate-200"
              />
              <Input
                placeholder="Max"
                type="number"
                value={filters.executionTimeRange.max || ''}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  executionTimeRange: {
                    ...filters.executionTimeRange,
                    max: e.target.value ? Number(e.target.value) : undefined
                  }
                })}
                className="bg-slate-800 border-slate-600 text-slate-200"
              />
            </div>
          </div>

          {/* Error Filter */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="errors-only"
              checked={filters.showErrorsOnly}
              onCheckedChange={(checked) => 
                onFiltersChange({ ...filters, showErrorsOnly: !!checked })
              }
            />
            <label 
              htmlFor="errors-only" 
              className="text-sm font-medium text-slate-300 cursor-pointer"
            >
              Show errors only
            </label>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Step Row Component
 */
interface StepRowProps {
  step: DebugCalculationStep;
  isSelected: boolean;
  isHighlighted: boolean;
  onStepSelect: (stepNumber: number) => void;
  onNodeHighlight: (nodeId: string) => void;
}

function StepRow({ step, isSelected, isHighlighted, onStepSelect, onNodeHighlight }: StepRowProps) {
  const handleRowClick = useCallback(() => {
    onStepSelect(step.stepNumber);
  }, [step.stepNumber, onStepSelect]);

  const handleNodeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onNodeHighlight(step.nodeId);
  }, [step.nodeId, onNodeHighlight]);

  const formatOutput = (output: number | null): string => {
    if (output === null) return 'null';
    if (typeof output === 'number') {
      if (Number.isInteger(output)) {
        return output.toLocaleString();
      } else {
        return output.toFixed(2);
      }
    }
    return String(output);
  };

  const formatInputs = (inputs: any[]): string => {
    if (!inputs || inputs.length === 0) return 'none';
    return inputs.map(input => {
      if (typeof input === 'object' && input.value !== undefined) {
        return formatOutput(input.value);
      }
      if (typeof input === 'number') {
        return formatOutput(input);
      }
      return JSON.stringify(input);
    }).join(', ');
  };

  return (
    <tr
      onClick={handleRowClick}
      className={`
        cursor-pointer transition-colors duration-150
        ${isSelected ? 'bg-blue-900/50 border-blue-500' : 'hover:bg-slate-700/50'}
        ${isHighlighted ? 'bg-yellow-900/30' : ''}
        ${step.errorMessage ? 'bg-red-900/20' : ''}
        border-b border-slate-600
      `}
    >
      {/* Step Number */}
      <td className="px-3 py-2 text-sm font-mono text-slate-300">
        {step.stepNumber}
      </td>

      {/* Node ID */}
      <td className="px-3 py-2 text-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNodeClick}
          className="h-auto p-1 text-left justify-start font-mono text-blue-400 hover:text-blue-300"
        >
          {step.nodeId.substring(0, 8)}...
        </Button>
      </td>

      {/* Node Type */}
      <td className="px-3 py-2">
        <Badge 
          variant="outline" 
          className="text-xs border-0 text-white"
          style={{ backgroundColor: getNodeTypeColor(step.nodeType) }}
        >
          {step.nodeType}
        </Badge>
      </td>

      {/* Month */}
      <td className="px-3 py-2 text-sm font-mono text-slate-300">
        {step.month}
      </td>

      {/* Calculation Type */}
      <td className="px-3 py-2">
        <Badge variant="secondary" className="text-xs bg-slate-600">
          {step.calculationType}
        </Badge>
      </td>

      {/* Output */}
      <td className="px-3 py-2 text-sm font-mono">
        <span className={`${
          step.errorMessage 
            ? 'text-red-400' 
            : step.output === null 
              ? 'text-slate-500' 
              : 'text-green-400'
        }`}>
          {formatOutput(step.output)}
        </span>
      </td>

      {/* Execution Time */}
      <td className="px-3 py-2 text-sm font-mono">
        <span className={`${
          step.executionTimeMs > 100 
            ? 'text-yellow-400' 
            : step.executionTimeMs > 10 
              ? 'text-blue-400' 
              : 'text-slate-400'
        }`}>
          {formatExecutionTime(step.executionTimeMs)}
        </span>
      </td>

      {/* Actions */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          {step.errorMessage && (
            <AlertTriangle className="h-4 w-4 text-red-400" title={step.errorMessage} />
          )}
          {!step.errorMessage && (
            <CheckCircle2 className="h-4 w-4 text-green-400" />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Show step details modal
            }}
            className="h-6 w-6 p-0 text-slate-400 hover:text-slate-200"
          >
            <Eye className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

/**
 * Main Step Execution Log Component
 */
export function StepExecutionLog({
  steps,
  selectedStep,
  onStepSelect,
  filters = {
    nodeTypes: new Set(),
    calculationTypes: new Set(),
    monthRange: {},
    executionTimeRange: {},
    showErrorsOnly: false,
    searchTerm: ''
  },
  onFiltersChange
}: StepExecutionLogProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Extract unique values for filter options
  const filterOptions = useMemo(() => {
    const nodeTypes = [...new Set(steps.map(step => step.nodeType))];
    const calculationTypes = [...new Set(steps.map(step => step.calculationType))] as CalculationType[];
    const months = [...new Set(steps.map(step => step.month))];

    return { nodeTypes, calculationTypes, months };
  }, [steps]);

  // Apply filters and sorting
  const filteredAndSortedSteps = useMemo(() => {
    let filtered = steps.filter(step => {
      // Node type filter
      if (filters.nodeTypes.size > 0 && !filters.nodeTypes.has(step.nodeType)) {
        return false;
      }

      // Calculation type filter
      if (filters.calculationTypes.size > 0 && !filters.calculationTypes.has(step.calculationType)) {
        return false;
      }

      // Search filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const searchMatch = 
          step.nodeId.toLowerCase().includes(searchLower) ||
          step.nodeType.toLowerCase().includes(searchLower) ||
          step.month.toLowerCase().includes(searchLower) ||
          step.calculationType.toLowerCase().includes(searchLower) ||
          (step.errorMessage && step.errorMessage.toLowerCase().includes(searchLower));
        
        if (!searchMatch) return false;
      }

      // Error filter
      if (filters.showErrorsOnly && !step.errorMessage) {
        return false;
      }

      // Execution time filter
      if (filters.executionTimeRange.min !== undefined && step.executionTimeMs < filters.executionTimeRange.min) {
        return false;
      }
      if (filters.executionTimeRange.max !== undefined && step.executionTimeMs > filters.executionTimeRange.max) {
        return false;
      }

      return true;
    });

    // Apply sorting
    if (sortConfig) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === null && bValue === null) return 0;
        if (aValue === null) return 1;
        if (bValue === null) return -1;

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' 
            ? aValue - bValue
            : bValue - aValue;
        }

        return 0;
      });
    }

    return filtered;
  }, [steps, filters, sortConfig]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedSteps.length / pageSize);
  const paginatedSteps = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedSteps.slice(startIndex, endIndex);
  }, [filteredAndSortedSteps, currentPage, pageSize]);

  // Reset to page 1 when filters change
  const resetPagination = useCallback(() => {
    setCurrentPage(1);
  }, []);

  // Update page when filtered results change
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [currentPage, totalPages]);

  const handleSort = useCallback((key: keyof DebugCalculationStep) => {
    setSortConfig(current => {
      if (current?.key === key) {
        if (current.direction === 'asc') {
          return { key, direction: 'desc' };
        } else {
          return null; // Remove sorting
        }
      } else {
        return { key, direction: 'asc' };
      }
    });
  }, []);

  const handleFiltersChange = useCallback((newFilters: DebugFilters) => {
    if (onFiltersChange) {
      onFiltersChange(newFilters);
    }
  }, [onFiltersChange]);

  const handleStepSelect = useCallback((stepNumber: number) => {
    onStepSelect(stepNumber);
  }, [onStepSelect]);

  const handleNodeHighlight = useCallback((nodeId: string) => {
    setHighlightedNode(nodeId);
  }, []);

  const getSortIcon = (key: keyof DebugCalculationStep) => {
    if (sortConfig?.key !== key) return null;
    return sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  if (steps.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <List className="h-5 w-5" />
            Step Execution Log
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center">
            <List className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">
              No Calculation Steps Available
            </h3>
            <p className="text-slate-400 text-sm">
              Run a debug calculation to view step-by-step execution details
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <FilterPanel
        filters={filters}
        onFiltersChange={handleFiltersChange}
        availableNodeTypes={filterOptions.nodeTypes}
        availableCalculationTypes={filterOptions.calculationTypes}
        availableMonths={filterOptions.months}
        stepCount={filteredAndSortedSteps.length}
        isOpen={isFilterPanelOpen}
        onToggle={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
      />

      {/* Steps Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <List className="h-5 w-5" />
                Step Execution Log
              </CardTitle>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="secondary" className="bg-slate-700">
                  {filteredAndSortedSteps.length} of {steps.length} steps
                </Badge>
                {totalPages > 1 && (
                  <Badge variant="outline" className="border-slate-500 text-slate-300">
                    Page {currentPage} of {totalPages}
                  </Badge>
                )}
                {selectedStep && (
                  <Badge variant="outline" className="border-blue-500 text-blue-400">
                    Selected: Step {selectedStep}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="border-slate-600 text-slate-300"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="border-slate-600 text-slate-300"
                  >
                    Next
                  </Button>
                </div>
              )}
              <Button variant="outline" size="sm" className="border-slate-600 text-slate-300">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto" style={{ maxHeight: '600px' }}>
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-800 border-b border-slate-600">
                <tr>
                  {STEP_COLUMNS.map(column => (
                    <th
                      key={column.key}
                      className={`
                        px-3 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider
                        ${column.sortable ? 'cursor-pointer hover:text-slate-100' : ''}
                      `}
                      style={{ width: column.width }}
                      onClick={column.sortable ? () => handleSort(column.key as keyof DebugCalculationStep) : undefined}
                    >
                      <div className="flex items-center gap-1">
                        {column.label}
                        {column.sortable && getSortIcon(column.key as keyof DebugCalculationStep)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedSteps.map(step => (
                  <StepRow
                    key={`${step.nodeId}-${step.stepNumber}`}
                    step={step}
                    isSelected={selectedStep === step.stepNumber}
                    isHighlighted={highlightedNode === step.nodeId}
                    onStepSelect={handleStepSelect}
                    onNodeHighlight={handleNodeHighlight}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
