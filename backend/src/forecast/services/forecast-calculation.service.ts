import { Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { Request } from 'express';
import { formatMonth, monthIndexFromDateString, parseMonth, type CalcType, type Issue } from '@vibefc/forecast-engine';
import { SupabaseOptimizedService } from '../../supabase/supabase-optimized.service';
import { DataIntakeService } from '../../data-intake/data-intake.service';
import { ForecastService } from './forecast.service';
import { ForecastNodeService } from './forecast-node.service';
import { ForecastEdgeService } from './forecast-edge.service';
import { ForecastEngineService, type EngineRunOutput } from './forecast-engine.service';
import {
  ForecastCalculationResultDto,
  UnifiedCalculationRequestDto,
  UnifiedCalculationResultDto,
  CalculationTypeDto,
  CalculationWarningDto,
  UnifiedNodeResultDto,
  PeriodInfoDto,
} from '../dto/calculation.dto';
import type { ForecastNodeDto } from '../dto/forecast-node.dto';
import type { ForecastEdgeDto } from '../dto/forecast-edge.dto';

export interface ForecastGraph {
  readonly nodes: ForecastNodeDto[];
  readonly edges: ForecastEdgeDto[];
}

/** A calculation plus what the debug endpoints need to explain it. */
export interface CalculationRun<Stored extends boolean = true> {
  /** id is null when the run was not stored. */
  readonly result: Omit<UnifiedCalculationResultDto, 'id'> & { readonly id: Stored extends true ? string : null };
  readonly graph: ForecastGraph;
  readonly engine: EngineRunOutput;
  readonly timings: { readonly loadMs: number; readonly calculateMs: number; readonly storeMs: number };
}

/**
 * Loads a forecast's graph, periods and variables, runs the forecast engine
 * (ForecastEngineService) and stores the result.
 */
@Injectable()
export class ForecastCalculationService {
  private readonly logger = new Logger(ForecastCalculationService.name);

  constructor(
    private readonly supabaseService: SupabaseOptimizedService,
    private readonly dataIntakeService: DataIntakeService,
    private readonly forecastService: ForecastService,
    private readonly forecastNodeService: ForecastNodeService,
    private readonly forecastEdgeService: ForecastEdgeService,
    private readonly forecastEngine: ForecastEngineService
  ) {}

  /**
   * Calculate all requested value types (historical, forecast, budget) using the periods
   * from the forecast's metadata, and store the result.
   */
  async calculateForecastWithPeriods(
    forecastId: string,
    userId: string,
    request: Request,
    calculationRequest: UnifiedCalculationRequestDto
  ): Promise<UnifiedCalculationResultDto> {
    return (await this.runCalculation(forecastId, userId, request, calculationRequest, { store: true })).result;
  }

  /**
   * Same as {@link calculateForecastWithPeriods}, also returning the graph, warnings and
   * (optionally) the trace. With store: false nothing is saved, so the latest stored
   * result stays what the user last calculated (used by debug runs).
   */
  async runCalculation<Stored extends boolean>(
    forecastId: string,
    userId: string,
    request: Request,
    calculationRequest: UnifiedCalculationRequestDto,
    options: { store: Stored; trace?: boolean }
  ): Promise<CalculationRun<Stored>> {
    const started = Date.now();
    const forecast = await this.forecastService.findOne(forecastId, userId, request);
    if (!forecast) {
      throw new NotFoundException(`Forecast ${forecastId} not found`);
    }
    const periodInfo = this.extractPeriodInfoFromForecast(forecast);
    const graph = await this.loadGraphRows(forecastId, request);
    const variablesResponse = await this.dataIntakeService.getVariablesByUser(userId, request);
    const variables = variablesResponse.variables || [];
    const loaded = Date.now();

    const calculationTypes = calculationRequest.calculationTypes.map((type) => type.toLowerCase() as CalcType);
    const engine = this.forecastEngine.run({
      nodes: graph.nodes,
      edges: graph.edges,
      variables,
      periods: periodInfo,
      calculationTypes,
      trace: options.trace,
    });
    const calculated = Date.now();
    if (engine.warnings.length > 0) {
      this.logger.log(`Forecast ${forecastId}: ${engine.warnings.length} warnings (${engine.warnings.map((w) => w.code).join(', ')})`);
    }

    const calculatedAt = new Date();
    const metrics = engine.nodeResults.filter((n) => n.nodeType === 'METRIC');
    const allNodes = calculationRequest.includeIntermediateNodes ? engine.nodeResults : [];
    const warnings = engine.warnings.map(toWarningDto);
    const id = options.store
      ? (
          await this.storeUnifiedCalculationResults(forecastId, forecast.organizationId, request, {
            calculatedAt,
            calculationTypes,
            periodInfo,
            metrics,
            allNodes,
            warnings,
          })
        ).id
      : null;

    const result = {
      id: id as Stored extends true ? string : null,
      forecastId,
      calculatedAt: calculatedAt.toISOString(),
      // Unchanged from the previous engine: the response carries upper-case type names.
      calculationTypes: calculationTypes.map((type) => type.toUpperCase() as CalculationTypeDto),
      periodInfo,
      metrics,
      allNodes,
      warnings,
    };
    return {
      result,
      graph,
      engine,
      timings: { loadMs: loaded - started, calculateMs: calculated - loaded, storeMs: Date.now() - calculated },
    };
  }

  /** The forecast's nodes and edges, after checking the user can read the forecast. */
  async loadGraph(forecastId: string, userId: string, request: Request): Promise<ForecastGraph> {
    const forecast = await this.forecastService.findOne(forecastId, userId, request);
    if (!forecast) {
      throw new NotFoundException(`Forecast ${forecastId} not found`);
    }
    return this.loadGraphRows(forecastId, request);
  }

  private async loadGraphRows(forecastId: string, request: Request): Promise<ForecastGraph> {
    const nodes = await this.forecastNodeService.findByForecast(forecastId, request);
    const edges = await this.forecastEdgeService.findByForecast(forecastId, request);
    return { nodes, edges };
  }

  /**
   * Get calculation history for a forecast
   */
  async getCalculationHistory(
    forecastId: string,
    userId: string,
    request: Request
  ): Promise<ForecastCalculationResultDto[]> {
    try {
      await this.forecastService.findOne(forecastId, userId, request);
      const client = this.supabaseService.getClientForRequest(request);

      const { data, error } = await client
        .from('forecast_calculation_results')
        .select('*')
        .eq('forecast_id', forecastId)
        .order('calculated_at', { ascending: false });

      if (error) {
        this.logger.error(`Database error fetching history:`, error);
        throw new InternalServerErrorException(`Database error: ${error.message}`);
      }

      return data.map((item: any) => this.mapDatabaseResultToDto(item));
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof InternalServerErrorException) {
        throw error;
      }
      this.logger.error(`Failed to fetch calculation history:`, error);
      throw new InternalServerErrorException(
        `Failed to fetch calculation history: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private mapDatabaseResultToDto(data: any): ForecastCalculationResultDto {
    const results = data.results || {};
    return {
      id: data.id,
      forecastId: data.forecast_id,
      calculatedAt: data.calculated_at,
      metrics: results.metrics || results || [], // Handle both old and new format
      allNodes: results.allNodes || undefined,
    };
  }

  /**
   * Periods from the forecast's metadata, with defaults for the actual window
   * (6 months before the forecast start to 1 month before).
   */
  private extractPeriodInfoFromForecast(forecast: any): PeriodInfoDto {
    const forecastStartMonth = forecast.forecastStartMonth || formatMonth(monthIndexFromDateString(forecast.forecastStartDate));
    const forecastEndMonth = forecast.forecastEndMonth || formatMonth(monthIndexFromDateString(forecast.forecastEndDate));
    const forecastStart = parseMonth(forecastStartMonth);
    let actualStart = forecast.actualStartMonth ? parseMonth(forecast.actualStartMonth) : forecastStart - 6;
    let actualEnd = forecast.actualEndMonth ? parseMonth(forecast.actualEndMonth) : forecastStart - 1;

    // The UI can store an actual window that overlaps the forecast window (e.g. "actuals
    // through last month" while the forecast starts this year). End actuals before the forecast.
    const forecastEnd = parseMonth(forecastEndMonth);
    if (actualEnd >= forecastStart && actualStart <= forecastEnd) {
      const adjustedEnd = Math.min(actualEnd, forecastStart - 1);
      const adjustedStart = actualStart > adjustedEnd ? adjustedEnd - 5 : actualStart;
      this.logger.warn(
        `Adjusted overlapping actual period ${formatMonth(actualStart)}–${formatMonth(actualEnd)} → ` +
          `${formatMonth(adjustedStart)}–${formatMonth(adjustedEnd)} (forecast ${forecastStartMonth}–${forecastEndMonth})`
      );
      actualStart = adjustedStart;
      actualEnd = adjustedEnd;
    }

    return {
      forecastStartMonth,
      forecastEndMonth,
      actualStartMonth: formatMonth(actualStart),
      actualEndMonth: formatMonth(actualEnd),
    };
  }

  private async storeUnifiedCalculationResults(
    forecastId: string,
    organizationId: string,
    request: Request,
    results: {
      calculatedAt: Date;
      calculationTypes: CalcType[];
      periodInfo: PeriodInfoDto;
      metrics: UnifiedNodeResultDto[];
      allNodes: UnifiedNodeResultDto[];
      warnings: CalculationWarningDto[];
    }
  ): Promise<UnifiedCalculationResultDto> {
    const client = this.supabaseService.getClientForRequest(request);
    const { data, error } = await client
      .from('forecast_calculation_results')
      .insert({
        forecast_id: forecastId,
        organization_id: organizationId,
        calculated_at: results.calculatedAt.toISOString(),
        results: {
          metrics: results.metrics,
          allNodes: results.allNodes,
          periodInfo: results.periodInfo,
          calculationTypes: results.calculationTypes,
          warnings: results.warnings,
        },
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to store calculation results:`, error);
      throw new InternalServerErrorException(`Failed to store unified calculation results: ${error.message}`);
    }
    return this.mapUnifiedDatabaseResultToDto(data);
  }

  private mapUnifiedDatabaseResultToDto(dbResult: any): UnifiedCalculationResultDto {
    const results = dbResult.results;
    return {
      id: dbResult.id,
      forecastId: dbResult.forecast_id,
      calculatedAt: dbResult.calculated_at,
      calculationTypes: results.calculationTypes || ['forecast'],
      periodInfo: results.periodInfo || {
        forecastStartMonth: '01-2023',
        forecastEndMonth: '12-2023',
        actualStartMonth: '07-2022',
        actualEndMonth: '12-2022',
      },
      metrics: results.metrics || [],
      allNodes: results.allNodes || undefined,
      warnings: results.warnings || [],
    };
  }

  /**
   * Get latest unified calculation results for a forecast
   */
  async getLatestUnifiedCalculationResults(
    forecastId: string,
    userId: string,
    request: Request
  ): Promise<UnifiedCalculationResultDto | null> {
    const forecast = await this.forecastService.findOne(forecastId, userId, request);
    if (!forecast) {
      throw new NotFoundException(`Forecast ${forecastId} not found`);
    }

    const client = this.supabaseService.getClientForRequest(request);
    const { data, error } = await client
      .from('forecast_calculation_results')
      .select()
      .eq('forecast_id', forecastId)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to fetch unified calculation results:`, error);
      throw new InternalServerErrorException(`Failed to fetch unified calculation results: ${error.message}`);
    }
    if (!data) {
      return null;
    }

    const results = data.results;
    if (results && results.calculationTypes && results.periodInfo) {
      return this.mapUnifiedDatabaseResultToDto(data);
    }
    return this.convertLegacyToUnifiedDto(data, forecast);
  }

  /** Results stored by the pre-unified engine (dates instead of MM-YYYY). */
  private convertLegacyToUnifiedDto(dbResult: any, forecast: any): UnifiedCalculationResultDto {
    const results = dbResult.results;
    const toMonth = (date: string) => formatMonth(monthIndexFromDateString(date));

    const metrics: UnifiedNodeResultDto[] = (results.metrics || []).map((metric: any) => ({
      nodeId: metric.metricNodeId,
      nodeType: 'METRIC',
      values: (metric.values || []).map((value: any) => ({
        month: toMonth(value.date),
        historical: value.historical,
        forecast: value.forecast,
        budget: value.budget,
        calculated: null,
      })),
    }));

    const allNodes: UnifiedNodeResultDto[] | undefined = results.allNodes?.map((node: any) => ({
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      values: (node.values || []).map((value: any) => ({
        month: toMonth(value.date),
        historical: value.historical,
        forecast: value.forecast,
        budget: value.budget,
        calculated: value.calculated,
      })),
    }));

    return {
      id: dbResult.id,
      forecastId: dbResult.forecast_id,
      calculatedAt: dbResult.calculated_at,
      calculationTypes: [CalculationTypeDto.FORECAST], // Legacy results were forecast-only
      periodInfo: this.extractPeriodInfoFromForecast(forecast),
      metrics,
      allNodes,
      warnings: [],
    };
  }
}

function toWarningDto(issue: Issue): CalculationWarningDto {
  return { code: issue.code, message: issue.message, nodeIds: [...issue.nodeIds] };
}
