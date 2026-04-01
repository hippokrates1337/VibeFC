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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalculationEngineCore = void 0;
const common_1 = require("@nestjs/common");
const calculation_types_1 = require("./types/calculation-types");
const node_evaluator_1 = require("./services/node-evaluator");
const tree_processor_1 = require("./services/tree-processor");
const result_builder_1 = require("./services/result-builder");
const calculation_validator_1 = require("./services/calculation-validator");
const period_service_1 = require("./services/period-service");
const calculation_cache_1 = require("./services/calculation-cache");
const debug_collector_service_1 = require("../debug-collector.service");
let CalculationEngineCore = class CalculationEngineCore {
    constructor(nodeEvaluator, treeProcessor, resultBuilder, validator, periodService, cache, logger, debugCollector) {
        this.nodeEvaluator = nodeEvaluator;
        this.treeProcessor = treeProcessor;
        this.resultBuilder = resultBuilder;
        this.validator = validator;
        this.periodService = periodService;
        this.cache = cache;
        this.logger = logger;
        this.debugCollector = debugCollector;
        this.logger.log('[CalculationEngineCore] Initialized with all dependencies');
        this.logger.log('[CalculationEngineCore] Debug collector wired (steps recorded when debug run initializes collector)');
    }
    async calculate(request) {
        const startTime = Date.now();
        try {
            this.logger.log('[CalculationEngineCore] Starting comprehensive calculation');
            this.logger.log(`[CalculationEngineCore] Calculation types: [${request.calculationTypes.join(', ')}]`);
            this.logger.log(`[CalculationEngineCore] Include all nodes: ${request.includeAllNodes}`);
            this.logger.log(`[CalculationEngineCore] Processing ${request.trees.length} calculation trees`);
            this.logger.log(`[CalculationEngineCore] Request structure:`, JSON.stringify({
                calculationTypes: request.calculationTypes,
                includeAllNodes: request.includeAllNodes,
                treesCount: request.trees.length,
                periods: request.periods,
                variablesCount: request.variables.length
            }, null, 2));
            if (this.debugCollector.isDebugSessionActive()) {
                this.debugCollector.recordPhaseStart('validation');
            }
            const validation = await this.validator.validate(request);
            if (!validation.isValid) {
                this.logger.error('[CalculationEngineCore] Validation errors:', validation.errors);
                if (this.debugCollector.isDebugSessionActive()) {
                    validation.errors.forEach(error => this.debugCollector.recordError('validation', error));
                }
                throw new calculation_types_1.ValidationError('Request validation failed', validation.errors);
            }
            if (validation.warnings.length > 0) {
                this.logger.warn('[CalculationEngineCore] Validation warnings:', validation.warnings);
                if (this.debugCollector.isDebugSessionActive()) {
                    validation.warnings.forEach(warning => this.debugCollector.recordWarning(warning));
                }
            }
            if (this.debugCollector.isDebugSessionActive()) {
                this.debugCollector.recordPhaseEnd('validation');
                this.debugCollector.recordPhaseStart('treeProcessing');
            }
            const orderedTrees = this.treeProcessor.orderByDependencies(request.trees);
            const periods = this.periodService.processPeriods(request.periods);
            this.logger.log(`[CalculationEngineCore] Tree processing order: [${orderedTrees.map(t => t.rootMetricNodeId).join(', ')}]`);
            this.logger.log(`[CalculationEngineCore] Forecast months: [${periods.forecastMonths.join(', ')}]`);
            this.logger.log(`[CalculationEngineCore] Actual months: [${periods.actualMonths.join(', ')}]`);
            this.logger.log(`[CalculationEngineCore] All calculation months: [${periods.allMonths.join(', ')}]`);
            if (this.debugCollector.isDebugSessionActive()) {
                this.debugCollector.recordPhaseEnd('treeProcessing');
                this.debugCollector.recordPhaseStart('calculation');
            }
            const context = this.createContext(request, periods);
            const nodeResults = await this.calculateAllNodes(orderedTrees, context);
            if (this.debugCollector.isDebugSessionActive()) {
                this.debugCollector.recordPhaseEnd('calculation');
                this.debugCollector.recordPhaseStart('resultBuilding');
            }
            const result = this.resultBuilder.build(nodeResults, request);
            result.forecastId = '';
            if (this.debugCollector.isDebugSessionActive()) {
                this.debugCollector.recordPhaseEnd('resultBuilding');
            }
            const duration = Date.now() - startTime;
            this.logger.log(`[CalculationEngineCore] Comprehensive calculation completed in ${duration}ms`);
            this.logger.log(`[CalculationEngineCore] Calculated ${nodeResults.size} nodes with ${result.nodeResults.length} results`);
            const resultValidation = this.resultBuilder.validateResult(result);
            if (!resultValidation.isValid) {
                this.logger.error('[CalculationEngineCore] Result validation failed:', resultValidation.errors);
                throw new calculation_types_1.CalculationError('Result validation failed', resultValidation.errors);
            }
            return result;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error(`[CalculationEngineCore] Calculation failed after ${duration}ms:`, error);
            if (error instanceof calculation_types_1.ValidationError || error instanceof calculation_types_1.CalculationError) {
                throw error;
            }
            throw new calculation_types_1.CalculationError(`Comprehensive calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, [], undefined, undefined);
        }
    }
    async calculateAllNodes(trees, context) {
        const results = new Map();
        for (let i = 0; i < trees.length; i++) {
            const tree = trees[i];
            this.logger.log(`[CalculationEngineCore] Processing tree ${i + 1}/${trees.length} (metric: ${tree.rootMetricNodeId})`);
            if (this.debugCollector.isDebugSessionActive()) {
                this.debugCollector.startTree(tree.rootMetricNodeId);
            }
            await this.calculateTree(tree, context, results);
            if (this.debugCollector.isDebugSessionActive()) {
                this.debugCollector.endTree(tree.rootMetricNodeId);
            }
        }
        return results;
    }
    async calculateTree(tree, context, results) {
        const nodes = this.treeProcessor.flattenToNodes(tree);
        this.logger.log(`[CalculationEngineCore] Tree ${tree.rootMetricNodeId} has ${nodes.length} nodes to calculate`);
        for (const node of nodes) {
            if (!results.has(node.nodeId)) {
                if (this.debugCollector.isDebugSessionActive()) {
                    this.debugCollector.startNode(node.nodeId, node.nodeType);
                }
                const nodeResult = await this.calculateNode(node, context);
                results.set(node.nodeId, nodeResult);
                context.nodeResults.set(node.nodeId, nodeResult);
            }
        }
        const materializeOrder = this.treeProcessor.flattenForIntermediateResults(tree);
        for (const node of materializeOrder) {
            if (!results.has(node.nodeId)) {
                if (this.debugCollector.isDebugSessionActive()) {
                    this.debugCollector.startNode(node.nodeId, node.nodeType);
                }
                const nodeResult = await this.calculateNode(node, context);
                results.set(node.nodeId, nodeResult);
                context.nodeResults.set(node.nodeId, nodeResult);
            }
        }
    }
    async calculateNode(node, context) {
        const nodeStartTime = Date.now();
        this.logger.log(`[CalculationEngineCore] Calculating node ${node.nodeId} (${node.nodeType})`);
        const values = [];
        let stepCounter = 0;
        for (const month of context.periods.allMonths) {
            let forecastEvalError;
            let forecastComputedValue;
            const monthlyValue = {
                month,
                historical: null,
                forecast: null,
                budget: null,
                calculated: null
            };
            for (const calcType of context.request.calculationTypes) {
                if (this.shouldCalculateForMonth(month, calcType, context)) {
                    const evaluationStartTime = Date.now();
                    let value = null;
                    let errorMessage;
                    try {
                        value = await this.nodeEvaluator.evaluate(node, month, calcType, context);
                    }
                    catch (error) {
                        errorMessage = error instanceof Error ? error.message : 'Unknown evaluation error';
                        if (calcType === 'forecast') {
                            forecastEvalError = errorMessage;
                        }
                        this.logger.error(`[CalculationEngineCore] Node ${node.nodeId} evaluation failed for ${month} ${calcType}:`, error);
                        if (this.debugCollector.isDebugSessionActive()) {
                            this.debugCollector.recordError(node.nodeId, errorMessage);
                        }
                    }
                    const evaluationEndTime = Date.now();
                    if (this.debugCollector.isDebugSessionActive()) {
                        this.debugCollector.recordStep({
                            nodeId: node.nodeId,
                            nodeType: node.nodeType,
                            stepNumber: ++stepCounter,
                            month,
                            calculationType: calcType,
                            inputs: this.getNodeInputs(node, month, calcType, context),
                            output: value,
                            executionTimeMs: evaluationEndTime - evaluationStartTime,
                            dependencies: this.getNodeDependencies(node),
                            errorMessage,
                            nodeAttributes: node.nodeData,
                            timestamp: new Date()
                        });
                    }
                    switch (calcType) {
                        case 'historical':
                            monthlyValue.historical = value;
                            break;
                        case 'forecast':
                            monthlyValue.forecast = value;
                            forecastComputedValue = value;
                            if (node.nodeType === 'METRIC') {
                                let perMonth = context.runningMetricForecasts.get(node.nodeId);
                                if (!perMonth) {
                                    perMonth = new Map();
                                    context.runningMetricForecasts.set(node.nodeId, perMonth);
                                }
                                perMonth.set(month, value);
                            }
                            break;
                        case 'budget':
                            monthlyValue.budget = value;
                            break;
                    }
                }
            }
            if (node.nodeType !== 'METRIC') {
                monthlyValue.calculated =
                    monthlyValue.forecast ?? monthlyValue.historical ?? monthlyValue.budget;
            }
            values.push(monthlyValue);
        }
        const nodeResult = {
            nodeId: node.nodeId,
            nodeType: node.nodeType,
            nodeData: node.nodeData,
            values
        };
        const nodeEndTime = Date.now();
        const nodeExecutionTime = nodeEndTime - nodeStartTime;
        if (this.debugCollector.isDebugSessionActive()) {
            const executionInfo = {
                nodeId: node.nodeId,
                startTime: nodeStartTime,
                endTime: nodeEndTime,
                inputs: [],
                output: values.length > 0 ? values[0].calculated : null,
                cacheHit: false,
                errorMessage: undefined
            };
            this.debugCollector.endNode(node.nodeId, executionInfo);
        }
        this.logger.log(`[CalculationEngineCore] Node ${node.nodeId} calculated with ${values.length} monthly values in ${nodeExecutionTime}ms`);
        return nodeResult;
    }
    shouldCalculateForMonth(month, calculationType, context) {
        switch (calculationType) {
            case 'forecast':
                return context.periods.forecastMonths.includes(month);
            case 'historical':
                return context.periods.actualMonths.includes(month);
            case 'budget':
                return context.periods.forecastMonths.includes(month);
            default:
                return false;
        }
    }
    createContext(request, periods) {
        this.cache.clear();
        return {
            variables: request.variables,
            periods,
            cache: this.cache,
            nodeResults: new Map(),
            request,
            logger: this.logger,
            runningMetricForecasts: new Map()
        };
    }
    getStats() {
        return {
            supportedCalculationTypes: ['historical', 'forecast', 'budget'],
            supportedNodeTypes: this.nodeEvaluator.getSupportedNodeTypes(),
            cacheStats: this.cache.getStats()
        };
    }
    clearCaches() {
        this.logger.log('[CalculationEngineCore] Clearing all caches');
        this.cache.clear();
        this.nodeEvaluator.clearCaches();
    }
    getNodeInputs(node, month, calculationType, context) {
        const inputs = [];
        try {
            if (node.nodeType === 'OPERATOR' && node.children) {
                for (const child of node.children) {
                    const childResult = context.nodeResults.get(child.nodeId);
                    if (childResult) {
                        const monthlyValue = childResult.values.find(v => v.month === month);
                        if (monthlyValue) {
                            const value = this.getValueByCalculationType(monthlyValue, calculationType);
                            inputs.push({ nodeId: child.nodeId, value });
                        }
                    }
                }
            }
            if (node.nodeType === 'DATA') {
                const nodeData = node.nodeData;
                inputs.push({
                    variableId: nodeData?.variableId,
                    offsetMonths: nodeData?.offsetMonths || 0,
                    targetMonth: month
                });
            }
            if (node.nodeType === 'CONSTANT') {
                const nodeData = node.nodeData;
                inputs.push({ value: nodeData?.value });
            }
            if (node.nodeType === 'SEED') {
                const nodeData = node.nodeData;
                inputs.push({
                    sourceMetricId: nodeData?.sourceMetricId,
                    month,
                    calculationType
                });
            }
        }
        catch (error) {
            this.logger.warn(`[CalculationEngineCore] Could not get inputs for node ${node.nodeId}:`, error);
        }
        return inputs;
    }
    getNodeDependencies(node) {
        const dependencies = [];
        if (node.children) {
            dependencies.push(...node.children.map(child => child.nodeId));
        }
        if (node.nodeType === 'SEED') {
            const nodeData = node.nodeData;
            if (nodeData?.sourceMetricId) {
                dependencies.push(nodeData.sourceMetricId);
            }
        }
        return dependencies;
    }
    getValueByCalculationType(monthlyValue, calculationType) {
        switch (calculationType) {
            case 'historical':
                return monthlyValue.historical;
            case 'forecast':
                return monthlyValue.forecast;
            case 'budget':
                return monthlyValue.budget;
            default:
                return monthlyValue.calculated;
        }
    }
    async validateRequest(request) {
        return await this.validator.validate(request);
    }
    async dryRun(request) {
        const validation = await this.validator.validate(request);
        if (!validation.isValid) {
            return {
                ...validation,
                estimatedNodes: 0,
                estimatedMonths: 0
            };
        }
        const periods = this.periodService.processPeriods(request.periods);
        const allNodes = this.treeProcessor.flattenAllTrees(request.trees);
        return {
            ...validation,
            estimatedNodes: allNodes.length,
            estimatedMonths: periods.allMonths.length
        };
    }
};
exports.CalculationEngineCore = CalculationEngineCore;
exports.CalculationEngineCore = CalculationEngineCore = __decorate([
    (0, common_1.Injectable)(),
    __param(6, (0, common_1.Inject)('Logger')),
    __metadata("design:paramtypes", [node_evaluator_1.NodeEvaluator,
        tree_processor_1.TreeProcessor,
        result_builder_1.ResultBuilder,
        calculation_validator_1.CalculationValidator,
        period_service_1.PeriodService,
        calculation_cache_1.CalculationCacheService, Object, debug_collector_service_1.DebugCollectorService])
], CalculationEngineCore);
//# sourceMappingURL=calculation-engine-core.js.map