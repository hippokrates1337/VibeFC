import { BadRequestException, Injectable } from '@nestjs/common';
import {
  calculate,
  formatMonth,
  isValidMonthString,
  monthIndexFromDateString,
  parseMonth,
  type CalcType,
  type CalculateSuccess,
  type ClientEdge,
  type ClientNode,
  type EngineVariable,
  type Issue,
  type TraceStep,
} from '@vibefc/forecast-engine';
import type { ForecastNodeDto } from '../dto/forecast-node.dto';
import type { ForecastEdgeDto } from '../dto/forecast-edge.dto';
import type { PeriodInfoDto, UnifiedNodeResultDto } from '../dto/calculation.dto';

export interface EngineRunInput {
  readonly nodes: readonly ForecastNodeDto[];
  readonly edges: readonly ForecastEdgeDto[];
  /** Rows of the `variables` table: `{id, type, values: [{date, value}]}`. */
  readonly variables: readonly unknown[];
  readonly periods: PeriodInfoDto;
  readonly calculationTypes: readonly CalcType[];
  readonly trace?: boolean;
}

export interface EngineRunOutput {
  /** All nodes, values keyed by MM-YYYY (the unified result DTO shape). */
  readonly nodeResults: UnifiedNodeResultDto[];
  readonly warnings: readonly Issue[];
  /** Node ids in evaluation order. */
  readonly order: readonly string[];
  readonly trace?: readonly TraceStep[];
}

/**
 * Thin Nest wrapper around `@vibefc/forecast-engine` (semantics: docs/forecast-engine.md).
 * Converts database rows to the engine's input and the result back to MM-YYYY rows.
 * Stateless: everything a calculation needs is in its arguments.
 */
@Injectable()
export class ForecastEngineService {
  run(input: EngineRunInput): EngineRunOutput {
    const result = calculate({
      nodes: toClientNodes(input.nodes),
      edges: toClientEdges(input.edges),
      variables: toEngineVariables(input.variables),
      windows: {
        actual: { start: month(input.periods.actualStartMonth), end: month(input.periods.actualEndMonth) },
        forecast: { start: month(input.periods.forecastStartMonth), end: month(input.periods.forecastEndMonth) },
      },
      calculationTypes: input.calculationTypes,
      trace: input.trace,
    });

    if (!result.ok) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Invalid forecast graph',
        message: result.errors.map((e) => e.message).join(' '),
        errors: result.errors,
        warnings: result.warnings,
      });
    }

    return {
      nodeResults: toNodeResults(result),
      warnings: result.warnings,
      order: result.order,
      trace: result.trace,
    };
  }
}

function month(value: string): number {
  if (!isValidMonthString(value)) {
    throw new BadRequestException(`Invalid period month "${value}", expected MM-YYYY`);
  }
  return parseMonth(value);
}

export function toClientNodes(nodes: readonly ForecastNodeDto[]): ClientNode[] {
  return nodes.map((node) => ({ id: node.id, type: String(node.kind), data: node.attributes }));
}

export function toClientEdges(edges: readonly ForecastEdgeDto[]): ClientEdge[] {
  return edges.map((edge) => ({ id: edge.id, source: edge.sourceNodeId, target: edge.targetNodeId }));
}

/** Database variable rows -> engine variables; dates become month indices as written (no time zone). */
export function toEngineVariables(rows: readonly unknown[]): EngineVariable[] {
  return rows.map((row) => {
    const variable = row as { id: string; type: string; values?: Array<{ date?: unknown; value?: unknown }> };
    const values: Array<{ month: number; value: number | null }> = [];
    for (const point of variable.values ?? []) {
      if (typeof point?.date !== 'string') continue;
      let pointMonth: number;
      try {
        pointMonth = monthIndexFromDateString(point.date);
      } catch {
        continue;
      }
      const raw = point.value;
      const value = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : null;
      values.push({ month: pointMonth, value: value !== null && Number.isFinite(value) ? value : null });
    }
    return { id: variable.id, type: variable.type, values };
  });
}

function toNodeResults(result: CalculateSuccess): UnifiedNodeResultDto[] {
  return result.nodes.map((node) => ({
    nodeId: node.nodeId,
    nodeType: node.nodeType,
    values: node.values.map((v) => ({
      month: formatMonth(v.month),
      historical: v.historical,
      forecast: v.forecast,
      budget: v.budget,
      calculated: v.calculated,
    })),
  }));
}
