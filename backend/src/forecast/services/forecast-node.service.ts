import { Injectable, NotFoundException, InternalServerErrorException, Logger, ForbiddenException } from '@nestjs/common';
import { SupabaseOptimizedService } from '../../supabase/supabase-optimized.service';
import { CreateForecastNodeDto, UpdateForecastNodeDto, ForecastNodeDto, ForecastNodeKind } from '../dto/forecast-node.dto';
import { toHttpException, type DatabaseError } from '../../common/errors/database-error';
import { Request } from 'express';

/**
 * Nodes of a forecast. Every single-node call takes the forecast id and only finds nodes
 * of that forecast, so a node cannot be read or changed through another forecast's URL.
 */
@Injectable()
export class ForecastNodeService {
  private readonly logger = new Logger(ForecastNodeService.name);

  constructor(
    private supabaseService: SupabaseOptimizedService,
  ) {}

  private dbError(error: DatabaseError, action: string) {
    return toHttpException(error, { action, subject: 'Forecast node', logger: this.logger });
  }

  async create(dto: CreateForecastNodeDto & { forecastId: string }, request: Request): Promise<ForecastNodeDto> {
    const client = this.supabaseService.getClientForRequest(request);
    const { data: insertedNode, error } = await client
      .from('forecast_nodes')
      .insert({
        forecast_id: dto.forecastId,
        kind: dto.kind,
        attributes: dto.attributes,
        position: dto.position,
      })
      .select('*')
      .single();

    if (error) {
      throw this.dbError(error, 'add nodes to this forecast');
    }
    if (!insertedNode) {
      throw new InternalServerErrorException('Failed to create the forecast node');
    }

    const createdNode = this.mapDbEntityToDto(insertedNode);
    this.logger.log(`Forecast node created: ${createdNode.id} for forecast ${dto.forecastId}`);
    return createdNode;
  }

  async findByForecast(forecastId: string, request: Request): Promise<ForecastNodeDto[]> {
    const client = this.supabaseService.getClientForRequest(request);
    const { data, error } = await client
      .from('forecast_nodes')
      .select('*')
      .eq('forecast_id', forecastId);

    if (error) {
      throw this.dbError(error, 'load the forecast nodes');
    }
    return data.map(node => this.mapDbEntityToDto(node));
  }

  /** The node if it belongs to the forecast; 404 otherwise. */
  async findOne(forecastId: string, id: string, request: Request): Promise<ForecastNodeDto> {
    const client = this.supabaseService.getClientForRequest(request);
    const { data, error } = await client
      .from('forecast_nodes')
      .select('*')
      .eq('id', id)
      .eq('forecast_id', forecastId)
      .maybeSingle();

    if (error) {
      throw this.dbError(error, 'load the forecast node');
    }
    if (!data) {
      throw new NotFoundException('Forecast node not found in this forecast');
    }
    return this.mapDbEntityToDto(data);
  }

  async update(forecastId: string, id: string, dto: UpdateForecastNodeDto, request: Request): Promise<void> {
    await this.findOne(forecastId, id, request);

    const updateData: Record<string, any> = {};
    if (dto.kind !== undefined) {
      updateData.kind = dto.kind;
    }
    if (dto.attributes !== undefined) {
      updateData.attributes = dto.attributes;
    }
    if (dto.position !== undefined) {
      updateData.position = dto.position;
    }
    if (Object.keys(updateData).length === 0) {
      return;
    }
    updateData.updated_at = new Date().toISOString();

    const client = this.supabaseService.getClientForRequest(request);
    const { data, error } = await client
      .from('forecast_nodes')
      .update(updateData)
      .eq('id', id)
      .eq('forecast_id', forecastId)
      .select('id')
      .maybeSingle();

    if (error) {
      throw this.dbError(error, 'change this forecast node');
    }
    // Readable (findOne) but not updated: filtered by row-level security
    if (!data) {
      throw new ForbiddenException('You do not have permission to change this forecast node');
    }
    this.logger.log(`Forecast node updated: ${id}`);
  }

  async remove(forecastId: string, id: string, request: Request): Promise<void> {
    await this.findOne(forecastId, id, request);

    const client = this.supabaseService.getClientForRequest(request);
    const { error, count } = await client
      .from('forecast_nodes')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('forecast_id', forecastId);

    if (error) {
      throw this.dbError(error, 'delete this forecast node');
    }
    if (count === 0) {
      throw new ForbiddenException('You do not have permission to delete this forecast node');
    }
    this.logger.log(`Forecast node deleted: ${id}`);
  }

  private mapDbEntityToDto(entity: any): ForecastNodeDto {
    return {
      id: entity.id,
      forecastId: entity.forecast_id,
      kind: entity.kind as ForecastNodeKind,
      attributes: entity.attributes,
      position: entity.position,
      createdAt: new Date(entity.created_at),
      updatedAt: new Date(entity.updated_at),
    };
  }
}
