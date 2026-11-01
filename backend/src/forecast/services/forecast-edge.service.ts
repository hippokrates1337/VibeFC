import { Injectable, NotFoundException, InternalServerErrorException, Logger, ForbiddenException } from '@nestjs/common';
import { SupabaseOptimizedService } from '../../supabase/supabase-optimized.service';
import { CreateForecastEdgeDto, ForecastEdgeDto } from '../dto/forecast-edge.dto';
import { ForecastNodeService } from './forecast-node.service';
import { toHttpException, type DatabaseError } from '../../common/errors/database-error';
import { Request } from 'express';

/**
 * Edges of a forecast. Single-edge calls take the forecast id, and an edge can only
 * connect two nodes of its own forecast (the database does not check that).
 */
@Injectable()
export class ForecastEdgeService {
  private readonly logger = new Logger(ForecastEdgeService.name);

  constructor(
    private supabaseService: SupabaseOptimizedService,
    private readonly nodeService: ForecastNodeService,
  ) {}

  private dbError(error: DatabaseError, action: string) {
    return toHttpException(error, { action, subject: 'Forecast edge', logger: this.logger });
  }

  async create(dto: CreateForecastEdgeDto & { forecastId: string }, request: Request): Promise<ForecastEdgeDto> {
    await this.nodeService.findOne(dto.forecastId, dto.sourceNodeId, request).catch((error) => {
      throw error instanceof NotFoundException ? new NotFoundException('Source node not found in this forecast') : error;
    });
    await this.nodeService.findOne(dto.forecastId, dto.targetNodeId, request).catch((error) => {
      throw error instanceof NotFoundException ? new NotFoundException('Target node not found in this forecast') : error;
    });

    const client = this.supabaseService.getClientForRequest(request);
    const { data: insertedEdge, error } = await client
      .from('forecast_edges')
      .insert({
        forecast_id: dto.forecastId,
        source_node_id: dto.sourceNodeId,
        target_node_id: dto.targetNodeId,
      })
      .select('*')
      .single();

    if (error) {
      throw this.dbError(error, 'add edges to this forecast');
    }
    if (!insertedEdge) {
      throw new InternalServerErrorException('Failed to create the forecast edge');
    }

    const createdEdge = this.mapDbEntityToDto(insertedEdge);
    this.logger.log(`Forecast edge created: ${createdEdge.id} for forecast ${dto.forecastId}`);
    return createdEdge;
  }

  async findByForecast(forecastId: string, request: Request): Promise<ForecastEdgeDto[]> {
    const client = this.supabaseService.getClientForRequest(request);
    const { data, error } = await client
      .from('forecast_edges')
      .select('*')
      .eq('forecast_id', forecastId);

    if (error) {
      throw this.dbError(error, 'load the forecast edges');
    }
    return data.map(edge => this.mapDbEntityToDto(edge));
  }

  /** The edge if it belongs to the forecast; 404 otherwise. */
  async findOne(forecastId: string, id: string, request: Request): Promise<ForecastEdgeDto> {
    const client = this.supabaseService.getClientForRequest(request);
    const { data, error } = await client
      .from('forecast_edges')
      .select('*')
      .eq('id', id)
      .eq('forecast_id', forecastId)
      .maybeSingle();

    if (error) {
      throw this.dbError(error, 'load the forecast edge');
    }
    if (!data) {
      throw new NotFoundException('Forecast edge not found in this forecast');
    }
    return this.mapDbEntityToDto(data);
  }

  async remove(forecastId: string, id: string, request: Request): Promise<void> {
    await this.findOne(forecastId, id, request);

    const client = this.supabaseService.getClientForRequest(request);
    const { count, error } = await client
      .from('forecast_edges')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('forecast_id', forecastId);

    if (error) {
      throw this.dbError(error, 'delete this forecast edge');
    }
    // Readable (findOne) but not deleted: filtered by row-level security
    if (count === 0) {
      throw new ForbiddenException('You do not have permission to delete this forecast edge');
    }
    this.logger.log(`Forecast edge deleted: ${id}`);
  }

  private mapDbEntityToDto(entity: any): ForecastEdgeDto {
    return {
      id: entity.id,
      forecastId: entity.forecast_id,
      sourceNodeId: entity.source_node_id,
      targetNodeId: entity.target_node_id,
      createdAt: new Date(entity.created_at),
    };
  }
}
