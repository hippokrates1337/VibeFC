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
var ForecastCalculationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForecastCalculationService = void 0;
const common_1 = require("@nestjs/common");
const supabase_optimized_service_1 = require("../../supabase/supabase-optimized.service");
const data_intake_service_1 = require("../../data-intake/data-intake.service");
const forecast_service_1 = require("./forecast.service");
const forecast_node_service_1 = require("./forecast-node.service");
const forecast_edge_service_1 = require("./forecast-edge.service");
const graph_converter_1 = require("./calculation-engine/graph-converter");
const calculation_engine_1 = require("./calculation-engine/calculation-engine");
const variable_data_service_1 = require("./calculation-engine/variable-data-service");
let ForecastCalculationService = ForecastCalculationService_1 = class ForecastCalculationService {
    constructor(supabaseService, dataIntakeService, forecastService, forecastNodeService, forecastEdgeService) {
        this.supabaseService = supabaseService;
        this.dataIntakeService = dataIntakeService;
        this.forecastService = forecastService;
        this.forecastNodeService = forecastNodeService;
        this.forecastEdgeService = forecastEdgeService;
        this.logger = new common_1.Logger(ForecastCalculationService_1.name);
    }
    async calculateForecast(forecastId, userId, request) {
        try {
            this.logger.log(`[ForecastCalculation] Starting calculation for forecast ${forecastId} by user ${userId}`);
            const forecast = await this.forecastService.findOne(forecastId, userId, request);
            if (!forecast) {
                throw new common_1.NotFoundException(`Forecast ${forecastId} not found`);
            }
            this.logger.log(`[ForecastCalculation] Forecast found: ${forecast.name}`);
            const nodes = await this.forecastNodeService.findByForecast(forecastId, request);
            const edges = await this.forecastEdgeService.findByForecast(forecastId, request);
            this.logger.log(`[ForecastCalculation] Graph loaded: ${nodes.length} nodes, ${edges.length} edges`);
            const variablesResponse = await this.dataIntakeService.getVariablesByUser(userId, request);
            const variables = variablesResponse.variables || [];
            this.logger.log(`[ForecastCalculation] Variables loaded: ${variables.length} variables`);
            variables.forEach(variable => {
                const dataCount = variable.values ? variable.values.length : 0;
                this.logger.log(`[ForecastCalculation] Variable: ${variable.id} (${variable.name}) - ${dataCount} data points`);
                if (variable.values && variable.values.length > 0) {
                    const firstDate = variable.values[0].date;
                    const lastDate = variable.values[variable.values.length - 1].date;
                    this.logger.log(`[ForecastCalculation] Variable ${variable.name} date range: ${firstDate} to ${lastDate}`);
                }
            });
            const transformedNodes = this.transformNodesToCalculationFormat(nodes);
            const transformedEdges = this.transformEdgesToCalculationFormat(edges);
            const transformedVariables = this.transformVariablesToCalculationFormat(variables);
            this.logger.log(`[ForecastCalculation] Data transformed for calculation engine`);
            const calculationResult = await this.executeRealCalculation(forecastId, forecast, transformedNodes, transformedEdges, transformedVariables);
            const storedResult = await this.storeCalculationResults(forecastId, forecast.organizationId, calculationResult, request);
            this.logger.log(`[ForecastCalculation] Calculation completed and stored for forecast ${forecastId}`);
            return storedResult;
        }
        catch (error) {
            this.logger.error(`[ForecastCalculation] Calculation failed for forecast ${forecastId}:`, error);
            if (error instanceof common_1.NotFoundException || error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.InternalServerErrorException(`Forecast calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async executeRealCalculation(forecastId, forecast, nodes, edges, variables) {
        try {
            this.logger.log(`[ForecastCalculation] Starting real calculation engine execution`);
            this.validateDataIntegrity(nodes, edges);
            const graphConverter = new graph_converter_1.GraphConverter();
            const variableDataService = new variable_data_service_1.VariableDataService();
            const calculationEngine = new calculation_engine_1.CalculationEngine(variableDataService);
            this.logger.log(`[ForecastCalculation] Validating graph structure`);
            const validation = graphConverter.validateGraph(nodes, edges);
            if (!validation.isValid) {
                this.logger.error(`[ForecastCalculation] Graph validation failed:`, validation.errors);
                throw new common_1.BadRequestException(`Invalid forecast graph: ${validation.errors.join(', ')}`);
            }
            if (validation.warnings.length > 0) {
                this.logger.warn(`[ForecastCalculation] Graph validation warnings:`, validation.warnings);
            }
            this.logger.log(`[ForecastCalculation] Converting graph to calculation trees`);
            const trees = graphConverter.convertToTrees(nodes, edges);
            this.logger.log(`[ForecastCalculation] Generated ${trees.length} calculation trees`);
            this.logger.log(`[ForecastCalculation] Executing calculation for period ${forecast.forecastStartDate} to ${forecast.forecastEndDate}`);
            const result = await calculationEngine.calculateForecast(trees, new Date(forecast.forecastStartDate), new Date(forecast.forecastEndDate), variables);
            return {
                ...result,
                forecastId
            };
        }
        catch (error) {
            this.logger.error(`[ForecastCalculation] Real calculation execution failed:`, error);
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            if (error instanceof Error) {
                if (error.message.includes('Graph validation failed')) {
                    throw new common_1.BadRequestException(`Invalid forecast graph: ${error.message}`);
                }
                if (error.message.includes('Variable not found')) {
                    throw new common_1.BadRequestException(`Missing variable data: ${error.message}`);
                }
                if (error.message.includes('Calculation failed')) {
                    throw new common_1.BadRequestException(`Calculation error: ${error.message}`);
                }
                if (error.message.includes('Historical data for')) {
                    throw new common_1.BadRequestException(`Missing historical data: ${error.message}`);
                }
                if (error.message.includes('Historical variable')) {
                    throw new common_1.BadRequestException(`Variable configuration error: ${error.message}`);
                }
                if (error.message.includes('Node evaluation failed')) {
                    throw new common_1.BadRequestException(`Node calculation error: ${error.message}`);
                }
                if (error.message.includes('has no historical variable configured')) {
                    throw new common_1.BadRequestException(`Configuration error: ${error.message}`);
                }
                if (error.message.includes('not found in calculation trees')) {
                    throw new common_1.BadRequestException(`Graph structure error: ${error.message}`);
                }
            }
            throw new common_1.InternalServerErrorException(`Calculation engine execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    validateDataIntegrity(nodes, edges) {
        this.logger.log(`[ForecastCalculation] Validating data integrity`);
        const seedNodes = nodes.filter(n => n.type === 'SEED');
        const metricNodeIds = new Set(nodes.filter(n => n.type === 'METRIC').map(n => n.id));
        const orphanedSeedRefs = seedNodes.filter(seedNode => {
            const seedData = seedNode.data;
            return seedData.sourceMetricId && !metricNodeIds.has(seedData.sourceMetricId);
        });
        if (orphanedSeedRefs.length > 0) {
            const orphanedInfo = orphanedSeedRefs.map(node => {
                const seedData = node.data;
                return `SEED node ${node.id} → metric ${seedData.sourceMetricId}`;
            }).join(', ');
            this.logger.warn(`[ForecastCalculation] Found orphaned SEED references: ${orphanedInfo}`);
            throw new common_1.BadRequestException(`Data integrity issue: Found SEED nodes referencing non-existent metrics. This usually means the forecast data is out of sync. Please save your current changes first, then try calculating again. Orphaned references: ${orphanedInfo}`);
        }
        const nodeIds = new Set(nodes.map(n => n.id));
        const orphanedEdges = edges.filter(edge => !nodeIds.has(edge.source) || !nodeIds.has(edge.target));
        if (orphanedEdges.length > 0) {
            const orphanedInfo = orphanedEdges.map(edge => `edge ${edge.id}`).join(', ');
            this.logger.warn(`[ForecastCalculation] Found orphaned edges: ${orphanedInfo}`);
            throw new common_1.BadRequestException(`Data integrity issue: Found edges referencing non-existent nodes. Please save your current changes first. Orphaned edges: ${orphanedInfo}`);
        }
        this.logger.log(`[ForecastCalculation] Data integrity validation passed`);
    }
    transformNodesToCalculationFormat(nodes) {
        return nodes.map(node => ({
            id: node.id,
            type: node.kind,
            data: node.attributes,
            position: node.position
        }));
    }
    transformEdgesToCalculationFormat(edges) {
        return edges.map(edge => ({
            id: edge.id,
            source: edge.sourceNodeId,
            target: edge.targetNodeId
        }));
    }
    transformVariablesToCalculationFormat(variables) {
        return variables.map((variable) => ({
            id: variable.id,
            name: variable.name,
            type: variable.type,
            organizationId: variable.organization_id,
            timeSeries: (variable.values || []).map((value) => ({
                date: new Date(value.date),
                value: value.value
            }))
        }));
    }
    async getLatestCalculationResults(forecastId, userId, request) {
        try {
            this.logger.log(`[ForecastCalculation] Fetching latest results for forecast ${forecastId}`);
            await this.forecastService.findOne(forecastId, userId, request);
            const client = this.supabaseService.getClientForRequest(request);
            const { data, error } = await client
                .from('forecast_calculation_results')
                .select('*')
                .eq('forecast_id', forecastId)
                .order('calculated_at', { ascending: false })
                .limit(1)
                .single();
            if (error && error.code !== 'PGRST116') {
                this.logger.error(`[ForecastCalculation] Database error fetching results:`, error);
                throw new common_1.InternalServerErrorException(`Database error: ${error.message}`);
            }
            if (!data) {
                this.logger.log(`[ForecastCalculation] No calculation results found for forecast ${forecastId}`);
                return null;
            }
            return this.mapDatabaseResultToDto(data);
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException || error instanceof common_1.InternalServerErrorException) {
                throw error;
            }
            this.logger.error(`[ForecastCalculation] Failed to fetch calculation results:`, error);
            throw new common_1.InternalServerErrorException(`Failed to fetch calculation results: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getCalculationHistory(forecastId, userId, request) {
        try {
            this.logger.log(`[ForecastCalculation] Fetching calculation history for forecast ${forecastId}`);
            await this.forecastService.findOne(forecastId, userId, request);
            const client = this.supabaseService.getClientForRequest(request);
            const { data, error } = await client
                .from('forecast_calculation_results')
                .select('*')
                .eq('forecast_id', forecastId)
                .order('calculated_at', { ascending: false });
            if (error) {
                this.logger.error(`[ForecastCalculation] Database error fetching history:`, error);
                throw new common_1.InternalServerErrorException(`Database error: ${error.message}`);
            }
            const results = data.map((item) => this.mapDatabaseResultToDto(item));
            this.logger.log(`[ForecastCalculation] Retrieved ${results.length} historical results`);
            return results;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException || error instanceof common_1.InternalServerErrorException) {
                throw error;
            }
            this.logger.error(`[ForecastCalculation] Failed to fetch calculation history:`, error);
            throw new common_1.InternalServerErrorException(`Failed to fetch calculation history: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async storeCalculationResults(forecastId, organizationId, results, request) {
        try {
            const client = this.supabaseService.getClientForRequest(request);
            const { data, error } = await client
                .from('forecast_calculation_results')
                .insert({
                forecast_id: forecastId,
                organization_id: organizationId,
                calculated_at: new Date().toISOString(),
                results: results.metrics
            })
                .select()
                .single();
            if (error) {
                this.logger.error(`[ForecastCalculation] Failed to store results:`, error);
                throw new common_1.InternalServerErrorException(`Failed to store calculation results: ${error.message}`);
            }
            return this.mapDatabaseResultToDto(data);
        }
        catch (error) {
            this.logger.error(`[ForecastCalculation] Error storing calculation results:`, error);
            throw error;
        }
    }
    mapDatabaseResultToDto(data) {
        return {
            id: data.id,
            forecastId: data.forecast_id,
            calculatedAt: data.calculated_at,
            metrics: data.results || []
        };
    }
};
exports.ForecastCalculationService = ForecastCalculationService;
exports.ForecastCalculationService = ForecastCalculationService = ForecastCalculationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_optimized_service_1.SupabaseOptimizedService,
        data_intake_service_1.DataIntakeService,
        forecast_service_1.ForecastService,
        forecast_node_service_1.ForecastNodeService,
        forecast_edge_service_1.ForecastEdgeService])
], ForecastCalculationService);
//# sourceMappingURL=forecast-calculation.service.js.map