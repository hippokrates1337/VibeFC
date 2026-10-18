import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { buildGraph, formatMonth, type TraceStep } from '@vibefc/forecast-engine';
import { ForecastCalculationService, type ForecastGraph } from './forecast-calculation.service';
import { toClientEdges, toClientNodes } from './forecast-engine.service';
import {
  DebugCalculationRequestDto,
  DebugCalculationResultDto,
  DebugCalculationStepDto,
  DebugCalculationTreeDto,
  DebugTreeNodeDto,
  CalculationTreeRequestDto,
} from '../dto/debug-calculation.dto';
import { CalculationTypeDto } from '../dto/calculation.dto';
import type { DebugCalculationStep, DebugLevel, NodeType } from '../types/debug-types';

const MAX_STEPS: Record<DebugLevel, number> = { basic: 100, detailed: 1000, verbose: 10000 };

/**
 * Debug calculation: runs the normal calculation with the engine's trace switched on and
 * maps the trace and graph to the debug DTOs. The trace is part of the engine's return
 * value, so nothing is shared between requests.
 */
@Injectable()
export class DebugCalculationService {
  private readonly logger = new Logger(DebugCalculationService.name);

  /** Steps of the last debug run, keyed by user + forecast. */
  private static readonly MAX_STORED_RUNS = 50;
  private readonly lastStepsByRun = new Map<string, DebugCalculationStep[]>();

  constructor(private readonly forecastCalculationService: ForecastCalculationService) {}

  private runKey(userId: string, forecastId: string): string {
    return `${userId}:${forecastId}`;
  }

  private storeSteps(userId: string, forecastId: string, steps: DebugCalculationStep[]): void {
    const key = this.runKey(userId, forecastId);
    this.lastStepsByRun.delete(key);
    this.lastStepsByRun.set(key, [...steps]);
    if (this.lastStepsByRun.size > DebugCalculationService.MAX_STORED_RUNS) {
      const oldestKey = this.lastStepsByRun.keys().next().value;
      if (oldestKey !== undefined) {
        this.lastStepsByRun.delete(oldestKey);
      }
    }
  }

  /**
   * Trigger calculation with debug information
   */
  async calculateWithDebug(
    forecastId: string,
    userId: string,
    request: Request,
    debugRequest: DebugCalculationRequestDto
  ): Promise<DebugCalculationResultDto> {
    const started = Date.now();
    const level: DebugLevel = debugRequest.debugLevel ?? 'basic';

    const run = await this.forecastCalculationService.calculateAndStore(
      forecastId,
      userId,
      request,
      {
        calculationTypes: debugRequest.calculationTypes,
        includeIntermediateNodes: debugRequest.includeIntermediateNodes ?? true,
      },
      { trace: true }
    );

    const resultStarted = Date.now();
    const calculationTree = buildDebugTree(run.graph);
    const steps = toDebugSteps(run.engine.trace ?? [], run.graph, debugRequest.focusNodeIds, MAX_STEPS[level] ?? MAX_STEPS.basic);
    this.storeSteps(userId, forecastId, steps);

    return {
      ...run.result,
      debugInfo: {
        calculationTree,
        calculationSteps: steps.map(({ timestamp: _timestamp, ...step }) => step as DebugCalculationStepDto),
        performanceMetrics: {
          totalExecutionTimeMs: Date.now() - started,
          nodeExecutionTimes: {},
          cacheHitRate: 0,
          totalCacheHits: 0,
          totalCacheMisses: 0,
          phaseTimings: {
            validation: 0,
            treeProcessing: run.timings.loadMs,
            calculation: run.timings.calculateMs,
            resultBuilding: run.timings.storeMs + (Date.now() - resultStarted),
          },
        },
        warnings: run.engine.warnings.map((w) => w.message),
        errors: [],
      },
    };
  }

  /**
   * Get the graph as one tree per metric, without calculating
   */
  async getCalculationTree(
    forecastId: string,
    userId: string,
    request: Request,
    _requestDto?: CalculationTreeRequestDto
  ): Promise<DebugCalculationTreeDto> {
    const graph = await this.forecastCalculationService.loadGraph(forecastId, userId, request);
    return buildDebugTree(graph);
  }

  /**
   * Get the calculation steps of this user's last debug calculation for this forecast.
   * Only runs the same user started are returned. Kept in memory per instance.
   */
  async getCalculationSteps(forecastId: string, userId: string): Promise<DebugCalculationStep[]> {
    this.logger.log(`Getting calculation steps for forecast ${forecastId}`);
    return this.lastStepsByRun.get(this.runKey(userId, forecastId)) ?? [];
  }
}

/** A node's inputs as the engine reads them (SEED: its source metric), or raw edges if the graph is invalid. */
function inputsByNode(graph: ForecastGraph): { inputs: Map<string, string[]>; order: string[] } {
  const clientNodes = toClientNodes(graph.nodes);
  const built = buildGraph(clientNodes, toClientEdges(graph.edges)).graph;
  const inputs = new Map<string, string[]>();
  if (built) {
    built.nodes.forEach((node) => inputs.set(node.id, node.inputs.map((input) => built.nodes[input.source].id)));
    return { inputs, order: built.order.map((v) => built.nodes[v].id) };
  }
  for (const node of graph.nodes) inputs.set(node.id, []);
  for (const edge of graph.edges) inputs.get(edge.targetNodeId)?.push(edge.sourceNodeId);
  return { inputs, order: [] };
}

function nodeLabel(node: ForecastGraph['nodes'][number]): string {
  const data = (node.attributes ?? {}) as Record<string, any>;
  switch (node.kind) {
    case 'METRIC':
      return data.label || 'Unnamed Metric';
    case 'DATA':
      return data.name || 'Data Node';
    case 'CONSTANT':
      return `Constant: ${data.value ?? 0}`;
    case 'OPERATOR':
      return data.op === 'offset' && data.offsetMonths != null ? `Operator: offset (${data.offsetMonths}m)` : `Operator: ${data.op || 'Unknown'}`;
    case 'SEED':
      return 'Seed Node';
    default:
      return 'Unknown Node';
  }
}

/**
 * Display-only view of the graph: one tree per METRIC, following inputs. A node already
 * shown in the same tree appears again as a reference without children; a SEED's lag-1
 * link to its metric is not expanded (it is in `nodeData.sourceMetricId`).
 */
export function buildDebugTree(graph: ForecastGraph): DebugCalculationTreeDto {
  const { inputs, order } = inputsByNode(graph);
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));

  const expand = (id: string, seen: Set<string>): DebugTreeNodeDto => {
    const node = byId.get(id)!;
    const isReference = seen.has(id);
    seen.add(id);
    const children =
      isReference || node.kind === 'SEED' ? [] : (inputs.get(id) ?? []).filter((c) => byId.has(c)).map((c) => expand(c, seen));
    const data = (node.attributes ?? {}) as Record<string, any>;
    return {
      nodeId: id,
      nodeType: node.kind as NodeType,
      nodeData: node.attributes,
      children,
      inputOrder: Array.isArray(data.inputOrder) ? [...data.inputOrder] : undefined,
      position: node.position || { x: 0, y: 0 },
      label: nodeLabel(node),
      ...(isReference ? { isReference: true } : {}),
    };
  };

  const metricIds = (order.length > 0 ? order : graph.nodes.map((n) => n.id)).filter((id) => byId.get(id)?.kind === 'METRIC');
  const dependencyGraph: Record<string, string[]> = {};
  inputs.forEach((sources, id) => (dependencyGraph[id] = sources));

  return {
    trees: metricIds.map((id) => expand(id, new Set())),
    executionOrder: order,
    totalNodes: graph.nodes.length,
    dependencyGraph,
    metricOrder: metricIds,
  };
}

const TYPE_DTO: Record<string, CalculationTypeDto> = {
  historical: CalculationTypeDto.HISTORICAL,
  forecast: CalculationTypeDto.FORECAST,
  budget: CalculationTypeDto.BUDGET,
};

/** Engine trace -> debug steps (focus filter and level cap applied). */
export function toDebugSteps(
  trace: readonly TraceStep[],
  graph: ForecastGraph,
  focusNodeIds: string[] | undefined,
  maxSteps: number
): DebugCalculationStep[] {
  const attributes = new Map(graph.nodes.map((node) => [node.id, node.attributes]));
  const focus = focusNodeIds && focusNodeIds.length > 0 ? new Set(focusNodeIds) : null;
  const timestamp = new Date();
  const steps: DebugCalculationStep[] = [];
  for (const step of trace) {
    if (steps.length >= maxSteps) break;
    if (focus && !focus.has(step.nodeId)) continue;
    steps.push({
      nodeId: step.nodeId,
      nodeType: step.nodeType,
      stepNumber: steps.length + 1,
      month: formatMonth(step.month),
      calculationType: TYPE_DTO[step.type] as any,
      phase: step.phase,
      inputs: [
        ...step.inputs.map((input) => ({ nodeId: input.nodeId, lag: input.lag, month: formatMonth(input.month), value: input.value })),
        ...(step.variableId ? [{ variableId: step.variableId, month: formatMonth(step.month), value: step.value }] : []),
      ],
      output: step.value,
      executionTimeMs: 0,
      dependencies: Array.from(new Set(step.inputs.map((input) => input.nodeId))),
      nodeAttributes: attributes.get(step.nodeId),
      timestamp,
    });
  }
  return steps;
}
