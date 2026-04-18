'use client';

import { useCallback, useMemo, useState } from 'react';
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
  useCalculationActions,
  useForecastGraphActions
} from '@/lib/store/forecast-graph-store/hooks';
import { type ForecastNodeClient, type MetricNodeAttributes } from '@/lib/store/forecast-graph-store/types';
import { forecastApi } from '@/lib/api/forecast';
import {
  calendarYearsFromMonths,
  fyForecastAndBudget
} from '@/lib/utils/fiscal-year-metric-totals';
import type { ForecastResultsExcelColumn } from '@/lib/utils/export-forecast-results-excel';
import {
  buildHierarchicalStructure,
  defaultNodeComparator,
  flattenHierarchyDeep,
  getNodeDisplayName,
  type HierarchicalNode as UtilHierarchicalNode
} from '@/lib/utils/forecast-hierarchy';
import { compareMmYyyyAsc } from '@/lib/store/forecast-graph-store/utils/date-utils';
import { formatForecastTableNumber } from '@/lib/utils/format-forecast-table-number';
import { rawNumericForPeriodCell } from '@/lib/utils/forecast-period-cell-value';
import type { MergedTimeSeriesValue } from '@/types/forecast';

interface ForecastResultsTableProps {
  className?: string;
}

type HierarchicalNode = UtilHierarchicalNode;

interface MonthColumn {
  month: string; // MM-YYYY format
  isActualPeriod: boolean;
  displayName: string;
}

interface ResultPeriodColumn {
  month: string;
  displayName: string;
  isActualPeriod: boolean;
  segment: 'historical' | 'forecast' | 'budget';
}

type NodeFilter = 'all' | 'metric' | 'data' | 'operator' | 'seed';

// Helper to convert MM-YYYY to display format
const formatMMYYYY = (mmyyyy: string): string => {
  if (!mmyyyy || !mmyyyy.match(/^\d{2}-\d{4}$/)) return 'Invalid';
  const [month, year] = mmyyyy.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return format(date, 'MMM yyyy');
};

function formatPeriodCellValue(
  monthData: MergedTimeSeriesValue | undefined,
  segment: ResultPeriodColumn['segment'],
  nodeType: string
): string {
  const raw = rawNumericForPeriodCell(monthData, segment, nodeType);
  if (raw === null) return '-';
  return formatForecastTableNumber(raw);
}

function formatFyCellValue(n: number | null): string {
  if (n === null) return '-';
  return formatForecastTableNumber(n);
}

function metricSeriesKindFromNode(node: ForecastNodeClient): 'stock' | 'flow' | undefined {
  if (node.type !== 'METRIC') return undefined;
  return (node.data as MetricNodeAttributes).metricSeriesKind ?? 'flow';
}

function seriesLabelForExport(node: ForecastNodeClient): string {
  if (node.type !== 'METRIC') return '—';
  return metricSeriesKindFromNode(node) === 'stock' ? 'Stock' : 'Flow';
}

export function ForecastResultsTable({ className }: ForecastResultsTableProps) {
  // Store hooks
  const { nodes, edges, forecastId } = useForecastGraph();
  const { updateNodeData } = useForecastGraphActions();
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

  // Generate month columns from calculation results
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

  /** Two columns per month: actual/historical + budget, or forecast + budget. */
  const resultPeriodColumns = useMemo((): ResultPeriodColumn[] => {
    const out: ResultPeriodColumn[] = [];
    for (const m of monthColumns) {
      if (m.isActualPeriod) {
        out.push({
          month: m.month,
          displayName: m.displayName,
          isActualPeriod: true,
          segment: 'historical'
        });
        out.push({
          month: m.month,
          displayName: m.displayName,
          isActualPeriod: true,
          segment: 'budget'
        });
      } else {
        out.push({
          month: m.month,
          displayName: m.displayName,
          isActualPeriod: false,
          segment: 'forecast'
        });
        out.push({
          month: m.month,
          displayName: m.displayName,
          isActualPeriod: false,
          segment: 'budget'
        });
      }
    }
    return out;
  }, [monthColumns]);

  const fyYears = useMemo(
    () => calendarYearsFromMonths(monthColumns.map((m) => m.month)),
    [monthColumns]
  );

  const excelColumnMeta = useMemo((): ForecastResultsExcelColumn[] => {
    const monthCols: ForecastResultsExcelColumn[] = resultPeriodColumns.map((c) => ({
      kind: 'month',
      month: c.month,
      displayName: c.displayName,
      isActualPeriod: c.isActualPeriod,
      segment: c.segment
    }));
    const fyCols: ForecastResultsExcelColumn[] = fyYears.flatMap((y) => [
      { kind: 'fy', year: y, segment: 'forecast' },
      { kind: 'fy', year: y, segment: 'budget' }
    ]);
    return [...monthCols, ...fyCols];
  }, [resultPeriodColumns, fyYears]);

  const allExpandedKeys = useMemo(
    () => new Set(filteredNodes.map((n) => n.id)),
    [filteredNodes]
  );

  const hierarchicalNodesForExport = useMemo(() => {
    return buildHierarchicalStructure(filteredNodes, edges, {
      expandedNodes: allExpandedKeys,
      sortComparator: defaultNodeComparator,
      edgeDirection: 'targetIsParent' as const
    });
  }, [filteredNodes, edges, allExpandedKeys]);

  const flattenedNodesForExport = useMemo(
    () => flattenHierarchyDeep(hierarchicalNodesForExport),
    [hierarchicalNodesForExport]
  );

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

  const handleMetricSeriesChange = useCallback(
    async (nodeId: string, value: 'stock' | 'flow') => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node || node.type !== 'METRIC' || !forecastId) return;
      const prev = node.data as MetricNodeAttributes;
      updateNodeData(nodeId, { metricSeriesKind: value });
      try {
        const res = await forecastApi.updateNode(forecastId, nodeId, {
          attributes: { ...prev, metricSeriesKind: value }
        });
        if (res.error) {
          console.error('[ForecastResultsTable] Failed to persist metricSeriesKind:', res.error);
          updateNodeData(nodeId, { metricSeriesKind: prev.metricSeriesKind ?? 'flow' });
        }
      } catch (e) {
        console.error('[ForecastResultsTable] Failed to persist metricSeriesKind:', e);
        updateNodeData(nodeId, { metricSeriesKind: prev.metricSeriesKind ?? 'flow' });
      }
    },
    [nodes, forecastId, updateNodeData]
  );

  // Use utility function for display name
  const getDisplayName = getNodeDisplayName;

  const handleExport = async () => {
    try {
      const { buildForecastResultsExcelBlob } = await import('@/lib/utils/export-forecast-results-excel');
      const monthGroups = monthColumns.map((m) => ({
        month: m.month,
        displayName: m.displayName,
        isActualPeriod: m.isActualPeriod
      }));
      const dataRows = flattenedNodesForExport.map((hierarchicalNode) => {
        const nodeType = hierarchicalNode.node.type ?? '';
        const mergedData = getUnifiedMergedTimeSeriesData(hierarchicalNode.node.id);
        const values = mergedData?.values ?? [];
        const monthCells = resultPeriodColumns.map((col) => {
          const monthData = mergedData?.values.find((v) => v.month === col.month);
          return rawNumericForPeriodCell(monthData, col.segment, nodeType);
        });
        const kind = metricSeriesKindFromNode(hierarchicalNode.node);
        const fyCells = fyYears.flatMap((y) => {
          const fy = fyForecastAndBudget(
            values,
            y,
            nodeType,
            kind
          );
          return [fy.forecast, fy.budget];
        });
        return {
          nodeLabel: getDisplayName(hierarchicalNode.node),
          nodeType,
          seriesLabel: seriesLabelForExport(hierarchicalNode.node),
          level: hierarchicalNode.level,
          cells: [...monthCells, ...fyCells]
        };
      });
      const blob = await buildForecastResultsExcelBlob(monthGroups, fyYears, excelColumnMeta, dataRows);
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = 'forecast-results.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('[ForecastResultsTable] Excel export failed:', e);
    }
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
              No calculation results available. Please configure periods and run calculation first.
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
              Forecast results
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
                  <TableHead
                    rowSpan={2}
                    className="text-slate-300 font-medium sticky left-0 bg-slate-800 z-20 min-w-[200px] align-middle"
                  >
                    Node
                  </TableHead>
                  <TableHead rowSpan={2} className="text-slate-300 font-medium w-20 align-middle">
                    Type
                  </TableHead>
                  <TableHead rowSpan={2} className="text-slate-300 font-medium w-[120px] align-middle">
                    Series
                  </TableHead>
                  {monthColumns.map((col) =>
                    col.isActualPeriod ? (
                      <TableHead
                        key={`${col.month}-group`}
                        colSpan={2}
                        className={cn(
                          'text-center text-slate-300 font-medium min-w-[200px]',
                          'bg-amber-900/20 border-amber-600/50'
                        )}
                      >
                        <div className="flex flex-col">
                          <span>{col.displayName}</span>
                          <span className="text-xs text-slate-400">Historical</span>
                        </div>
                      </TableHead>
                    ) : (
                      <TableHead
                        key={`${col.month}-group`}
                        colSpan={2}
                        className={cn(
                          'text-center text-slate-300 font-medium min-w-[200px]',
                          'bg-blue-900/20 border-blue-600/50'
                        )}
                      >
                        <div className="flex flex-col">
                          <span>{col.displayName}</span>
                          <span className="text-xs text-slate-400">Forecast</span>
                        </div>
                      </TableHead>
                    )
                  )}
                  {fyYears.map((y) => (
                    <TableHead
                      key={`fy-${y}-group`}
                      colSpan={2}
                      className={cn(
                        'text-center text-slate-300 font-medium min-w-[200px]',
                        'bg-emerald-900/25 border-emerald-600/50'
                      )}
                    >
                      <div className="flex flex-col">
                        <span>FY {y}</span>
                        <span className="text-xs text-slate-400">Calendar</span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>

                <TableRow className="border-slate-700 hover:bg-slate-800">
                  {resultPeriodColumns.map((pc, idx) => (
                    <TableHead
                      key={`${pc.month}-${pc.segment}-${idx}`}
                      className={cn(
                        'text-center text-xs text-slate-400 p-2 border-l border-slate-600 min-w-[80px]',
                        pc.isActualPeriod ? 'bg-amber-900/10' : 'bg-blue-900/10'
                      )}
                    >
                      {pc.segment === 'historical' ? (
                        <span>Actual</span>
                      ) : pc.segment === 'forecast' ? (
                        <span>Forecast</span>
                      ) : (
                        <span>Budget</span>
                      )}
                    </TableHead>
                  ))}
                  {fyYears.flatMap((y) => [
                    <TableHead
                      key={`fy-${y}-f`}
                      className="text-center text-xs text-slate-400 p-2 border-l border-slate-600 min-w-[80px] bg-emerald-900/10"
                    >
                      Forecast
                    </TableHead>,
                    <TableHead
                      key={`fy-${y}-b`}
                      className="text-center text-xs text-slate-400 p-2 border-l border-slate-600 min-w-[80px] bg-emerald-900/10"
                    >
                      Budget
                    </TableHead>
                  ])}
                </TableRow>
              </TableHeader>

              <TableBody>
                {flattenedNodes.map((hierarchicalNode) => {
                  const nodeType = hierarchicalNode.node.type ?? '';
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

                      <TableCell className="text-slate-300 text-sm border-r border-slate-600">
                        {hierarchicalNode.node.type === 'METRIC' ? (
                          <Select
                            value={metricSeriesKindFromNode(hierarchicalNode.node) ?? 'flow'}
                            onValueChange={(v) =>
                              handleMetricSeriesChange(hierarchicalNode.node.id, v as 'stock' | 'flow')
                            }
                          >
                            <SelectTrigger className="h-8 w-[100px] bg-slate-700 border-slate-600 text-slate-200 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-600">
                              <SelectItem value="flow" className="text-slate-200">
                                Flow
                              </SelectItem>
                              <SelectItem value="stock" className="text-slate-200">
                                Stock
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </TableCell>
                      
                      {resultPeriodColumns.map((pc, colIndex) => {
                        const monthData = mergedData?.values.find((v) => v.month === pc.month);
                        const text = formatPeriodCellValue(monthData, pc.segment, nodeType);
                        const isDash = text === '-';

                        return (
                          <TableCell
                            key={`${pc.month}-${pc.segment}-${colIndex}`}
                            className={cn(
                              'text-center text-sm font-mono border-l border-slate-600',
                              pc.isActualPeriod ? 'bg-amber-900/5' : 'bg-blue-900/5'
                            )}
                          >
                            <span
                              className={cn(
                                isDash && 'text-slate-500',
                                !isDash && pc.segment === 'historical' && 'text-amber-300',
                                !isDash && pc.segment === 'forecast' && 'text-blue-300',
                                !isDash && pc.segment === 'budget' && 'text-green-300'
                              )}
                            >
                              {text}
                            </span>
                          </TableCell>
                        );
                      })}
                      {fyYears.flatMap((y) => {
                        const fy = fyForecastAndBudget(
                          mergedData?.values ?? [],
                          y,
                          nodeType,
                          metricSeriesKindFromNode(hierarchicalNode.node)
                        );
                        const fText = formatFyCellValue(fy.forecast);
                        const bText = formatFyCellValue(fy.budget);
                        const fDash = fText === '-';
                        const bDash = bText === '-';
                        return [
                          <TableCell
                            key={`fy-${y}-f`}
                            className={cn(
                              'text-center text-sm font-mono border-l border-slate-600',
                              'bg-emerald-950/20'
                            )}
                          >
                            <span
                              className={cn(
                                fDash && 'text-slate-500',
                                !fDash && 'text-blue-300'
                              )}
                            >
                              {fText}
                            </span>
                          </TableCell>,
                          <TableCell
                            key={`fy-${y}-b`}
                            className={cn(
                              'text-center text-sm font-mono border-l border-slate-600',
                              'bg-emerald-950/20'
                            )}
                          >
                            <span
                              className={cn(
                                bDash && 'text-slate-500',
                                !bDash && 'text-green-300'
                              )}
                            >
                              {bText}
                            </span>
                          </TableCell>
                        ];
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