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
var DebugCalculationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebugCalculationService = void 0;
const common_1 = require("@nestjs/common");
const forecast_calculation_service_1 = require("./forecast-calculation.service");
const debug_collector_service_1 = require("./debug-collector.service");
const calculation_dto_1 = require("../dto/calculation.dto");
let DebugCalculationService = DebugCalculationService_1 = class DebugCalculationService {
    mapCalculationType(calcType) {
        switch (calcType) {
            case 'historical':
                return calculation_dto_1.CalculationTypeDto.HISTORICAL;
            case 'forecast':
                return calculation_dto_1.CalculationTypeDto.FORECAST;
            case 'budget':
                return calculation_dto_1.CalculationTypeDto.BUDGET;
            default:
                throw new Error(`Unknown calculation type: ${calcType}`);
        }
    }
    constructor(forecastCalculationService, debugCollector) {
        this.forecastCalculationService = forecastCalculationService;
        this.debugCollector = debugCollector;
        this.logger = new common_1.Logger(DebugCalculationService_1.name);
    }
    async calculateWithDebug(forecastId, userId, request, debugRequest) {
        const startTime = Date.now();
        this.logger.log(`[DebugCalculation] Starting debug calculation for forecast ${forecastId}`);
        this.logger.log(`[DebugCalculation] Debug level: ${debugRequest.debugLevel || 'basic'}`);
        this.logger.log(`[DebugCalculation] Calculation types: [${debugRequest.calculationTypes.join(', ')}]`);
        try {
            const debugConfig = {
                level: debugRequest.debugLevel || 'basic',
                includePerformanceMetrics: debugRequest.includePerformanceMetrics ?? true,
                includeMemoryUsage: debugRequest.includeMemoryUsage ?? false,
                focusNodeIds: debugRequest.focusNodeIds,
                maxStepsToCapture: this.getMaxStepsForLevel(debugRequest.debugLevel || 'basic')
            };
            this.debugCollector.startCalculation(debugConfig);
            this.debugCollector.recordPhaseStart('validation');
            const unifiedRequest = {
                calculationTypes: debugRequest.calculationTypes,
                includeIntermediateNodes: debugRequest.includeIntermediateNodes ?? true
            };
            this.debugCollector.recordPhaseEnd('validation');
            this.debugCollector.recordPhaseStart('treeProcessing');
            const calculationTree = await this.getCalculationTreeStructure(forecastId, userId, request);
            this.debugCollector.setCalculationTree(calculationTree.trees, calculationTree.dependencyGraph);
            this.debugCollector.recordPhaseEnd('treeProcessing');
            this.debugCollector.recordPhaseStart('calculation');
            const result = await this.forecastCalculationService.calculateForecastWithPeriods(forecastId, userId, request, unifiedRequest);
            this.debugCollector.recordPhaseEnd('calculation');
            this.debugCollector.recordPhaseStart('resultBuilding');
            const debugInfo = this.debugCollector.getDebugInfo();
            this.debugCollector.recordPhaseEnd('resultBuilding');
            this.debugCollector.endCalculation();
            const debugResult = {
                ...result,
                debugInfo: {
                    calculationTree: this.mapToDebugTreeDto(debugInfo.calculationTree),
                    calculationSteps: debugInfo.calculationSteps.map(step => ({
                        nodeId: step.nodeId,
                        nodeType: step.nodeType,
                        stepNumber: step.stepNumber,
                        month: step.month,
                        calculationType: this.mapCalculationType(step.calculationType),
                        inputs: step.inputs,
                        output: step.output,
                        executionTimeMs: step.executionTimeMs,
                        dependencies: step.dependencies,
                        errorMessage: step.errorMessage,
                        nodeAttributes: step.nodeAttributes
                    })),
                    performanceMetrics: {
                        totalExecutionTimeMs: debugInfo.performanceMetrics.totalExecutionTimeMs,
                        nodeExecutionTimes: debugInfo.performanceMetrics.nodeExecutionTimes,
                        cacheHitRate: debugInfo.performanceMetrics.cacheHitRate,
                        totalCacheHits: debugInfo.performanceMetrics.totalCacheHits,
                        totalCacheMisses: debugInfo.performanceMetrics.totalCacheMisses,
                        memoryUsageMB: debugInfo.performanceMetrics.memoryUsageMB,
                        phaseTimings: debugInfo.performanceMetrics.phaseTimings
                    },
                    warnings: debugInfo.warnings,
                    errors: debugInfo.errors
                }
            };
            const totalTime = Date.now() - startTime;
            this.logger.log(`[DebugCalculation] Debug calculation completed in ${totalTime}ms`);
            this.logger.log(`[DebugCalculation] Captured ${debugInfo.calculationSteps.length} calculation steps`);
            this.logger.log(`[DebugCalculation] Cache hit rate: ${debugInfo.performanceMetrics.cacheHitRate}%`);
            return debugResult;
        }
        catch (error) {
            this.logger.error(`[DebugCalculation] Debug calculation failed:`, error);
            this.debugCollector.recordError('system', error.message);
            this.debugCollector.endCalculation();
            throw error;
        }
    }
    async getCalculationTree(forecastId, userId, request, _requestDto) {
        this.logger.log(`[DebugCalculation] Getting calculation tree for forecast ${forecastId}`);
        try {
            const treeStructure = await this.getCalculationTreeStructure(forecastId, userId, request);
            return this.mapToDebugTreeDto(treeStructure);
        }
        catch (error) {
            this.logger.error(`[DebugCalculation] Failed to get calculation tree:`, error);
            throw error;
        }
    }
    async getCalculationSteps(forecastId) {
        this.logger.log(`[DebugCalculation] Getting calculation steps for forecast ${forecastId}`);
        const debugInfo = this.debugCollector.getDebugInfo();
        return debugInfo.calculationSteps;
    }
    async getCalculationTreeStructure(forecastId, userId, request) {
        const calcTrees = await this.forecastCalculationService.loadCalculationTreesForForecast(forecastId, userId, request);
        const metricOrder = calcTrees.map((t) => t.rootMetricNodeId);
        const trees = calcTrees.map((ct) => this.debugCollector.convertTreeNodeToDebug(ct.tree));
        const dependencyGraph = this.buildDependencyGraphFromCalcTrees(calcTrees);
        let totalNodes = 0;
        const countNodes = (n) => {
            totalNodes++;
            n.children.forEach(countNodes);
        };
        calcTrees.forEach((ct) => countNodes(ct.tree));
        return {
            trees,
            executionOrder: [],
            totalNodes,
            dependencyGraph,
            metricOrder,
        };
    }
    buildDependencyGraphFromCalcTrees(calcTrees) {
        const dependencyGraph = {};
        const walk = (n) => {
            dependencyGraph[n.nodeId] = n.children.map((c) => c.nodeId);
            n.children.forEach(walk);
        };
        calcTrees.forEach((ct) => walk(ct.tree));
        return dependencyGraph;
    }
    mapToDebugTreeDto(tree) {
        return {
            trees: tree.trees.map(node => this.mapDebugTreeNodeToDto(node)),
            executionOrder: tree.executionOrder,
            totalNodes: tree.totalNodes,
            dependencyGraph: tree.dependencyGraph,
            metricOrder: tree.metricOrder
        };
    }
    mapDebugTreeNodeToDto(node) {
        return {
            nodeId: node.nodeId,
            nodeType: node.nodeType,
            nodeData: node.nodeData,
            children: node.children.map((child) => this.mapDebugTreeNodeToDto(child)),
            inputOrder: node.inputOrder,
            position: node.position,
            label: node.label,
            isReference: node.isReference
        };
    }
    getMaxStepsForLevel(level) {
        switch (level) {
            case 'basic':
                return 100;
            case 'detailed':
                return 1000;
            case 'verbose':
                return 10000;
            default:
                return 100;
        }
    }
};
exports.DebugCalculationService = DebugCalculationService;
exports.DebugCalculationService = DebugCalculationService = DebugCalculationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [forecast_calculation_service_1.ForecastCalculationService,
        debug_collector_service_1.DebugCollectorService])
], DebugCalculationService);
//# sourceMappingURL=debug-calculation.service.js.map