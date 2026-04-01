'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Download, Filter, Calendar } from 'lucide-react';
import { format } from 'date-fns';

import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

import { 
  useForecastGraph,
  useCalculations,
  useCalculationActions
} from '@/lib/store/forecast-graph-store/hooks';
import {
  type ForecastNodeClient,
  type ForecastEdgeClient,
  type MetricNodeAttributes,
  type DataNodeAttributes,
  type OperatorNodeAttributes,
  type SeedNodeAttributes
} from '@/lib/store/forecast-graph-store/types';
import { 
  buildHierarchicalStructure,
  flattenHierarchy,
  defaultNodeComparator,
  getNodeDisplayName,
  type HierarchicalNode as UtilHierarchicalNode
} from '@/lib/utils/forecast-hierarchy';
import { compareMmYyyyAsc } from '@/lib/store/forecast-graph-store/utils/date-utils';
import { formatForecastTableNumber } from '@/lib/utils/format-forecast-table-number';

interface ForecastResultsTableProps {
  className?: string;
}

type HierarchicalNode = UtilHierarchicalNode;

interface MonthColumn {
  month: string; // MM-YYYY format
  isActualPeriod: boolean;
  displayName: string;
}

type NodeFilter = 'all' | 'metric' | 'data' | 'operator' | 'seed';

// Helper to convert MM-YYYY to display format
const formatMMYYYY = (mmyyyy: string): string => {
  if (!mmyyyy || !mmyyyy.match(/^\d{2}-\d{4}$/)) return 'Invalid';
  const [month, year] = mmyyyy.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return format(date, 'MMM yyyy');
};

export function ForecastResultsTable({ className }: ForecastResultsTableProps) {
  // Store hooks - using unified data access
  const { nodes, edges } = useForecastGraph();
  const { forecastPeriods, calculationResults } = useCalculations();
  const { getUnifiedMergedTimeSeriesData } = useCalculationActions();

  // Local state
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [nodeFilter, setNodeFilter] = useState<NodeFilter>('all');

  // Filter nodes based on selected filter
  const filteredNodes = useMemo(() => {
    if (nodeFilter === 'all') return nodes;
    return nodes.filter((node: ForecastNodeClient) => node.type?.toLowerCase() === nodeFilter);
  }, [nodes, nodeFilter]);

  // Build hierarchical structure
  const hierarchicalNodes = useMemo(() => {
    return buildHierarchicalStructure(filteredNodes, edges, {
      expandedNodes,
      sortComparator: defaultNodeComparator,
      edgeDirection: 'targetIsParent' as const
    });
  }, [filteredNodes, edges, expandedNodes]);

  // Flatten the hierarchy for display
  const flattenedNodes = useMemo(() => {
    const result: HierarchicalNode[] = [];

    const collectVisibleNodes = (node: HierarchicalNode) => {
      // Include all nodes since we already filtered above
      result.push(node);
      
      // If node is expanded, process children
      if (node.isExpanded) {
        node.children.forEach(collectVisibleNodes);
      }
    };

    hierarchicalNodes.forEach(collectVisibleNodes);
    return result;
  }, [hierarchicalNodes]);

  // Generate month columns from unified data
  const monthColumns = useMemo((): MonthColumn[] => {
    if (!forecastPeriods || !calculationResults) return [];

    // Extract months from calculation results
    const allMonths = new Set<string>();
    
    // Get months from metrics and allNodes
    [...(calculationResults.metrics || []), ...(calculationResults.allNodes || [])].forEach(node => {
      node.values.forEach((value: any) => {
        allMonths.add(value.month);
      });
    });

    // Chronological order (localeCompare on MM-YYYY is wrong across years, e.g. "06-2025" vs "07-2024")
    const sortedMonths = Array.from(allMonths).sort(compareMmYyyyAsc);

    const actStart = forecastPeriods.actualStartMonth;
    const actEnd = forecastPeriods.actualEndMonth;

    return sortedMonths.map((month) => ({
      month,
      isActualPeriod: Boolean(
        actStart &&
          actEnd &&
          compareMmYyyyAsc(actStart, month) <= 0 &&
          compareMmYyyyAsc(month, actEnd) <= 0
      ),
      displayName: formatMMYYYY(month)
    }));
  }, [forecastPeriods, calculationResults]);

  // Handle node expansion
  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  // Use utility function for display name
  const getDisplayName = getNodeDisplayName;

  // Export data functionality - updated for unified data
  const handleExport = () => {
    const csvData = [
      ['Node', 'Type', 'Level', ...monthColumns.map(col => col.displayName)],
      ...flattenedNodes.map(hierarchicalNode => {
        const mergedData = getUnifiedMergedTimeSeriesData(hierarchicalNode.node.id);
        return [
          getDisplayName(hierarchicalNode.node),
          hierarchicalNode.node.type,
          hierarchicalNode.level.toString(),
          ...monthColumns.map(col => {
            const monthData = mergedData?.values.find((v: any) => v.month === col.month);
            if (!monthData) return '-';
            
            if (col.isActualPeriod) {
              return formatForecastTableNumber(monthData.historical);
            } else {
              return hierarchicalNode.node.type === 'METRIC' 
                ? `${formatForecastTableNumber(monthData.forecast)} / ${formatForecastTableNumber(monthData.budget)}`
                : formatForecastTableNumber(monthData.forecast);
            }
          })
        ];
      })
    ];

    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'forecast-results.csv';
    link.click();
  };

  if (!nodes.length) {
    return (
      <Card className={cn("bg-slate-800 border-slate-700", className)}>
        <CardContent className="p-6">
          <Alert>
            <AlertDescription>
              No forecast nodes available. Please create a forecast graph first.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!calculationResults) {
    return (
      <Card className={cn("bg-slate-800 border-slate-700", className)}>
        <CardContent className="p-6">
          <Alert>
            <AlertDescription>
              No calculation results available. Please configure periods and trigger calculation first.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-slate-800 border-slate-700", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-200">
              <Calendar className="h-5 w-5" />
              Unified Forecast Results
            </CardTitle>
            <CardDescription className="text-slate-400">
              {forecastPeriods?.actualStartMonth && forecastPeriods?.actualEndMonth
                ? `Historical data (${formatMMYYYY(forecastPeriods.actualStartMonth)} - ${formatMMYYYY(forecastPeriods.actualEndMonth)}) and forecast data (${formatMMYYYY(forecastPeriods.forecastStartMonth)} - ${formatMMYYYY(forecastPeriods.forecastEndMonth)})`
                : `Forecast data (${formatMMYYYY(forecastPeriods?.forecastStartMonth || '')} - ${formatMMYYYY(forecastPeriods?.forecastEndMonth || '')}) - no historical period defined`
              }
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={nodeFilter} onValueChange={(value) => setNodeFilter(value as NodeFilter)}>
              <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-slate-200">
                <Filter className="h-4 w-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="all" className="text-slate-200">All Nodes</SelectItem>
                <SelectItem value="metric" className="text-slate-200">Metrics</SelectItem>
                <SelectItem value="data" className="text-slate-200">Data</SelectItem>
                <SelectItem value="operator" className="text-slate-200">Operators</SelectItem>
                <SelectItem value="seed" className="text-slate-200">Seeds</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-lg border border-slate-700 bg-slate-900/50">
          <div className="overflow-auto max-h-[600px]">
            <Table>
              <TableHeader className="sticky top-0 bg-slate-800 z-10">
                <TableRow className="border-slate-700 hover:bg-slate-800">
                  <TableHead className="text-slate-300 font-medium sticky left-0 bg-slate-800 z-20 min-w-[200px]">
                    Node
                  </TableHead>
                  <TableHead className="text-slate-300 font-medium w-20">
                    Type
                  </TableHead>
                  {monthColumns.map((col, index) => (
                    <TableHead 
                      key={index} 
                      className={cn(
                        "text-center text-slate-300 font-medium min-w-[120px]",
                        col.isActualPeriod 
                          ? "bg-amber-900/20 border-amber-600/50" 
                          : "bg-blue-900/20 border-blue-600/50"
                      )}
                    >
                      <div className="flex flex-col">
                        <span>{col.displayName}</span>
                        <span className="text-xs text-slate-400">
                          {col.isActualPeriod ? 'Historical' : 'Forecast'}
                        </span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>

                {/* Sub-header for forecast months */}
                <TableRow className="border-slate-700 hover:bg-slate-800">
                  <TableHead className="sticky left-0 bg-slate-800 z-20"></TableHead>
                  <TableHead></TableHead>
                  {monthColumns.map((col, index) => (
                    <TableHead 
                      key={index} 
                      className={cn(
                        "text-center text-xs text-slate-400 p-2 border-l border-slate-600",
                        col.isActualPeriod 
                          ? "bg-amber-900/10" 
                          : "bg-blue-900/10"
                      )}
                    >
                      {col.isActualPeriod ? (
                        <span>Actual</span>
                      ) : (
                        <div className="flex justify-between">
                          <span>Forecast</span>
                          <span className="mx-1">|</span>
                          <span>Budget</span>
                        </div>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {flattenedNodes.map((hierarchicalNode) => {
                  const mergedData = getUnifiedMergedTimeSeriesData(hierarchicalNode.node.id);
                  
                  return (
                    <TableRow 
                      key={hierarchicalNode.id} 
                      className="border-slate-700 hover:bg-slate-800/50"
                    >
                      <TableCell 
                        className="sticky left-0 bg-slate-800 z-10 border-r border-slate-600"
                        style={{ paddingLeft: `${hierarchicalNode.level * 20 + 16}px` }}
                      >
                        <div className="flex items-center gap-2">
                          {hierarchicalNode.hasChildren && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-slate-400 hover:text-slate-200"
                              onClick={() => toggleNodeExpansion(hierarchicalNode.id)}
                            >
                              {hierarchicalNode.isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          <span className="text-slate-200 font-medium">
                            {getDisplayName(hierarchicalNode.node)}
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-slate-400 text-sm">
                        <span className={cn(
                          "px-2 py-1 rounded text-xs",
                          hierarchicalNode.node.type === 'METRIC' && "bg-purple-900/30 text-purple-300",
                          hierarchicalNode.node.type === 'DATA' && "bg-blue-900/30 text-blue-300",
                          hierarchicalNode.node.type === 'OPERATOR' && "bg-yellow-900/30 text-yellow-300",
                          hierarchicalNode.node.type === 'SEED' && "bg-pink-900/30 text-pink-300",
                          hierarchicalNode.node.type === 'CONSTANT' && "bg-gray-900/30 text-gray-300"
                        )}>
                          {hierarchicalNode.node.type}
                        </span>
                      </TableCell>
                      
                      {monthColumns.map((col, colIndex) => {
                        const monthData = mergedData?.values.find((v: any) => v.month === col.month);
                        
                        return (
                          <TableCell 
                            key={colIndex} 
                            className={cn(
                              "text-center text-sm font-mono border-l border-slate-600",
                              col.isActualPeriod 
                                ? "bg-amber-900/5" 
                                : "bg-blue-900/5"
                            )}
                          >
                            {monthData ? (
                              col.isActualPeriod ? (
                                <span className="text-amber-300">
                                  {formatForecastTableNumber(monthData.historical)}
                                </span>
                              ) : (
                                <div className="flex justify-between text-xs">
                                  <span className="text-blue-300">
                                    {formatForecastTableNumber(monthData.forecast)}
                                  </span>
                                  {hierarchicalNode.node.type === 'METRIC' && (
                                    <>
                                      <span className="text-slate-500">|</span>
                                      <span className="text-green-300">
                                        {formatForecastTableNumber(monthData.budget)}
                                      </span>
                                    </>
                                  )}
                                </div>
                              )
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 