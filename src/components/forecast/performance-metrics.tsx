'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  Clock, 
  Zap, 
  Database, 
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Monitor,
  HardDrive,
  Timer
} from 'lucide-react';
import { formatExecutionTime, getNodeTypeColor } from '@/lib/api/debug-calculation';
import type { 
  PerformanceMetricsProps,
  DebugPerformanceMetrics 
} from '@/types/debug';

interface ExtendedPerformanceMetrics extends DebugPerformanceMetrics {
  phaseTimings: {
    validation: number;
    treeProcessing: number;
    calculation: number;
    resultBuilding: number;
  };
  totalCacheHits: number;
  totalCacheMisses: number;
}

interface PerformanceBreakdown {
  phase: string;
  time: number;
  percentage: number;
  icon: React.ReactNode;
  description: string;
}

interface NodePerformanceData {
  nodeId: string;
  nodeType?: string;
  executionTime: number;
  percentage: number;
  isBottleneck: boolean;
}

/**
 * Phase Performance Component
 */
interface PhasePerformanceProps {
  metrics: DebugPerformanceMetrics;
}

function PhasePerformance({ metrics }: PhasePerformanceProps) {
  const phaseBreakdown = useMemo((): PerformanceBreakdown[] => {
    const total = metrics.totalExecutionTimeMs;
    
    return [
      {
        phase: 'Validation',
        time: metrics.phaseTimings.validation,
        percentage: total > 0 ? (metrics.phaseTimings.validation / total) * 100 : 0,
        icon: <CheckCircle2 className="h-4 w-4" />,
        description: 'Request and graph validation'
      },
      {
        phase: 'Tree Processing',
        time: metrics.phaseTimings.treeProcessing,
        percentage: total > 0 ? (metrics.phaseTimings.treeProcessing / total) * 100 : 0,
        icon: <BarChart3 className="h-4 w-4" />,
        description: 'Tree ordering and flattening'
      },
      {
        phase: 'Calculation',
        time: metrics.phaseTimings.calculation,
        percentage: total > 0 ? (metrics.phaseTimings.calculation / total) * 100 : 0,
        icon: <Zap className="h-4 w-4" />,
        description: 'Node evaluation and computation'
      },
      {
        phase: 'Result Building',
        time: metrics.phaseTimings.resultBuilding,
        percentage: total > 0 ? (metrics.phaseTimings.resultBuilding / total) * 100 : 0,
        icon: <Database className="h-4 w-4" />,
        description: 'Result aggregation and formatting'
      }
    ].sort((a, b) => b.time - a.time);
  }, [metrics]);

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-100">
          <Timer className="h-5 w-5" />
          Phase Performance Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {phaseBreakdown.map((phase) => (
          <div key={phase.phase} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {phase.icon}
                <span className="text-slate-200 font-medium">{phase.phase}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-300 font-mono text-sm">
                  {formatExecutionTime(phase.time)}
                </span>
                <Badge variant="secondary" className="text-xs bg-slate-700">
                  {phase.percentage.toFixed(1)}%
                </Badge>
              </div>
            </div>
            <Progress 
              value={phase.percentage} 
              className="h-2 bg-slate-700"
            />
            <div className="text-xs text-slate-400">{phase.description}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Cache Performance Component
 */
interface CachePerformanceProps {
  metrics: DebugPerformanceMetrics;
}

function CachePerformance({ metrics }: CachePerformanceProps) {
  const totalOperations = metrics.totalCacheHits + metrics.totalCacheMisses;
  const missRate = totalOperations > 0 ? (metrics.totalCacheMisses / totalOperations) * 100 : 0;

  const getCachePerformanceColor = (hitRate: number) => {
    if (hitRate >= 80) return 'text-green-400';
    if (hitRate >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getCachePerformanceIcon = (hitRate: number) => {
    if (hitRate >= 80) return <CheckCircle2 className="h-4 w-4 text-green-400" />;
    if (hitRate >= 60) return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
    return <AlertTriangle className="h-4 w-4 text-red-400" />;
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-100">
          <Database className="h-5 w-5" />
          Cache Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Cache Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-slate-700 rounded">
            <div className={`text-2xl font-bold ${getCachePerformanceColor(metrics.cacheHitRate)}`}>
              {metrics.cacheHitRate.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-400">Hit Rate</div>
          </div>
          <div className="text-center p-3 bg-slate-700 rounded">
            <div className="text-2xl font-bold text-slate-100">
              {totalOperations.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400">Total Operations</div>
          </div>
        </div>

        {/* Cache Hit/Miss Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-slate-200">Cache Hits</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400 font-mono">
                {metrics.totalCacheHits.toLocaleString()}
              </span>
              <Badge variant="secondary" className="text-xs bg-green-900 text-green-200">
                {metrics.cacheHitRate.toFixed(1)}%
              </Badge>
            </div>
          </div>
          <Progress 
            value={metrics.cacheHitRate} 
            className="h-2 bg-slate-700"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-slate-200">Cache Misses</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-400 font-mono">
                {metrics.totalCacheMisses.toLocaleString()}
              </span>
              <Badge variant="secondary" className="text-xs bg-red-900 text-red-200">
                {missRate.toFixed(1)}%
              </Badge>
            </div>
          </div>
          <Progress 
            value={missRate} 
            className="h-2 bg-slate-700"
          />
        </div>

        {/* Performance Assessment */}
        <div className="flex items-center gap-2 p-3 bg-slate-700 rounded">
          {getCachePerformanceIcon(metrics.cacheHitRate)}
          <div>
            <div className="text-sm font-medium text-slate-200">
              {metrics.cacheHitRate >= 80 ? 'Excellent' : 
               metrics.cacheHitRate >= 60 ? 'Good' : 'Poor'} Cache Performance
            </div>
            <div className="text-xs text-slate-400">
              {metrics.cacheHitRate >= 80 
                ? 'Cache is working efficiently' 
                : metrics.cacheHitRate >= 60
                  ? 'Cache performance could be improved'
                  : 'Consider optimizing cache strategy'
              }
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Node Performance Component
 */
interface NodePerformanceProps {
  metrics: DebugPerformanceMetrics;
  onNodeFocus?: (nodeId: string) => void;
}

function NodePerformance({ metrics, onNodeFocus }: NodePerformanceProps) {
  const nodePerformanceData = useMemo((): NodePerformanceData[] => {
    const entries = Object.entries(metrics.nodeExecutionTimes);
    const totalTime = metrics.totalExecutionTimeMs;
    
    const data = entries
      .map(([nodeId, time]) => ({
        nodeId,
        executionTime: time,
        percentage: totalTime > 0 ? (time / totalTime) * 100 : 0,
        isBottleneck: (time / totalTime) > 0.1 // Consider >10% as bottleneck
      }))
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10); // Top 10 slowest nodes

    return data;
  }, [metrics]);

  const handleNodeClick = (nodeId: string) => {
    if (onNodeFocus) {
      onNodeFocus(nodeId);
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-100">
          <TrendingUp className="h-5 w-5" />
          Node Performance (Top 10 Slowest)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {nodePerformanceData.length > 0 ? (
            nodePerformanceData.map((node, index) => (
              <div 
                key={node.nodeId}
                className="flex items-center justify-between p-2 bg-slate-700 rounded hover:bg-slate-600 transition-colors cursor-pointer"
                onClick={() => handleNodeClick(node.nodeId)}
              >
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 bg-slate-600 rounded text-xs font-bold text-slate-200">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-mono text-blue-400">
                      {node.nodeId.substring(0, 8)}...
                    </div>
                    {node.isBottleneck && (
                      <Badge variant="outline" className="text-xs border-red-500 text-red-400 mt-1">
                        Bottleneck
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-slate-200">
                    {formatExecutionTime(node.executionTime)}
                  </div>
                  <div className="text-xs text-slate-400">
                    {node.percentage.toFixed(1)}% of total
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400">
              No node performance data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * System Performance Component
 */
interface SystemPerformanceProps {
  metrics: DebugPerformanceMetrics;
}

function SystemPerformance({ metrics }: SystemPerformanceProps) {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-100">
          <Monitor className="h-5 w-5" />
          System Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Execution Time */}
        <div className="flex items-center justify-between p-3 bg-slate-700 rounded">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-400" />
            <span className="text-slate-200">Total Execution Time</span>
          </div>
          <span className="text-blue-400 font-mono text-lg font-bold">
            {formatExecutionTime(metrics.totalExecutionTimeMs)}
          </span>
        </div>

        {/* Memory Usage (if available) */}
        {metrics.memoryUsageMB && (
          <div className="flex items-center justify-between p-3 bg-slate-700 rounded">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-green-400" />
              <span className="text-slate-200">Memory Usage</span>
            </div>
            <span className="text-green-400 font-mono text-lg font-bold">
              {metrics.memoryUsageMB.toFixed(1)} MB
            </span>
          </div>
        )}

        {/* Performance Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-slate-700 rounded">
            <div className="text-lg font-bold text-slate-100">
              {Object.keys(metrics.nodeExecutionTimes).length}
            </div>
            <div className="text-xs text-slate-400">Nodes Processed</div>
          </div>
          <div className="text-center p-3 bg-slate-700 rounded">
            <div className="text-lg font-bold text-slate-100">
              {metrics.totalCacheHits + metrics.totalCacheMisses}
            </div>
            <div className="text-xs text-slate-400">Cache Operations</div>
          </div>
        </div>

        {/* Performance Rating */}
        <div className="p-3 bg-slate-700 rounded">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-yellow-400" />
            <span className="text-slate-200 font-medium">Performance Rating</span>
          </div>
          <div className="text-sm text-slate-400">
            {metrics.totalExecutionTimeMs < 1000 
              ? '🚀 Excellent - Very fast execution'
              : metrics.totalExecutionTimeMs < 5000
                ? '✅ Good - Acceptable performance'
                : metrics.totalExecutionTimeMs < 15000
                  ? '⚠️ Fair - Could be optimized'
                  : '🐌 Slow - Needs optimization'
            }
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Main Performance Metrics Component
 */
export function PerformanceMetrics({ metrics, onNodeFocus }: PerformanceMetricsProps) {
  if (!metrics) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <BarChart3 className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center">
            <BarChart3 className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">
              No Performance Data Available
            </h3>
            <p className="text-slate-400 text-sm">
              Run a debug calculation to view performance metrics
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Performance Analysis</h2>
          <p className="text-slate-400 mt-1">
            Detailed breakdown of calculation performance and bottlenecks
          </p>
        </div>
        <Button 
          variant="outline" 
          className="border-slate-600 text-slate-300"
          onClick={onNodeFocus ? () => onNodeFocus('export') : undefined}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SystemPerformance metrics={metrics} />
        <CachePerformance metrics={metrics} />
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PhasePerformance metrics={metrics} />
        <NodePerformance metrics={metrics} onNodeFocus={onNodeFocus} />
      </div>
    </div>
  );
}
