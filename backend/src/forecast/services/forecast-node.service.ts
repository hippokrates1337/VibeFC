import { Injectable, NotFoundException, ConflictException, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { CreateForecastNodeDto, UpdateForecastNodeDto, ForecastNodeDto, ForecastNodeKind } from '../dto/forecast-node.dto';

@Injectable()
export class ForecastNodeService {
  private readonly logger = new Logger(ForecastNodeService.name);

  constructor(
    private supabaseService: SupabaseService,
  ) {}

  async create(dto: CreateForecastNodeDto): Promise<ForecastNodeDto> {
    try {
      const { data: insertedNode, error: insertError } = await this.supabaseService.client
        .from('forecast_nodes')
        .insert({
          forecast_id: dto.forecastId,
          kind: dto.kind,
          attributes: dto.attributes,
          position: dto.position,
        })
        .select('*')
        .single();

      if (insertError) {
        this.logger.error(`Failed to insert forecast node: ${insertError.message}`, insertError.stack);
        throw new InternalServerErrorException(`Failed to create forecast node: ${insertError.message}`);
      }

      if (!insertedNode) {
        this.logger.error('Forecast node insert succeeded but no data returned.');
        throw new InternalServerErrorException('Failed to create forecast node, data missing after insert.');
      }

      const createdNode = this.mapDbEntityToDto(insertedNode);
      this.logger.log(`Forecast node created: ${createdNode.id} for forecast ${dto.forecastId}`);

      return createdNode;
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      this.logger.error(`Unexpected error during forecast node creation: ${error.message}`, error.stack);
      throw new InternalServerErrorException('An unexpected error occurred while creating the forecast node.');
    }
  }

  async findByForecast(forecastId: string): Promise<ForecastNodeDto[]> {
    const { data, error } = await this.supabaseService.client
      .from('forecast_nodes')
      .select('*')
      .eq('forecast_id', forecastId);

    if (error) {
      this.logger.error(`Failed to fetch forecast nodes: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to fetch forecast nodes: ${error.message}`);
    }

    return data.map(node => this.mapDbEntityToDto(node));
  }

  async findOne(id: string, forecastId?: string): Promise<ForecastNodeDto> {
    let query = this.supabaseService.client
      .from('forecast_nodes')
      .select('*')
      .eq('id', id);

    if (forecastId) {
      query = query.eq('forecast_id', forecastId);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('not found')) {
        const message = forecastId 
          ? `Forecast node with ID ${id} not found in forecast ${forecastId}.`
          : `Forecast node with ID ${id} not found.`;
        this.logger.warn(message);
        throw new NotFoundException(message);
      }
      
      this.logger.error(`Error fetching forecast node ${id}${forecastId ? ' for forecast ' + forecastId : ''}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to retrieve forecast node details: ${error.message}`);
    }
    
    if (!data) {
      // This case should ideally be covered by error.code === 'PGRST116' when .single() is used
      const message = forecastId 
        ? `Forecast node with ID ${id} not found in forecast ${forecastId} (no data).`
        : `Forecast node with ID ${id} not found (no data).`;
      this.logger.warn(message);
      throw new NotFoundException(message);
    }

    return this.mapDbEntityToDto(data);
  }

  async update(id: string, dto: UpdateForecastNodeDto): Promise<void> {
    // Check if there's anything to update before proceeding
    if (Object.keys(dto).length === 0) {
      return; // Nothing to update
    }
    
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

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    if (Object.keys(updateData).length === 1 && updateData.updated_at) {
      // Only the timestamp was added, nothing else to update
      return;
    }

    const { data, error } = await this.supabaseService.client
      .from('forecast_nodes')
      .update(updateData)
      .eq('id', id)
      .select('id')
      .single();

    if (error) {
      // PGRST116 occurs when .single() is used and no row (or multiple rows) are returned.
      if (error.code === 'PGRST116') {
        this.logger.warn(`Attempted to update non-existent forecast node ${id} (PGRST116).`);
        throw new NotFoundException(`Forecast node with ID ${id} not found.`);
      }
      this.logger.error(`Failed to update forecast node ${id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to update forecast node ${id}: ${error.message}`);
    }

    // The .single() call would have thrown an error if no data was returned, 
    // so this !data check is theoretically not strictly needed here if PGRST116 is handled.
    // However, keeping it as a fallback or for clarity if .select() was different.
    if (!data) {
      this.logger.warn(`Attempted to update non-existent forecast node: ${id} (no data returned post-update).`);
      throw new NotFoundException(`Forecast node with ID ${id} not found.`);
    }

    this.logger.log(`Forecast node updated: ${id}`);
  }

  async remove(id: string): Promise<void> {
    this.logger.debug(`Attempting to remove forecast node with id: ${id}`);

    // Step 1: Verify the node exists before attempting to delete.
    // findOne will throw NotFoundException if it doesn't exist.
    // We don't need to pass forecastId here as deletion is by node ID only, 
    // but RLS on the forecast_nodes table should prevent unauthorized deletion.
    // However, the controller should verify forecast ownership before calling this.
    await this.findOne(id); // This will now correctly use the single-argument version if called by other parts of this service

    // Step 2: If findOne succeeded, the node exists, so proceed with deletion.
    const { error } = await this.supabaseService.client
      .from('forecast_nodes')
      .delete()
      .eq('id', id);

    if (error) {
      // This error would be for the delete operation itself, not for non-existence.
      this.logger.error(`Failed to delete forecast node ${id} during Supabase operation: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to delete forecast node ${id}: ${error.message}`);
    }

    // If no error, deletion is considered successful.
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