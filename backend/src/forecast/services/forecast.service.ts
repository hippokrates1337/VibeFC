import { Injectable, NotFoundException, ConflictException, InternalServerErrorException, Logger, ForbiddenException } from '@nestjs/common';
import { SupabaseOptimizedService } from '../../supabase/supabase-optimized.service';
import { CreateForecastDto, UpdateForecastDto, ForecastDto } from '../dto/forecast.dto';
import { BulkSaveGraphDto, FlattenedForecastWithDetailsDto } from '../dto/bulk-save-graph.dto';
import { PerformanceService } from '../../common/services/performance.service';
import { Request } from 'express';

@Injectable()
export class ForecastService {
  private readonly logger = new Logger(ForecastService.name);

  constructor(
    private supabaseService: SupabaseOptimizedService, // Direct injection
    private performanceService: PerformanceService,
  ) {}

  async create(userId: string, dto: CreateForecastDto, request: Request): Promise<ForecastDto> {
    this.logger.debug(`ForecastService.create called by userId: ${userId}`);
    this.logger.debug(`CreateForecastDto: ${JSON.stringify(dto)}`);

    if (!userId) {
      this.logger.error('ForecastService.create called with undefined or null userId.');
      throw new InternalServerErrorException('User ID is missing, cannot create forecast.');
    }

    try {
      this.logger.debug('Attempting to insert forecast into Supabase...');
      const client = this.supabaseService.getClientForRequest(request);
      const { data: insertedForecast, error: insertError } = await client
        .from('forecasts')
        .insert({
          name: dto.name,
          forecast_start_date: dto.forecastStartDate,
          forecast_end_date: dto.forecastEndDate,
          organization_id: dto.organizationId,
          user_id: userId,
        })
        .select('*')
        .single();

      if (insertError) {
        this.logger.error(`Supabase insert error for forecast: ${insertError.message}`, insertError.stack);
        this.logger.error(`Insert error details: ${JSON.stringify(insertError)}`);
        
        // Handle RLS violation specifically
        if (insertError.code === '23514' || // Standard PostgreSQL check_violation
            insertError.message.toLowerCase().includes('violates row-level security policy') || 
            insertError.message.toLowerCase().includes('permission denied for table forecasts')) {
          this.logger.warn(`RLS violation or permission denied for user ${userId} creating forecast in org ${dto.organizationId}: ${insertError.message}`);
          throw new ForbiddenException('You do not have permission to create a forecast in this organization, or the organization does not exist for you.');
        }
        // Handle other potential DB errors (like not-null constraint if userId was indeed null despite earlier check)
        if (insertError.message.toLowerCase().includes('null value in column') && insertError.message.toLowerCase().includes('user_id')) {
            this.logger.error('Database rejected insert due to null user_id. This indicates userId became null before DB operation.');
            throw new InternalServerErrorException('User identification failed before forecast creation.');
        }

        throw new InternalServerErrorException(`Failed to create forecast due to database error: ${insertError.message}`);
      }

      if (!insertedForecast) {
        this.logger.error('Forecast insert attempt returned no data and no error. This is unexpected.');
        throw new InternalServerErrorException('Failed to create forecast, data missing after insert and no explicit error from database.');
      }

      this.logger.debug(`Supabase insert successful. Raw inserted data: ${JSON.stringify(insertedForecast)}`);
      const createdForecast = this.mapDbEntityToDto(insertedForecast);
      this.logger.log(`Forecast created successfully via service: ${createdForecast.id} by user ${userId}`);

      return createdForecast;
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof InternalServerErrorException || error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Unexpected error caught in ForecastService.create: ${error.message}`, error.stack);
      throw new InternalServerErrorException('An unexpected error occurred in the forecast service during creation.');
    }
  }

  async findAll(userId: string, organizationId: string, request: Request): Promise<ForecastDto[]> {
    if (!userId) {
      this.logger.warn('Attempt to find forecasts without providing a userId');
      return []; // Return empty array for security
    }

    // Build the filter conditions in a separate step
    const client = this.supabaseService.getClientForRequest(request);
    const { data, error } = await client
      .from('forecasts')
      .select('*')
      .eq('organization_id', organizationId)
      .filter('user_id', 'eq', userId); // Use filter syntax instead of chained eq()

    if (error) {
      this.logger.error(`Failed to fetch forecasts: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to fetch forecasts: ${error.message}`);
    }

    return data.map(forecast => this.mapDbEntityToDto(forecast));
  }

  async findOne(id: string, userId: string, request: Request): Promise<ForecastDto> {
    // Log the request for debugging purposes
    this.logger.debug(`Finding forecast ${id} for user ${userId}`);
    
    if (!userId) {
      this.logger.warn(`Attempt to find forecast ${id} without providing a userId`);
      throw new NotFoundException(`Forecast with ID ${id} not found.`);
    }

    // First filter by ID
    const client = this.supabaseService.getClientForRequest(request);
    const { data, error } = await client
      .from('forecasts')
      .select('*')
      .eq('id', id)
      .match({ user_id: userId }) // Using match for additional filtering instead of chained eq()
      .single();

    if (error) {
      // Check specifically for PostgreSQL not found error
      if (error.code === 'PGRST116' || error.message?.includes('not found')) {
        this.logger.warn(`Forecast ${id} not found or does not belong to user ${userId}.`);
        throw new NotFoundException(`Forecast with ID ${id} not found.`);
      }
      
      this.logger.error(`Error fetching forecast ${id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to retrieve forecast details: ${error.message}`);
    }
    
    if (!data) {
      this.logger.warn(`Forecast ${id} not found.`);
      throw new NotFoundException(`Forecast with ID ${id} not found.`);
    }

    // Extra security check is no longer needed since match() already filters by user_id
    return this.mapDbEntityToDto(data);
  }

  async update(id: string, userId: string, dto: UpdateForecastDto, request: Request): Promise<void> {
    // First check if the forecast belongs to this user
    await this.findOne(id, userId, request);
    
    // Check if there's anything to update before proceeding
    if (Object.keys(dto).length === 0) {
      return; // Nothing to update
    }
    
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

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    if (Object.keys(updateData).length === 1 && updateData.updated_at) {
      // Only the timestamp was added, nothing else to update
      return;
    }

    // Use match for combined filtering of id and user_id
    const client = this.supabaseService.getClientForRequest(request);
    const { data, error } = await client
      .from('forecasts')
      .update(updateData)
      .match({ id, user_id: userId }) // Match on both id and user_id instead of chained eq calls
      .select('id')
      .single();

    if (error) {
      this.logger.error(`Failed to update forecast ${id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to update forecast ${id}: ${error.message}`);
    }

    if (!data) {
      this.logger.warn(`Attempted to update non-existent forecast: ${id}`);
      throw new NotFoundException(`Forecast with ID ${id} not found.`);
    }

    this.logger.log(`Forecast updated: ${id} by user: ${userId}`);
  }

  async remove(id: string, userId: string, request: Request): Promise<void> {
    // First verify the forecast exists and belongs to this user
    try {
      await this.findOne(id, userId, request);
    } catch (error) {
      // Re-throw the NotFoundException
      if (error instanceof NotFoundException) {
        throw error;
      }
      // Otherwise handle unexpected errors
      this.logger.error(`Unexpected error checking forecast before delete: ${error.message}`, error.stack);
      throw new InternalServerErrorException('An error occurred while trying to delete the forecast');
    }
    
    // If we get here, the forecast exists and belongs to the user
    // Use match for combined filtering of id and user_id
    const client = this.supabaseService.getClientForRequest(request);
    const { error } = await client
      .from('forecasts')
      .delete()
      .match({ id, user_id: userId }); // Match on both id and user_id instead of chained eq calls

    if (error) {
      this.logger.error(`Error deleting forecast ${id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to delete forecast: ${error.message}`);
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
        // Single ownership check
        await this.findOne(forecastId, userId, request);
        
        try {
          this.logger.log(`Starting bulk save for forecast ${forecastId} with ${dto.nodes.length} nodes and ${dto.edges.length} edges`);
          
          const client = this.supabaseService.getClientForRequest(request);
          const { data, error } = await client
            .rpc('bulk_save_forecast_graph', {
              p_forecast_id: forecastId,
              p_forecast_data: dto.forecast,
              p_nodes_data: dto.nodes,
              p_edges_data: dto.edges
            });

          if (error) {
            this.logger.error(`Bulk save failed for forecast ${forecastId}: ${error.message}`, error.stack);
            throw new InternalServerErrorException(`Failed to save forecast: ${error.message}`);
          }

          if (!data) {
            this.logger.error(`Bulk save returned no data for forecast ${forecastId}`);
            throw new InternalServerErrorException('Failed to save forecast: No data returned');
          }

          this.logger.log(`Forecast ${forecastId} bulk saved successfully`);
          return data as FlattenedForecastWithDetailsDto;
        } catch (error) {
          if (error instanceof InternalServerErrorException || error instanceof NotFoundException) {
            throw error;
          }
          this.logger.error(`Unexpected error in bulk save: ${error.message}`, error.stack);
          throw new InternalServerErrorException('Failed to save forecast graph');
        }
      },
      {
        forecastId,
        userId,
        nodeCount: dto.nodes.length,
        edgeCount: dto.edges.length
      }
    );
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
    };
  }
} 