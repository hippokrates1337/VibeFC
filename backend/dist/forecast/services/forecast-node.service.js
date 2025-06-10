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
var ForecastNodeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForecastNodeService = void 0;
const common_1 = require("@nestjs/common");
const supabase_optimized_service_1 = require("../../supabase/supabase-optimized.service");
let ForecastNodeService = ForecastNodeService_1 = class ForecastNodeService {
    constructor(supabaseService) {
        this.supabaseService = supabaseService;
        this.logger = new common_1.Logger(ForecastNodeService_1.name);
    }
    async create(dto, request) {
        try {
            const client = this.supabaseService.getClientForRequest(request);
            const { data: insertedNode, error: insertError } = await client
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
                throw new common_1.InternalServerErrorException(`Failed to create forecast node: ${insertError.message}`);
            }
            if (!insertedNode) {
                this.logger.error('Forecast node insert succeeded but no data returned.');
                throw new common_1.InternalServerErrorException('Failed to create forecast node, data missing after insert.');
            }
            const createdNode = this.mapDbEntityToDto(insertedNode);
            this.logger.log(`Forecast node created: ${createdNode.id} for forecast ${dto.forecastId}`);
            return createdNode;
        }
        catch (error) {
            if (error instanceof common_1.InternalServerErrorException) {
                throw error;
            }
            this.logger.error(`Unexpected error during forecast node creation: ${error.message}`, error.stack);
            throw new common_1.InternalServerErrorException('An unexpected error occurred while creating the forecast node.');
        }
    }
    async findByForecast(forecastId, request) {
        const client = this.supabaseService.getClientForRequest(request);
        const { data, error } = await client
            .from('forecast_nodes')
            .select('*')
            .eq('forecast_id', forecastId);
        if (error) {
            this.logger.error(`Failed to fetch forecast nodes: ${error.message}`, error.stack);
            throw new common_1.InternalServerErrorException(`Failed to fetch forecast nodes: ${error.message}`);
        }
        return data.map(node => this.mapDbEntityToDto(node));
    }
    async findOne(id, request, forecastId) {
        const client = this.supabaseService.getClientForRequest(request);
        let query = client
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
                throw new common_1.NotFoundException(message);
            }
            this.logger.error(`Error fetching forecast node ${id}${forecastId ? ' for forecast ' + forecastId : ''}: ${error.message}`, error.stack);
            throw new common_1.InternalServerErrorException(`Failed to retrieve forecast node details: ${error.message}`);
        }
        if (!data) {
            const message = forecastId
                ? `Forecast node with ID ${id} not found in forecast ${forecastId} (no data).`
                : `Forecast node with ID ${id} not found (no data).`;
            this.logger.warn(message);
            throw new common_1.NotFoundException(message);
        }
        return this.mapDbEntityToDto(data);
    }
    async update(id, dto, request) {
        if (Object.keys(dto).length === 0) {
            return;
        }
        const updateData = {};
        if (dto.kind !== undefined) {
            updateData.kind = dto.kind;
        }
        if (dto.attributes !== undefined) {
            updateData.attributes = dto.attributes;
        }
        if (dto.position !== undefined) {
            updateData.position = dto.position;
        }
        updateData.updated_at = new Date().toISOString();
        if (Object.keys(updateData).length === 1 && updateData.updated_at) {
            return;
        }
        const client = this.supabaseService.getClientForRequest(request);
        const { data, error } = await client
            .from('forecast_nodes')
            .update(updateData)
            .eq('id', id)
            .select('id')
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                this.logger.warn(`Attempted to update non-existent forecast node ${id} (PGRST116).`);
                throw new common_1.NotFoundException(`Forecast node with ID ${id} not found.`);
            }
            this.logger.error(`Failed to update forecast node ${id}: ${error.message}`, error.stack);
            throw new common_1.InternalServerErrorException(`Failed to update forecast node ${id}: ${error.message}`);
        }
        if (!data) {
            this.logger.warn(`Attempted to update non-existent forecast node: ${id} (no data returned post-update).`);
            throw new common_1.NotFoundException(`Forecast node with ID ${id} not found.`);
        }
        this.logger.log(`Forecast node updated: ${id}`);
    }
    async remove(id, request) {
        this.logger.debug(`Attempting to remove forecast node with id: ${id}`);
        await this.findOne(id, request);
        const client = this.supabaseService.getClientForRequest(request);
        const { error } = await client
            .from('forecast_nodes')
            .delete()
            .eq('id', id);
        if (error) {
            this.logger.error(`Failed to delete forecast node ${id} during Supabase operation: ${error.message}`, error.stack);
            throw new common_1.InternalServerErrorException(`Failed to delete forecast node ${id}: ${error.message}`);
        }
        this.logger.log(`Forecast node deleted: ${id}`);
    }
    mapDbEntityToDto(entity) {
        return {
            id: entity.id,
            forecastId: entity.forecast_id,
            kind: entity.kind,
            attributes: entity.attributes,
            position: entity.position,
            createdAt: new Date(entity.created_at),
            updatedAt: new Date(entity.updated_at),
        };
    }
};
exports.ForecastNodeService = ForecastNodeService;
exports.ForecastNodeService = ForecastNodeService = ForecastNodeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_optimized_service_1.SupabaseOptimizedService])
], ForecastNodeService);
//# sourceMappingURL=forecast-node.service.js.map