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
var ForecastEdgeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForecastEdgeService = void 0;
const common_1 = require("@nestjs/common");
const supabase_optimized_service_1 = require("../../supabase/supabase-optimized.service");
const forecast_node_service_1 = require("./forecast-node.service");
let ForecastEdgeService = ForecastEdgeService_1 = class ForecastEdgeService {
    constructor(supabaseService, nodeService) {
        this.supabaseService = supabaseService;
        this.nodeService = nodeService;
        this.logger = new common_1.Logger(ForecastEdgeService_1.name);
    }
    async create(dto, request) {
        try {
            await this.nodeService.findOne(dto.sourceNodeId, request, dto.forecastId);
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                this.logger.warn(`Source node ${dto.sourceNodeId} not found for forecast ${dto.forecastId} during edge creation.`);
                throw new common_1.NotFoundException(`Source node with ID ${dto.sourceNodeId} not found in forecast ${dto.forecastId}.`);
            }
            this.logger.error(`Error verifying source node ${dto.sourceNodeId}: ${error.message}`, error.stack);
            throw new common_1.InternalServerErrorException('Error verifying source node existence.');
        }
        try {
            await this.nodeService.findOne(dto.targetNodeId, request, dto.forecastId);
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                this.logger.warn(`Target node ${dto.targetNodeId} not found for forecast ${dto.forecastId} during edge creation.`);
                throw new common_1.NotFoundException(`Target node with ID ${dto.targetNodeId} not found in forecast ${dto.forecastId}.`);
            }
            this.logger.error(`Error verifying target node ${dto.targetNodeId}: ${error.message}`, error.stack);
            throw new common_1.InternalServerErrorException('Error verifying target node existence.');
        }
        try {
            const client = this.supabaseService.getClientForRequest(request);
            const { data: insertedEdge, error: insertError } = await client
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
                    throw new common_1.NotFoundException('One or both nodes do not exist or do not belong to the specified forecast.');
                }
                throw new common_1.InternalServerErrorException(`Failed to create forecast edge: ${insertError.message}`);
            }
            if (!insertedEdge) {
                this.logger.error('Forecast edge insert succeeded but no data returned.');
                throw new common_1.InternalServerErrorException('Failed to create forecast edge, data missing after insert.');
            }
            const createdEdge = this.mapDbEntityToDto(insertedEdge);
            this.logger.log(`Forecast edge created: ${createdEdge.id} for forecast ${dto.forecastId}`);
            return createdEdge;
        }
        catch (error) {
            if (error instanceof common_1.InternalServerErrorException) {
                throw error;
            }
            this.logger.error(`Unexpected error during forecast edge creation: ${error.message}`, error.stack);
            throw new common_1.InternalServerErrorException('An unexpected error occurred while creating the forecast edge.');
        }
    }
    async findByForecast(forecastId, request) {
        const client = this.supabaseService.getClientForRequest(request);
        const { data, error } = await client
            .from('forecast_edges')
            .select('*')
            .eq('forecast_id', forecastId);
        if (error) {
            this.logger.error(`Failed to fetch forecast edges: ${error.message}`, error.stack);
            throw new common_1.InternalServerErrorException(`Failed to fetch forecast edges: ${error.message}`);
        }
        return data.map(edge => this.mapDbEntityToDto(edge));
    }
    async findOne(id, request) {
        const client = this.supabaseService.getClientForRequest(request);
        const { data, error } = await client
            .from('forecast_edges')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116' || error.message?.includes('not found')) {
                this.logger.warn(`Forecast edge ${id} not found.`);
                throw new common_1.NotFoundException(`Forecast edge with ID ${id} not found.`);
            }
            this.logger.error(`Error fetching forecast edge ${id}: ${error.message}`, error.stack);
            throw new common_1.InternalServerErrorException(`Failed to retrieve forecast edge details: ${error.message}`);
        }
        if (!data) {
            this.logger.warn(`Forecast edge ${id} not found.`);
            throw new common_1.NotFoundException(`Forecast edge with ID ${id} not found.`);
        }
        return this.mapDbEntityToDto(data);
    }
    async remove(id, request) {
        const client = this.supabaseService.getClientForRequest(request);
        const { count, error } = await client
            .from('forecast_edges')
            .delete()
            .eq('id', id);
        if (error) {
            this.logger.error(`Failed to delete forecast edge ${id}: ${error.message}`, error.stack);
            throw new common_1.InternalServerErrorException(`Failed to delete forecast edge ${id}: ${error.message}`);
        }
        if (count === 0) {
            this.logger.warn(`Attempted to delete non-existent forecast edge: ${id}`);
            throw new common_1.NotFoundException(`Forecast edge with ID ${id} not found.`);
        }
        this.logger.log(`Forecast edge deleted: ${id}`);
    }
    mapDbEntityToDto(entity) {
        return {
            id: entity.id,
            forecastId: entity.forecast_id,
            sourceNodeId: entity.source_node_id,
            targetNodeId: entity.target_node_id,
            createdAt: new Date(entity.created_at),
        };
    }
};
exports.ForecastEdgeService = ForecastEdgeService;
exports.ForecastEdgeService = ForecastEdgeService = ForecastEdgeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_optimized_service_1.SupabaseOptimizedService,
        forecast_node_service_1.ForecastNodeService])
], ForecastEdgeService);
//# sourceMappingURL=forecast-edge.service.js.map