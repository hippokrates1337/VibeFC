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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
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
const calculation_dto_1 = require("../dto/calculation.dto");
const graph_converter_1 = require("./calculation-engine/graph-converter");
const calculation_engine_1 = require("./calculation-engine/calculation-engine");
const calculation_engine_core_1 = require("./calculation-engine/calculation-engine-core");
const calculation_adapter_1 = require("./calculation-engine/adapters/calculation-adapter");
let ForecastCalculationService = ForecastCalculationService_1 = class ForecastCalculationService {
    constructor(supabaseService, dataIntakeService, forecastService, forecastNodeService, forecastEdgeService, legacyEngine, newEngine, adapter, useNewEngine) {
        this.supabaseService = supabaseService;
        this.dataIntakeService = dataIntakeService;
        this.forecastService = forecastService;
        this.forecastNodeService = forecastNodeService;
        this.forecastEdgeService = forecastEdgeService;
        this.legacyEngine = legacyEngine;
        this.newEngine = newEngine;
        this.adapter = adapter;
        this.useNewEngine = useNewEngine;
        this.logger = new common_1.Logger(ForecastCalculationService_1.name);
    }
    async calculateForecast(forecastId, userId, request) {
        this.logger.warn(`[ForecastCalculation] DEPRECATED: calculateForecast called for forecast ${forecastId}. Routing to comprehensive calculation for consistency.`);
        const calculationRequest = {
            calculationTypes: [calculation_dto_1.CalculationTypeDto.FORECAST],
            includeIntermediateNodes: true
        };
        const result = await this.calculateForecastWithPeriods(forecastId, userId, request, calculationRequest);
        return this.convertToLegacyDto(result);
    }
    async calculateHistoricalValues(forecastId, actualStartDate, actualEndDate, userId, request) {
        this.logger.log(`[ForecastCalculation] [CombinedCalculation] Executing combined calculation for period ${actualStartDate.toISOString()} to ${actualEndDate.toISOString()}`);
        try {
            const forecast = await this.forecastService.findOne(forecastId, userId, request);
            if (!forecast) {
                throw new common_1.NotFoundException(`Forecast not found: ${forecastId}`);
            }
            const organizationId = forecast.organizationId;
            if (!organizationId) {
                throw new common_1.BadRequestException('Forecast must belong to an organization');
            }
            const calculationResult = await this.executeComprehensiveCalculation(forecastId, forecast, actualStartDate, actualEndDate, userId, request);
            const storedResult = await this.storeCalculationResults(forecastId, organizationId, calculationResult, actualStartDate, actualEndDate, request);
            this.logger.log(`[ForecastCalculation] [CombinedCalculation] Combined calculation completed successfully`);
            return storedResult;
        }
        catch (error) {
            this.logger.error(`[ForecastCalculation] [CombinedCalculation] Combined calculation failed:`, error);
            throw error;
        }
    }
    async executeRealCalculation(forecastId, forecast, nodes, edges, variables) {
        try {
            this.logger.log(`[ForecastCalculation] Starting real calculation engine execution`);
            this.validateDataIntegrity(nodes, edges);
            const graphConverter = new graph_converter_1.GraphConverter();
            const calculationEngine = this.legacyEngine;
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
            const clientNodes = nodes.map(n => this.convertNodeToClientFormat(n));
            const clientEdges = edges.map(e => this.convertEdgeToClientFormat(e));
            const trees = graphConverter.convertToTrees(clientNodes, clientEdges);
            this.logger.log(`[ForecastCalculation] Generated ${trees.length} calculation trees`);
            this.logger.log(`[ForecastCalculation] Executing extended calculation for period ${forecast.forecastStartDate} to ${forecast.forecastEndDate}`);
            const extendedResult = await calculationEngine.calculateForecastExtended(trees, new Date(`${forecast.forecastStartDate}T00:00:00.000Z`), new Date(`${forecast.forecastEndDate}T00:00:00.000Z`), variables);
            return {
                ...extendedResult,
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
    async executeHistoricalCalculation(forecastId, nodes, edges, variables, actualStartDate, actualEndDate) {
        try {
            this.logger.log(`[ForecastCalculation] Starting historical calculation engine execution`);
            this.validateDataIntegrity(nodes, edges);
            const graphConverter = new graph_converter_1.GraphConverter();
            const calculationEngine = this.legacyEngine;
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
            const clientNodes = nodes.map(n => this.convertNodeToClientFormat(n));
            const clientEdges = edges.map(e => this.convertEdgeToClientFormat(e));
            const trees = graphConverter.convertToTrees(clientNodes, clientEdges);
            this.logger.log(`[ForecastCalculation] Generated ${trees.length} calculation trees`);
            this.logger.log(`[ForecastCalculation] Executing historical calculation for period ${actualStartDate.toISOString()} to ${actualEndDate.toISOString()}`);
            const historicalResult = await calculationEngine.calculateHistoricalValues(trees, actualStartDate, actualEndDate, variables);
            return {
                ...historicalResult,
                forecastId
            };
        }
        catch (error) {
            this.logger.error(`[ForecastCalculation] Historical calculation execution failed:`, error);
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
                if (error.message.includes('Historical calculation failed')) {
                    throw new common_1.BadRequestException(`Historical calculation error: ${error.message}`);
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
            }
            throw new common_1.InternalServerErrorException(`Historical calculation execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    async storeCalculationResultsLegacy(forecastId, organizationId, results, request) {
        try {
            const client = this.supabaseService.getClientForRequest(request);
            const storedResults = {
                metrics: results.metrics,
                allNodes: results.allNodes
            };
            const { data, error } = await client
                .from('forecast_calculation_results')
                .insert({
                forecast_id: forecastId,
                organization_id: organizationId,
                calculated_at: new Date().toISOString(),
                results: storedResults
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
    async storeHistoricalCalculationResults(forecastId, organizationId, results, actualStartDate, actualEndDate, request) {
        try {
            const client = this.supabaseService.getClientForRequest(request);
            const storedResults = {
                metrics: results.metrics,
                allNodes: results.allNodes,
                actualPeriod: {
                    startDate: actualStartDate.toISOString(),
                    endDate: actualEndDate.toISOString()
                },
                calculationType: 'historical'
            };
            const { data, error } = await client
                .from('forecast_calculation_results')
                .insert({
                forecast_id: forecastId,
                organization_id: organizationId,
                calculated_at: new Date().toISOString(),
                results: storedResults
            })
                .select()
                .single();
            if (error) {
                this.logger.error(`[ForecastCalculation] Failed to store historical results:`, error);
                throw new common_1.InternalServerErrorException(`Failed to store historical calculation results: ${error.message}`);
            }
            return this.mapDatabaseResultToDto(data);
        }
        catch (error) {
            this.logger.error(`[ForecastCalculation] Error storing historical calculation results:`, error);
            throw error;
        }
    }
    mapDatabaseResultToDto(data) {
        const results = data.results || {};
        return {
            id: data.id,
            forecastId: data.forecast_id,
            calculatedAt: data.calculated_at,
            metrics: results.metrics || results || [],
            allNodes: results.allNodes || undefined
        };
    }
    async executeComprehensiveCalculation(forecastId, forecast, actualStartDate, actualEndDate, userId, request) {
        try {
            this.logger.log(`[ForecastCalculation] Starting combined calculation engine execution`);
            const nodes = await this.forecastNodeService.findByForecast(forecastId, request);
            const edges = await this.forecastEdgeService.findByForecast(forecastId, request);
            this.logger.log(`[ForecastCalculation] Graph loaded: ${nodes.length} nodes, ${edges.length} edges`);
            const variablesResponse = await this.dataIntakeService.getVariablesByUser(userId, request);
            const variables = variablesResponse.variables || [];
            this.logger.log(`[ForecastCalculation] Variables loaded: ${variables.length} variables`);
            const transformedNodes = this.transformNodesToCalculationFormat(nodes);
            const transformedEdges = this.transformEdgesToCalculationFormat(edges);
            const transformedVariables = this.transformVariablesToCalculationFormat(variables);
            this.logger.log(`[ForecastCalculation] Data transformed for combined calculation engine`);
            this.validateDataIntegrity(transformedNodes, transformedEdges);
            const graphConverter = new graph_converter_1.GraphConverter();
            const calculationEngine = this.legacyEngine;
            this.logger.log(`[ForecastCalculation] Converting graph to calculation trees`);
            const trees = graphConverter.convertToTrees(transformedNodes, transformedEdges);
            this.logger.log(`[ForecastCalculation] Converted ${trees.length} calculation trees`);
            const forecastStartDate = new Date(`${forecast.forecastStartDate}T00:00:00.000Z`);
            const forecastEndDate = new Date(`${forecast.forecastEndDate}T00:00:00.000Z`);
            const result = await calculationEngine.calculateComprehensive(trees, forecastStartDate, forecastEndDate, actualStartDate, actualEndDate, transformedVariables);
            this.logger.log(`[ForecastCalculation] Combined calculation engine execution completed`);
            return {
                ...result,
                forecastId: forecastId
            };
        }
        catch (error) {
            this.logger.error(`[ForecastCalculation] Combined calculation execution failed:`, error);
            throw error;
        }
    }
    async storeCalculationResults(forecastId, organizationId, results, actualStartDate, actualEndDate, request) {
        try {
            const client = this.supabaseService.getClientForRequest(request);
            const storedResults = {
                metrics: results.metrics,
                allNodes: results.allNodes,
                actualPeriod: {
                    startDate: actualStartDate.toISOString(),
                    endDate: actualEndDate.toISOString()
                },
                calculationType: 'combined'
            };
            const { data, error } = await client
                .from('forecast_calculation_results')
                .insert({
                forecast_id: forecastId,
                organization_id: organizationId,
                calculated_at: new Date().toISOString(),
                results: storedResults
            })
                .select()
                .single();
            if (error) {
                this.logger.error(`[ForecastCalculation] Failed to store combined results:`, error);
                throw new common_1.InternalServerErrorException(`Failed to store combined calculation results: ${error.message}`);
            }
            return this.mapDatabaseResultToDto(data);
        }
        catch (error) {
            this.logger.error(`[ForecastCalculation] Error storing combined calculation results:`, error);
            throw error;
        }
    }
    async loadCalculationTreesForForecast(forecastId, userId, request) {
        const forecast = await this.forecastService.findOne(forecastId, userId, request);
        if (!forecast) {
            throw new common_1.NotFoundException(`Forecast ${forecastId} not found`);
        }
        const nodes = await this.forecastNodeService.findByForecast(forecastId, request);
        const edges = await this.forecastEdgeService.findByForecast(forecastId, request);
        const graphConverter = new graph_converter_1.GraphConverter();
        const clientNodes = nodes.map((node) => this.convertNodeToClientFormat(node));
        const clientEdges = edges.map((edge) => this.convertEdgeToClientFormat(edge));
        return graphConverter.convertToCalculationTrees(clientNodes, clientEdges);
    }
    async calculateForecastWithPeriods(forecastId, userId, request, calculationRequest) {
        try {
            this.logger.log(`[ForecastCalculation] Starting comprehensive calculation for forecast ${forecastId} by user ${userId}`);
            this.logger.log(`[ForecastCalculation] Calculation types: [${calculationRequest.calculationTypes.join(', ')}]`);
            this.logger.log(`[ForecastCalculation] Include intermediate nodes: ${calculationRequest.includeIntermediateNodes}`);
            this.logger.log(`[ForecastCalculation] Using ${this.useNewEngine ? 'NEW' : 'LEGACY'} calculation engine`);
            if (this.useNewEngine) {
                return await this.calculateWithNewEngine(forecastId, userId, request, calculationRequest);
            }
            else {
                return await this.calculateWithLegacyEngine(forecastId, userId, request, calculationRequest);
            }
        }
        catch (error) {
            this.logger.error(`[ForecastCalculation] Comprehensive calculation failed for forecast ${forecastId}:`, error);
            throw error;
        }
    }
    async calculateWithNewEngine(forecastId, userId, request, calculationRequest) {
        this.logger.log(`[ForecastCalculation] [NEW ENGINE] Processing forecast ${forecastId}`);
        const forecast = await this.forecastService.findOne(forecastId, userId, request);
        if (!forecast) {
            throw new common_1.NotFoundException(`Forecast ${forecastId} not found`);
        }
        const periodInfo = this.extractPeriodInfoFromForecast(forecast);
        this.logger.log(`[ForecastCalculation] [NEW ENGINE] Period info:`, JSON.stringify(periodInfo, null, 2));
        const nodes = await this.forecastNodeService.findByForecast(forecastId, request);
        const edges = await this.forecastEdgeService.findByForecast(forecastId, request);
        const variablesResponse = await this.dataIntakeService.getVariablesByUser(userId, request);
        const variables = variablesResponse.variables || [];
        const graphConverter = new graph_converter_1.GraphConverter();
        const clientNodes = nodes.map(node => this.convertNodeToClientFormat(node));
        const clientEdges = edges.map(edge => this.convertEdgeToClientFormat(edge));
        const trees = graphConverter.convertToCalculationTrees(clientNodes, clientEdges);
        const newRequest = {
            trees,
            periods: {
                forecast: {
                    start: periodInfo.forecastStartMonth,
                    end: periodInfo.forecastEndMonth
                },
                actual: {
                    start: periodInfo.actualStartMonth,
                    end: periodInfo.actualEndMonth
                }
            },
            calculationTypes: calculationRequest.calculationTypes.map(type => type.toLowerCase()),
            includeAllNodes: calculationRequest.includeIntermediateNodes || false,
            variables: variables.map(v => this.convertVariableToEngineFormat(v))
        };
        const result = await this.newEngine.calculate(newRequest);
        const unifiedResult = {
            id: '',
            forecastId,
            calculatedAt: result.calculatedAt.toISOString(),
            calculationTypes: result.calculationTypes.map(type => type.toUpperCase()),
            periodInfo: {
                forecastStartMonth: result.periodInfo.forecastStartMonth || periodInfo.forecastStartMonth,
                forecastEndMonth: result.periodInfo.forecastEndMonth || periodInfo.forecastEndMonth,
                actualStartMonth: result.periodInfo.actualStartMonth || periodInfo.actualStartMonth,
                actualEndMonth: result.periodInfo.actualEndMonth || periodInfo.actualEndMonth
            },
            metrics: this.convertToUnifiedNodeResultDto(result.nodeResults.filter(n => n.nodeType === 'METRIC')),
            allNodes: calculationRequest.includeIntermediateNodes
                ? this.convertToUnifiedNodeResultDto(result.nodeResults)
                : []
        };
        const unifiedForStore = {
            forecastId,
            calculatedAt: result.calculatedAt,
            calculationTypes: result.calculationTypes,
            periodInfo: {
                forecastStartMonth: result.periodInfo.forecastStartMonth,
                forecastEndMonth: result.periodInfo.forecastEndMonth,
                actualStartMonth: result.periodInfo.actualStartMonth,
                actualEndMonth: result.periodInfo.actualEndMonth,
            },
            metrics: this.convertToUnifiedNodeResultDto(result.nodeResults.filter((n) => n.nodeType === 'METRIC')),
            allNodes: (calculationRequest.includeIntermediateNodes
                ? this.convertToUnifiedNodeResultDto(result.nodeResults)
                : []),
        };
        const storedResult = await this.storeUnifiedCalculationResults(forecastId, forecast.organizationId, unifiedForStore, request);
        const finalResult = {
            ...unifiedResult,
            id: storedResult.id,
        };
        return finalResult;
    }
    async calculateWithLegacyEngine(forecastId, userId, request, calculationRequest) {
        this.logger.log(`[ForecastCalculation] [LEGACY ENGINE] Processing forecast ${forecastId}`);
        const forecast = await this.forecastService.findOne(forecastId, userId, request);
        if (!forecast) {
            throw new common_1.NotFoundException(`Forecast ${forecastId} not found`);
        }
        this.logger.log(`[ForecastCalculation] [Unified] Forecast found: ${forecast.name}`);
        const periodInfo = this.extractPeriodInfoFromForecast(forecast);
        this.logger.log(`[ForecastCalculation] [Unified] Period info: Forecast ${periodInfo.forecastStartMonth} to ${periodInfo.forecastEndMonth}, Actual ${periodInfo.actualStartMonth} to ${periodInfo.actualEndMonth}`);
        const nodes = await this.forecastNodeService.findByForecast(forecastId, request);
        const edges = await this.forecastEdgeService.findByForecast(forecastId, request);
        this.logger.log(`[ForecastCalculation] [Unified] Graph loaded: ${nodes.length} nodes, ${edges.length} edges`);
        const variablesResponse = await this.dataIntakeService.getVariablesByUser(userId, request);
        const variables = variablesResponse.variables || [];
        this.logger.log(`[ForecastCalculation] [Unified] Variables loaded: ${variables.length} variables`);
        const transformedNodes = this.transformNodesToCalculationFormat(nodes);
        const transformedEdges = this.transformEdgesToCalculationFormat(edges);
        const transformedVariables = this.transformVariablesToCalculationFormat(variables);
        this.logger.log(`[ForecastCalculation] [Unified] Data transformed for unified calculation engine`);
        const calculationResult = await this.executeUnifiedCalculation(forecastId, transformedNodes, transformedEdges, transformedVariables, periodInfo, calculationRequest);
        const storedResult = await this.storeUnifiedCalculationResults(forecastId, forecast.organizationId, calculationResult, request);
        this.logger.log(`[ForecastCalculation] [Unified] Unified calculation completed and stored for forecast ${forecastId}`);
        return storedResult;
    }
    extractPeriodInfoFromForecast(forecast) {
        const forecastStartMonth = forecast.forecastStartMonth ||
            this.dateToMMYYYY(new Date(forecast.forecastStartDate));
        const forecastEndMonth = forecast.forecastEndMonth ||
            this.dateToMMYYYY(new Date(forecast.forecastEndDate));
        let actualStartMonth = forecast.actualStartMonth ||
            this.subtractMonths(forecastStartMonth, 6);
        let actualEndMonth = forecast.actualEndMonth ||
            this.subtractMonths(forecastStartMonth, 1);
        const normalized = this.normalizeActualPeriodsForCalculation(forecastStartMonth, forecastEndMonth, actualStartMonth, actualEndMonth);
        if (normalized.actualStart !== actualStartMonth ||
            normalized.actualEnd !== actualEndMonth) {
            this.logger.warn(`[ForecastCalculation] Adjusted overlapping actual period for engine validation: ` +
                `${actualStartMonth}–${actualEndMonth} → ${normalized.actualStart}–${normalized.actualEnd} ` +
                `(forecast ${forecastStartMonth}–${forecastEndMonth})`);
            actualStartMonth = normalized.actualStart;
            actualEndMonth = normalized.actualEnd;
        }
        const periodInfo = {
            forecastStartMonth,
            forecastEndMonth,
            actualStartMonth,
            actualEndMonth
        };
        return periodInfo;
    }
    normalizeActualPeriodsForCalculation(forecastStart, forecastEnd, actualStart, actualEnd) {
        if (!this.actualAndForecastPeriodsOverlap(actualStart, actualEnd, forecastStart, forecastEnd)) {
            return { actualStart, actualEnd };
        }
        const lastMonthBeforeForecast = this.subtractMonths(forecastStart, 1);
        let end = actualEnd;
        let start = actualStart;
        if (this.compareMonthsMM(end, lastMonthBeforeForecast) > 0) {
            end = lastMonthBeforeForecast;
        }
        if (this.compareMonthsMM(start, end) > 0) {
            start = this.subtractMonths(end, 5);
        }
        return { actualStart: start, actualEnd: end };
    }
    actualAndForecastPeriodsOverlap(actualStart, actualEnd, forecastStart, forecastEnd) {
        return (this.compareMonthsMM(actualEnd, forecastStart) >= 0 &&
            this.compareMonthsMM(actualStart, forecastEnd) <= 0);
    }
    compareMonthsMM(a, b) {
        const [m1, y1] = a.split('-').map(Number);
        const [m2, y2] = b.split('-').map(Number);
        if (y1 !== y2) {
            return y1 - y2;
        }
        return m1 - m2;
    }
    async executeUnifiedCalculation(forecastId, nodes, edges, variables, periodInfo, calculationRequest) {
        try {
            this.logger.log(`[ForecastCalculation] [Unified] Starting unified calculation engine execution`);
            this.validateDataIntegrity(nodes, edges);
            const graphConverter = new graph_converter_1.GraphConverter();
            const calculationEngine = this.legacyEngine;
            this.logger.log(`[ForecastCalculation] [Unified] Validating graph structure`);
            const validation = graphConverter.validateGraph(nodes, edges);
            if (!validation.isValid) {
                this.logger.error(`[ForecastCalculation] [Unified] Graph validation failed:`, validation.errors);
                throw new common_1.BadRequestException(`Invalid forecast graph: ${validation.errors.join(', ')}`);
            }
            if (validation.warnings.length > 0) {
                this.logger.warn(`[ForecastCalculation] [Unified] Graph validation warnings:`, validation.warnings);
            }
            this.logger.log(`[ForecastCalculation] [Unified] Converting graph to calculation trees`);
            const clientNodes = nodes.map(n => this.convertNodeToClientFormat(n));
            const clientEdges = edges.map(e => this.convertEdgeToClientFormat(e));
            const trees = graphConverter.convertToTrees(clientNodes, clientEdges);
            this.logger.log(`[ForecastCalculation] [Unified] Generated ${trees.length} calculation trees`);
            const engineCalculationTypes = calculationRequest.calculationTypes.map((type) => type);
            const unifiedRequest = {
                calculationTypes: engineCalculationTypes,
                includeIntermediateNodes: calculationRequest.includeIntermediateNodes
            };
            this.logger.log(`[ForecastCalculation] [Unified] Executing unified calculation for periods`);
            const result = await calculationEngine.calculateWithPeriods(trees, periodInfo.forecastStartMonth, periodInfo.forecastEndMonth, periodInfo.actualStartMonth, periodInfo.actualEndMonth, variables, unifiedRequest);
            this.logger.log(`[ForecastCalculation] [Unified] Unified calculation engine execution completed`);
            return {
                ...result,
                forecastId: forecastId
            };
        }
        catch (error) {
            this.logger.error(`[ForecastCalculation] [Unified] Unified calculation execution failed:`, error);
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
                if (error.message.includes('Invalid MM-YYYY')) {
                    throw new common_1.BadRequestException(`Period format error: ${error.message}`);
                }
            }
            throw new common_1.InternalServerErrorException(`Unified calculation execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async storeUnifiedCalculationResults(forecastId, organizationId, results, request) {
        try {
            this.logger.log(`[ForecastCalculation] [Unified] Storing unified calculation results for forecast ${forecastId}`);
            const client = this.supabaseService.getClientForRequest(request);
            const storedResults = {
                metrics: results.metrics,
                allNodes: results.allNodes,
                periodInfo: results.periodInfo,
                calculationTypes: results.calculationTypes
            };
            const { data, error } = await client
                .from('forecast_calculation_results')
                .insert({
                forecast_id: forecastId,
                organization_id: organizationId,
                calculated_at: results.calculatedAt.toISOString(),
                results: storedResults
            })
                .select()
                .single();
            if (error) {
                this.logger.error(`[ForecastCalculation] [Unified] Failed to store unified results:`, error);
                throw new common_1.InternalServerErrorException(`Failed to store unified calculation results: ${error.message}`);
            }
            this.logger.log(`[ForecastCalculation] [Unified] Unified calculation results stored successfully`);
            return this.mapUnifiedDatabaseResultToDto(data);
        }
        catch (error) {
            this.logger.error(`[ForecastCalculation] [Unified] Error storing unified calculation results:`, error);
            throw error;
        }
    }
    mapUnifiedDatabaseResultToDto(dbResult) {
        const results = dbResult.results;
        return {
            id: dbResult.id,
            forecastId: dbResult.forecast_id,
            calculatedAt: dbResult.calculated_at,
            calculationTypes: results.calculationTypes || ['forecast'],
            periodInfo: results.periodInfo || {
                forecastStartMonth: '01-2023',
                forecastEndMonth: '12-2023',
                actualStartMonth: '07-2022',
                actualEndMonth: '12-2022'
            },
            metrics: results.metrics || [],
            allNodes: results.allNodes || undefined
        };
    }
    dateToMMYYYY(date) {
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const year = String(date.getUTCFullYear());
        return `${month}-${year}`;
    }
    subtractMonths(mmyyyy, monthsToSubtract) {
        const [monthStr, yearStr] = mmyyyy.split('-');
        const month = parseInt(monthStr, 10);
        const year = parseInt(yearStr, 10);
        let newMonth = month - monthsToSubtract;
        let newYear = year;
        while (newMonth <= 0) {
            newMonth += 12;
            newYear--;
        }
        return `${String(newMonth).padStart(2, '0')}-${newYear}`;
    }
    convertToLegacyDto(result) {
        const metrics = result.metrics.map(metric => ({
            metricNodeId: metric.nodeId,
            values: metric.values.map(value => ({
                date: this.mmyyyyToDate(value.month).toISOString(),
                forecast: value.forecast,
                budget: value.budget,
                historical: value.historical
            }))
        }));
        const allNodes = result.allNodes?.map(node => ({
            nodeId: node.nodeId,
            nodeType: node.nodeType,
            values: node.values.map(value => ({
                date: this.mmyyyyToDate(value.month).toISOString(),
                forecast: value.forecast,
                budget: value.budget,
                historical: value.historical,
                calculated: value.calculated
            }))
        }));
        return {
            id: result.id,
            forecastId: result.forecastId,
            calculatedAt: result.calculatedAt,
            metrics,
            allNodes
        };
    }
    mmyyyyToDate(mmyyyy) {
        const [monthStr, yearStr] = mmyyyy.split('-');
        const month = parseInt(monthStr, 10) - 1;
        const year = parseInt(yearStr, 10);
        return new Date(year, month, 1);
    }
    async getLatestUnifiedCalculationResults(forecastId, userId, request) {
        try {
            this.logger.log(`[ForecastCalculation] [Unified] Getting latest unified calculation results for forecast ${forecastId}`);
            const forecast = await this.forecastService.findOne(forecastId, userId, request);
            if (!forecast) {
                throw new common_1.NotFoundException(`Forecast ${forecastId} not found`);
            }
            const client = this.supabaseService.getClientForRequest(request);
            const { data, error } = await client
                .from('forecast_calculation_results')
                .select()
                .eq('forecast_id', forecastId)
                .order('calculated_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (error) {
                this.logger.error(`[ForecastCalculation] [Unified] Failed to fetch unified calculation results:`, error);
                throw new common_1.InternalServerErrorException(`Failed to fetch unified calculation results: ${error.message}`);
            }
            if (!data) {
                this.logger.log(`[ForecastCalculation] [Unified] No unified calculation results found for forecast ${forecastId}`);
                return null;
            }
            const results = data.results;
            if (results && results.calculationTypes && results.periodInfo) {
                this.logger.log(`[ForecastCalculation] [Unified] Found unified calculation results for forecast ${forecastId}`);
                return this.mapUnifiedDatabaseResultToDto(data);
            }
            else {
                this.logger.log(`[ForecastCalculation] [Unified] Found legacy calculation results for forecast ${forecastId}, converting to unified format`);
                return this.convertLegacyToUnifiedDto(data, forecast);
            }
        }
        catch (error) {
            this.logger.error(`[ForecastCalculation] [Unified] Error getting unified calculation results:`, error);
            throw error;
        }
    }
    convertLegacyToUnifiedDto(dbResult, forecast) {
        const results = dbResult.results;
        const periodInfo = this.extractPeriodInfoFromForecast(forecast);
        const metrics = (results.metrics || []).map((metric) => ({
            nodeId: metric.metricNodeId,
            nodeType: 'METRIC',
            values: (metric.values || []).map((value) => ({
                month: this.dateToMMYYYY(new Date(value.date)),
                historical: value.historical,
                forecast: value.forecast,
                budget: value.budget,
                calculated: null
            }))
        }));
        const allNodes = results.allNodes?.map((node) => ({
            nodeId: node.nodeId,
            nodeType: node.nodeType,
            values: (node.values || []).map((value) => ({
                month: this.dateToMMYYYY(new Date(value.date)),
                historical: value.historical,
                forecast: value.forecast,
                budget: value.budget,
                calculated: value.calculated
            }))
        }));
        return {
            id: dbResult.id,
            forecastId: dbResult.forecast_id,
            calculatedAt: dbResult.calculated_at,
            calculationTypes: [calculation_dto_1.CalculationTypeDto.FORECAST],
            periodInfo,
            metrics,
            allNodes
        };
    }
    convertToUnifiedNodeResultDto(nodeResults) {
        return nodeResults.map(node => ({
            nodeId: node.nodeId,
            nodeType: node.nodeType,
            values: node.values.map(value => ({
                month: value.month,
                historical: value.historical,
                forecast: value.forecast,
                budget: value.budget,
                calculated: value.calculated
            }))
        }));
    }
    convertNodeToClientFormat(node) {
        return {
            id: node.id,
            type: node.kind,
            data: node.attributes,
            position: node.position || { x: 0, y: 0 }
        };
    }
    convertEdgeToClientFormat(edge) {
        return {
            id: edge.id,
            source: edge.sourceNodeId,
            target: edge.targetNodeId
        };
    }
    convertVariableToEngineFormat(variable) {
        return {
            id: variable.id,
            name: variable.name,
            type: variable.type,
            organizationId: variable.organizationId || variable.organization_id,
            timeSeries: (variable.values || []).map((v) => ({
                date: new Date(v.date),
                value: v.value
            }))
        };
    }
};
exports.ForecastCalculationService = ForecastCalculationService;
exports.ForecastCalculationService = ForecastCalculationService = ForecastCalculationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(8, (0, common_1.Inject)('USE_NEW_CALCULATION_ENGINE')),
    __metadata("design:paramtypes", [supabase_optimized_service_1.SupabaseOptimizedService,
        data_intake_service_1.DataIntakeService,
        forecast_service_1.ForecastService,
        forecast_node_service_1.ForecastNodeService,
        forecast_edge_service_1.ForecastEdgeService,
        calculation_engine_1.CalculationEngine,
        calculation_engine_core_1.CalculationEngineCore,
        calculation_adapter_1.CalculationAdapter, Boolean])
], ForecastCalculationService);
//# sourceMappingURL=forecast-calculation.service.js.map