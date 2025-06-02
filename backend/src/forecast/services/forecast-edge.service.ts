import { Injectable, NotFoundException, ConflictException, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { CreateForecastEdgeDto, ForecastEdgeDto } from '../dto/forecast-edge.dto';
import { ForecastNodeService } from './forecast-node.service';

@Injectable()
export class ForecastEdgeService {
  private readonly logger = new Logger(ForecastEdgeService.name);

  constructor(
    private supabaseService: SupabaseService,
    private readonly nodeService: ForecastNodeService,
  ) {}

  async create(dto: CreateForecastEdgeDto): Promise<ForecastEdgeDto> {
    try {
      await this.nodeService.findOne(dto.sourceNodeId, dto.forecastId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.logger.warn(`Source node ${dto.sourceNodeId} not found for forecast ${dto.forecastId} during edge creation.`);
        throw new NotFoundException(`Source node with ID ${dto.sourceNodeId} not found in forecast ${dto.forecastId}.`);
      }
      this.logger.error(`Error verifying source node ${dto.sourceNodeId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error verifying source node existence.');
    }

    try {
      await this.nodeService.findOne(dto.targetNodeId, dto.forecastId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.logger.warn(`Target node ${dto.targetNodeId} not found for forecast ${dto.forecastId} during edge creation.`);
        throw new NotFoundException(`Target node with ID ${dto.targetNodeId} not found in forecast ${dto.forecastId}.`);
      }
      this.logger.error(`Error verifying target node ${dto.targetNodeId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error verifying target node existence.');
    }
    
    try {
      const { data: insertedEdge, error: insertError } = await this.supabaseService.client
        .from('forecast_edges')
        .insert({
          forecast_id: dto.forecastId,
          source_node_id: dto.sourceNodeId,
          target_node_id: dto.targetNodeId,
        })
        .select('*')
        .single();

      if (insertError) {
        this.logger.error(`Failed to insert forecast edge: ${insertError.message}`, insertError.stack);
        if (insertError.code === '23503') {
          this.logger.warn(`Foreign key violation during edge creation for forecast ${dto.forecastId}. Nodes: ${dto.sourceNodeId}, ${dto.targetNodeId}`);
          throw new NotFoundException('One or both nodes do not exist or do not belong to the specified forecast.');
        }
        throw new InternalServerErrorException(`Failed to create forecast edge: ${insertError.message}`);
      }

      if (!insertedEdge) {
        this.logger.error('Forecast edge insert succeeded but no data returned.');
        throw new InternalServerErrorException('Failed to create forecast edge, data missing after insert.');
      }

      const createdEdge = this.mapDbEntityToDto(insertedEdge);
      this.logger.log(`Forecast edge created: ${createdEdge.id} for forecast ${dto.forecastId}`);

      return createdEdge;
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      this.logger.error(`Unexpected error during forecast edge creation: ${error.message}`, error.stack);
      throw new InternalServerErrorException('An unexpected error occurred while creating the forecast edge.');
    }
  }

  async findByForecast(forecastId: string): Promise<ForecastEdgeDto[]> {
    const { data, error } = await this.supabaseService.client
      .from('forecast_edges')
      .select('*')
      .eq('forecast_id', forecastId);

    if (error) {
      this.logger.error(`Failed to fetch forecast edges: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to fetch forecast edges: ${error.message}`);
    }

    return data.map(edge => this.mapDbEntityToDto(edge));
  }

  async findOne(id: string): Promise<ForecastEdgeDto> {
    const { data, error } = await this.supabaseService.client
      .from('forecast_edges')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('not found')) {
        this.logger.warn(`Forecast edge ${id} not found.`);
        throw new NotFoundException(`Forecast edge with ID ${id} not found.`);
      }
      
      this.logger.error(`Error fetching forecast edge ${id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to retrieve forecast edge details: ${error.message}`);
    }
    
    if (!data) {
      this.logger.warn(`Forecast edge ${id} not found.`);
      throw new NotFoundException(`Forecast edge with ID ${id} not found.`);
    }

    return this.mapDbEntityToDto(data);
  }

  async remove(id: string): Promise<void> {
    const { count, error } = await this.supabaseService.client
      .from('forecast_edges')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Failed to delete forecast edge ${id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to delete forecast edge ${id}: ${error.message}`);
    }
    
    if (count === 0) {
      this.logger.warn(`Attempted to delete non-existent forecast edge: ${id}`);
      throw new NotFoundException(`Forecast edge with ID ${id} not found.`);
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