"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ForecastService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForecastService = void 0;
const common_1 = require("@nestjs/common");
const supabase_optimized_service_1 = require("../../supabase/supabase-optimized.service");
const performance_service_1 = require("../../common/services/performance.service");
let ForecastService = ForecastService_1 = class ForecastService {
    constructor(supabaseService, performanceService) {
        this.supabaseService = supabaseService;
        this.performanceService = performanceService;
        this.logger = new common_1.Logger(ForecastService_1.name);
    }
    async create(userId, dto, request) {
        this.logger.debug(`ForecastService.create called by userId: ${userId}`);
        this.logger.debug(`CreateForecastDto: ${JSON.stringify(dto)}`);
        if (!userId) {
            this.logger.error('ForecastService.create called with undefined or null userId.');
            throw new common_1.InternalServerErrorException('User ID is missing, cannot create forecast.');
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
                if (insertError.code === '23514' ||
                    insertError.message.toLowerCase().includes('violates row-level security policy') ||
                    insertError.message.toLowerCase().includes('permission denied for table forecasts')) {
                    this.logger.warn(`RLS violation or permission denied for user ${userId} creating forecast in org ${dto.organizationId}: ${insertError.message}`);
                    throw new common_1.ForbiddenException('You do not have permission to create a forecast in this organization, or the organization does not exist for you.');
                }
                if (insertError.message.toLowerCase().includes('null value in column') && insertError.message.toLowerCase().includes('user_id')) {
                    this.logger.error('Database rejected insert due to null user_id. This indicates userId became null before DB operation.');
                    throw new common_1.InternalServerErrorException('User identification failed before forecast creation.');
                }
                throw new common_1.InternalServerErrorException(`Failed to create forecast due to database error: ${insertError.message}`);
            }
            if (!insertedForecast) {
                this.logger.error('Forecast insert attempt returned no data and no error. This is unexpected.');
                throw new common_1.InternalServerErrorException('Failed to create forecast, data missing after insert and no explicit error from database.');
            }
            this.logger.debug(`Supabase insert successful. Raw inserted data: ${JSON.stringify(insertedForecast)}`);
            const createdForecast = this.mapDbEntityToDto(insertedForecast);
            this.logger.log(`Forecast created successfully via service: ${createdForecast.id} by user ${userId}`);
            return createdForecast;
        }
        catch (error) {
            if (error instanceof common_1.ForbiddenException || error instanceof common_1.InternalServerErrorException || error instanceof common_1.NotFoundException || error instanceof common_1.ConflictException) {
                throw error;
            }
            this.logger.error(`Unexpected error caught in ForecastService.create: ${error.message}`, error.stack);
            throw new common_1.InternalServerErrorException('An unexpected error occurred in the forecast service during creation.');
        }
    }
    async findAll(userId, organizationId, request) {
        if (!userId) {
            this.logger.warn('Attempt to find forecasts without providing a userId');
            return [];
        }
        const client = this.supabaseService.getClientForRequest(request);
        const { data, error } = await client
            .from('forecasts')
            .select('*')
            .eq('organization_id', organizationId)
            .filter('user_id', 'eq', userId);
        if (error) {
            this.logger.error(`Failed to fetch forecasts: ${error.message}`, error.stack);
            throw new common_1.InternalServerErrorException(`Failed to fetch forecasts: ${error.message}`);
        }
        return data.map(forecast => this.mapDbEntityToDto(forecast));
    }
    async findOne(id, userId, request) {
        this.logger.debug(`Finding forecast ${id} for user ${userId}`);
        if (!userId) {
            this.logger.warn(`Attempt to find forecast ${id} without providing a userId`);
            throw new common_1.NotFoundException(`Forecast with ID ${id} not found.`);
        }
        const client = this.supabaseService.getClientForRequest(request);
        const { data, error } = await client
            .from('forecasts')
            .select('*')
            .eq('id', id)
            .match({ user_id: userId })
            .single();
        if (error) {
            if (error.code === 'PGRST116' || error.message?.includes('not found')) {
                this.logger.warn(`Forecast ${id} not found or does not belong to user ${userId}.`);
                throw new common_1.NotFoundException(`Forecast with ID ${id} not found.`);
            }
            this.logger.error(`Error fetching forecast ${id}: ${error.message}`, error.stack);
            throw new common_1.InternalServerErrorException(`Failed to retrieve forecast details: ${error.message}`);
        }
        if (!data) {
            this.logger.warn(`Forecast ${id} not found.`);
            throw new common_1.NotFoundException(`Forecast with ID ${id} not found.`);
        }
        return this.mapDbEntityToDto(data);
    }
    async update(id, userId, dto, request) {
        await this.findOne(id, userId, request);
        if (Object.keys(dto).length === 0) {
            return;
        }
        const updateData = {};
        if (dto.name !== undefined) {
            updateData.name = dto.name;
        }
        if (dto.forecastStartDate !== undefined) {
            updateData.forecast_start_date = dto.forecastStartDate;
        }
        if (dto.forecastEndDate !== undefined) {
            updateData.forecast_end_date = dto.forecastEndDate;
        }
        updateData.updated_at = new Date().toISOString();
        if (Object.keys(updateData).length === 1 && updateData.updated_at) {
            return;
        }
        const client = this.supabaseService.getClientForRequest(request);
        const { data, error } = await client
            .from('forecasts')
            .update(updateData)
            .match({ id, user_id: userId })
            .select('id')
            .single();
        if (error) {
            this.logger.error(`Failed to update forecast ${id}: ${error.message}`, error.stack);
            throw new common_1.InternalServerErrorException(`Failed to update forecast ${id}: ${error.message}`);
        }
        if (!data) {
            this.logger.warn(`Attempted to update non-existent forecast: ${id}`);
            throw new common_1.NotFoundException(`Forecast with ID ${id} not found.`);
        }
        this.logger.log(`Forecast updated: ${id} by user: ${userId}`);
    }
    async remove(id, userId, request) {
        try {
            await this.findOne(id, userId, request);
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error(`Unexpected error checking forecast before delete: ${error.message}`, error.stack);
            throw new common_1.InternalServerErrorException('An error occurred while trying to delete the forecast');
        }
        const client = this.supabaseService.getClientForRequest(request);
        const { error } = await client
            .from('forecasts')
            .delete()
            .match({ id, user_id: userId });
        if (error) {
            this.logger.error(`Error deleting forecast ${id}: ${error.message}`, error.stack);
            throw new common_1.InternalServerErrorException(`Failed to delete forecast: ${error.message}`);
        }
        this.logger.log(`Forecast deleted: ${id} by user: ${userId}`);
    }
    async bulkSaveGraph(forecastId, userId, dto, request) {
        return this.performanceService.trackOperation('forecast.bulkSaveGraph', async () => {
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
                    throw new common_1.InternalServerErrorException(`Failed to save forecast: ${error.message}`);
                }
                if (!data) {
                    this.logger.error(`Bulk save returned no data for forecast ${forecastId}`);
                    throw new common_1.InternalServerErrorException('Failed to save forecast: No data returned');
                }
                this.logger.log(`Forecast ${forecastId} bulk saved successfully`);
                return data;
            }
            catch (error) {
                if (error instanceof common_1.InternalServerErrorException || error instanceof common_1.NotFoundException) {
                    throw error;
                }
                this.logger.error(`Unexpected error in bulk save: ${error.message}`, error.stack);
                throw new common_1.InternalServerErrorException('Failed to save forecast graph');
            }
        }, {
            forecastId,
            userId,
            nodeCount: dto.nodes.length,
            edgeCount: dto.edges.length
        });
    }
    mapDbEntityToDto(entity) {
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
};
exports.ForecastService = ForecastService;
exports.ForecastService = ForecastService = ForecastService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_optimized_service_1.SupabaseOptimizedService,
        performance_service_1.PerformanceService])
], ForecastService);
//# sourceMappingURL=forecast.service.js.map