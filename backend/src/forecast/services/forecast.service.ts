import { Injectable, NotFoundException, InternalServerErrorException, Logger, ForbiddenException } from '@nestjs/common';
import { SupabaseOptimizedService } from '../../supabase/supabase-optimized.service';
import { CreateForecastDto, UpdateForecastDto, ForecastDto, UpdateForecastPeriodsDto } from '../dto/forecast.dto';
import { BulkSaveGraphDto, FlattenedForecastWithDetailsDto } from '../dto/bulk-save-graph.dto';
import { PerformanceService } from '../../common/services/performance.service';
import { toHttpException, type DatabaseError } from '../../common/errors/database-error';
import { assertDateOrder, assertValidPeriods, defaultActualWindow, isoDateToMonth, storedPeriods } from './forecast-periods';
import { Request } from 'express';

@Injectable()
export class ForecastService {
  private readonly logger = new Logger(ForecastService.name);

  constructor(
    private supabaseService: SupabaseOptimizedService, // Direct injection
    private performanceService: PerformanceService,
  ) {}

  private dbError(error: DatabaseError, action: string) {
    return toHttpException(error, { action, subject: 'Forecast', logger: this.logger });
  }

  async create(userId: string, dto: CreateForecastDto, request: Request): Promise<ForecastDto> {
    if (!userId) {
      throw new InternalServerErrorException('User ID is missing, cannot create forecast.');
    }

    assertDateOrder(dto.forecastStartDate, dto.forecastEndDate);
    // Forecast months always follow the dates; actual months default to the 6 months before
    const forecastStartMonth = isoDateToMonth(dto.forecastStartDate, 'forecastStartDate');
    const forecastEndMonth = isoDateToMonth(dto.forecastEndDate, 'forecastEndDate');
    const defaults = defaultActualWindow(forecastStartMonth);
    const periods = {
      forecastStartMonth,
      forecastEndMonth,
      actualStartMonth: dto.actualStartMonth || defaults.actualStartMonth,
      actualEndMonth: dto.actualEndMonth || defaults.actualEndMonth,
    };
    assertValidPeriods(periods);

    const client = this.supabaseService.getClientForRequest(request);
    const { data: insertedForecast, error } = await client
      .from('forecasts')
      .insert({
        name: dto.name,
        forecast_start_date: dto.forecastStartDate,
        forecast_end_date: dto.forecastEndDate,
        organization_id: dto.organizationId,
        user_id: userId,
        forecast_start_month: periods.forecastStartMonth,
        forecast_end_month: periods.forecastEndMonth,
        actual_start_month: periods.actualStartMonth,
        actual_end_month: periods.actualEndMonth,
      })
      .select('*')
      .single();

    if (error) {
      throw this.dbError(error, 'create a forecast in this organization');
    }
    if (!insertedForecast) {
      throw new InternalServerErrorException('Failed to create the forecast');
    }

    const createdForecast = this.mapDbEntityToDto(insertedForecast);
    this.logger.log(`Forecast created: ${createdForecast.id} by user ${userId}`);
    return createdForecast;
  }

  async findAll(userId: string, organizationId: string, request: Request): Promise<ForecastDto[]> {
    if (!userId) {
      return [];
    }

    // List by organization only. Row-level security already limits rows to organizations
    // the JWT may access; do not additionally filter by creator (user_id), or members
    // miss forecasts created by teammates.
    const client = this.supabaseService.getClientForRequest(request);
    const { data, error } = await client
      .from('forecasts')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) {
      throw this.dbError(error, 'load the forecasts');
    }
    return data.map((forecast) => this.mapDbEntityToDto(forecast));
  }

  /** The forecast if the caller may read it; 404 otherwise (also for forecasts of other organizations). */
  async findOne(id: string, userId: string, request: Request): Promise<ForecastDto> {
    if (!userId) {
      throw new NotFoundException('Forecast not found');
    }

    const client = this.supabaseService.getClientForRequest(request);
    const { data, error } = await client.from('forecasts').select('*').eq('id', id).maybeSingle();

    if (error) {
      throw this.dbError(error, 'load the forecast');
    }
    if (!data) {
      throw new NotFoundException('Forecast not found');
    }
    return this.mapDbEntityToDto(data);
  }

  async update(id: string, userId: string, dto: UpdateForecastDto, request: Request): Promise<void> {
    const forecast = await this.findOne(id, userId, request);
    const updateData: Record<string, any> = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }
    if (dto.forecastStartDate !== undefined) {
      updateData.forecast_start_date = dto.forecastStartDate;
    }
    if (dto.forecastEndDate !== undefined) {
      updateData.forecast_end_date = dto.forecastEndDate;
    }

    const datesChanged = dto.forecastStartDate !== undefined || dto.forecastEndDate !== undefined;
    const startDate = dto.forecastStartDate ?? forecast.forecastStartDate;
    const endDate = dto.forecastEndDate ?? forecast.forecastEndDate;
    if (datesChanged) {
      assertDateOrder(startDate, endDate);
    }
    // Forecast months follow the dates whenever the dates change
    const stored = storedPeriods(forecast);
    const periods = {
      forecastStartMonth: datesChanged
        ? isoDateToMonth(startDate, 'forecastStartDate')
        : (dto.forecastStartMonth ?? stored.forecastStartMonth),
      forecastEndMonth: datesChanged
        ? isoDateToMonth(endDate, 'forecastEndDate')
        : (dto.forecastEndMonth ?? stored.forecastEndMonth),
      actualStartMonth: dto.actualStartMonth ?? stored.actualStartMonth,
      actualEndMonth: dto.actualEndMonth ?? stored.actualEndMonth,
    };
    const periodsChanged =
      datesChanged ||
      [dto.forecastStartMonth, dto.forecastEndMonth, dto.actualStartMonth, dto.actualEndMonth].some((v) => v !== undefined);
    if (periodsChanged) {
      assertValidPeriods(periods);
      updateData.forecast_start_month = periods.forecastStartMonth;
      updateData.forecast_end_month = periods.forecastEndMonth;
      updateData.actual_start_month = periods.actualStartMonth;
      updateData.actual_end_month = periods.actualEndMonth;
    }

    if (Object.keys(updateData).length === 0) {
      return;
    }
    updateData.updated_at = new Date().toISOString();
    await this.writeForecast(id, updateData, request, 'change this forecast');
    this.logger.log(`Forecast updated: ${id} by user: ${userId}`);
  }

  /** Update only the MM-YYYY period fields; the result must still be a valid set of periods. */
  async updatePeriods(id: string, userId: string, dto: UpdateForecastPeriodsDto, request: Request): Promise<void> {
    const forecast = await this.findOne(id, userId, request);
    if (Object.values(dto).every((value) => value === undefined)) {
      return;
    }

    const stored = storedPeriods(forecast);
    const periods = {
      forecastStartMonth: dto.forecastStartMonth ?? stored.forecastStartMonth,
      forecastEndMonth: dto.forecastEndMonth ?? stored.forecastEndMonth,
      actualStartMonth: dto.actualStartMonth ?? stored.actualStartMonth,
      actualEndMonth: dto.actualEndMonth ?? stored.actualEndMonth,
    };
    assertValidPeriods(periods);

    await this.writeForecast(
      id,
      {
        forecast_start_month: periods.forecastStartMonth,
        forecast_end_month: periods.forecastEndMonth,
        actual_start_month: periods.actualStartMonth,
        actual_end_month: periods.actualEndMonth,
        updated_at: new Date().toISOString(),
      },
      request,
      "change this forecast's periods"
    );
    this.logger.log(`Forecast periods updated: ${id} by user: ${userId}`);
  }

  async remove(id: string, userId: string, request: Request): Promise<void> {
    await this.findOne(id, userId, request);

    const client = this.supabaseService.getClientForRequest(request);
    const { error, count } = await client.from('forecasts').delete({ count: 'exact' }).eq('id', id);

    if (error) {
      throw this.dbError(error, 'delete this forecast');
    }
    // The caller can read the forecast (findOne), so no deleted row means no permission
    if (count === 0) {
      throw new ForbiddenException('You do not have permission to delete this forecast');
    }
    this.logger.log(`Forecast deleted: ${id} by user: ${userId}`);
  }

  async bulkSaveGraph(
    forecastId: string,
    userId: string,
    dto: BulkSaveGraphDto,
    request: Request
  ): Promise<FlattenedForecastWithDetailsDto> {
    return this.performanceService.trackOperation(
      'forecast.bulkSaveGraph',
      async () => {
        const forecast = await this.findOne(forecastId, userId, request);

        // The function writes the dates and actual months as sent; check the result first
        const startDate = dto.forecast.forecastStartDate || forecast.forecastStartDate;
        const endDate = dto.forecast.forecastEndDate || forecast.forecastEndDate;
        assertDateOrder(startDate, endDate);
        assertValidPeriods({
          forecastStartMonth: isoDateToMonth(startDate, 'forecastStartDate'),
          forecastEndMonth: isoDateToMonth(endDate, 'forecastEndDate'),
          actualStartMonth: dto.forecast.actualStartMonth || storedPeriods(forecast).actualStartMonth,
          actualEndMonth: dto.forecast.actualEndMonth || storedPeriods(forecast).actualEndMonth,
        });

        this.logger.log(`Bulk save for forecast ${forecastId}: ${dto.nodes.length} nodes, ${dto.edges.length} edges`);
        const client = this.supabaseService.getClientForRequest(request);
        const { data, error } = await client.rpc('bulk_save_forecast_graph', {
          p_forecast_id: forecastId,
          p_forecast_data: dto.forecast,
          p_nodes_data: dto.nodes,
          p_edges_data: dto.edges,
        });

        if (error) {
          throw this.dbError(error, 'save this forecast');
        }
        if (!data) {
          throw new InternalServerErrorException('Failed to save the forecast');
        }
        return data as FlattenedForecastWithDetailsDto;
      },
      {
        forecastId,
        userId,
        nodeCount: dto.nodes.length,
        edgeCount: dto.edges.length,
      }
    );
  }

  /**
   * Updates one forecast row. The caller has read it already (findOne), so a row the
   * update does not reach was filtered by row-level security: no permission.
   */
  private async writeForecast(id: string, row: Record<string, unknown>, request: Request, action: string): Promise<void> {
    const client = this.supabaseService.getClientForRequest(request);
    const { data, error } = await client.from('forecasts').update(row).eq('id', id).select('id').maybeSingle();
    if (error) {
      throw this.dbError(error, action);
    }
    if (!data) {
      throw new ForbiddenException(`You do not have permission to ${action}`);
    }
  }

  private mapDbEntityToDto(entity: any): ForecastDto {
    return {
      id: entity.id,
      name: entity.name,
      forecastStartDate: entity.forecast_start_date,
      forecastEndDate: entity.forecast_end_date,
      organizationId: entity.organization_id,
      userId: entity.user_id,
      createdAt: new Date(entity.created_at),
      updatedAt: new Date(entity.updated_at),
      forecastStartMonth: entity.forecast_start_month,
      forecastEndMonth: entity.forecast_end_month,
      actualStartMonth: entity.actual_start_month,
      actualEndMonth: entity.actual_end_month,
    };
  }

  /**
   * Forecast list with graph summary fields expected by the Next.js client.
   * Node/edge counts are placeholders (0 / empty) until a dedicated aggregation exists.
   */
  async findSummariesByOrganization(
    userId: string,
    organizationId: string,
    request: Request,
  ): Promise<Array<ForecastDto & { nodeCount: number; edgeCount: number; nodeTypes: string[] }>> {
    const list = await this.findAll(userId, organizationId, request);
    return list.map((f) => ({
      ...f,
      nodeCount: 0,
      edgeCount: 0,
      nodeTypes: [] as string[],
    }));
  }
}
