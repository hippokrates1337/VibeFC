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
exports.CalculationEngine = void 0;
const common_1 = require("@nestjs/common");
const calculation_engine_core_1 = require("./calculation-engine-core");
const calculation_adapter_1 = require("./adapters/calculation-adapter");
let CalculationEngine = class CalculationEngine {
    constructor(coreEngine, adapter, useNewEngine = true) {
        this.coreEngine = coreEngine;
        this.adapter = adapter;
        this.useNewEngine = useNewEngine;
        this.logger = console;
        this.logger.log(`[CalculationEngine] Initialized with ${useNewEngine ? 'NEW REFACTORED' : 'LEGACY ADAPTER'} implementation`);
    }
    async calculateForecast(trees, forecastStartDate, forecastEndDate, variables) {
        this.logger.log('[CalculationEngine] calculateForecast called - routing to unified implementation');
        if (this.useNewEngine && this.adapter) {
            return await this.adapter.calculateForecast(trees, forecastStartDate, forecastEndDate, variables);
        }
        else {
            throw new Error('Calculation engine not properly configured - ensure dependencies are injected');
        }
    }
    async calculateForecastExtended(trees, forecastStartDate, forecastEndDate, variables) {
        this.logger.log('[CalculationEngine] calculateForecastExtended called - routing to unified implementation');
        if (this.useNewEngine && this.adapter) {
            return await this.adapter.calculateForecastExtended(trees, forecastStartDate, forecastEndDate, variables);
        }
        else {
            throw new Error('Calculation engine not properly configured - ensure dependencies are injected');
        }
    }
    async calculateHistoricalValues(trees, actualStartDate, actualEndDate, variables) {
        this.logger.log('[CalculationEngine] calculateHistoricalValues called - routing to unified implementation');
        if (this.useNewEngine && this.adapter) {
            return await this.adapter.calculateHistoricalValues(trees, actualStartDate, actualEndDate, variables);
        }
        else {
            throw new Error('Calculation engine not properly configured - ensure dependencies are injected');
        }
    }
    async calculateWithPeriods(trees, forecastStartMonth, forecastEndMonth, actualStartMonth, actualEndMonth, variables, request) {
        this.logger.log('[CalculationEngine] calculateWithPeriods called - using refactored implementation');
        if (this.useNewEngine && this.adapter) {
            return await this.adapter.calculateWithPeriods(trees, forecastStartMonth, forecastEndMonth, actualStartMonth, actualEndMonth, variables, request);
        }
        else {
            throw new Error('Calculation engine not properly configured - ensure dependencies are injected');
        }
    }
    async calculateComprehensive(trees, forecastStartDate, forecastEndDate, actualStartDate, actualEndDate, variables) {
        this.logger.log('[CalculationEngine] calculateComprehensive called - routing through adapter');
        if (this.useNewEngine && this.adapter) {
            const forecastStartMonth = this.dateToMMYYYY(forecastStartDate);
            const forecastEndMonth = this.dateToMMYYYY(forecastEndDate);
            const actualStartMonth = this.dateToMMYYYY(actualStartDate);
            const actualEndMonth = this.dateToMMYYYY(actualEndDate);
            const calculationRequest = {
                calculationTypes: ['historical', 'forecast', 'budget'],
                includeIntermediateNodes: true
            };
            const result = await this.adapter.calculateWithPeriods(trees, forecastStartMonth, forecastEndMonth, actualStartMonth, actualEndMonth, variables, calculationRequest);
            return {
                forecastId: result.forecastId,
                calculatedAt: new Date(result.calculatedAt),
                metrics: result.metrics.map(metric => ({
                    metricNodeId: metric.nodeId,
                    values: metric.values.map(value => ({
                        date: this.mmyyyyToDate(value.month),
                        forecast: value.forecast,
                        budget: value.budget,
                        historical: value.historical
                    }))
                })),
                allNodes: result.allNodes.map(node => ({
                    nodeId: node.nodeId,
                    nodeType: node.nodeType,
                    nodeData: node.nodeData,
                    values: node.values.map(value => ({
                        date: this.mmyyyyToDate(value.month),
                        forecast: value.forecast,
                        budget: value.budget,
                        historical: value.historical,
                        calculated: value.calculated
                    }))
                }))
            };
        }
        else {
            throw new Error('Calculation engine not properly configured - ensure dependencies are injected');
        }
    }
    getStats() {
        return this.coreEngine?.getStats() || {
            supportedCalculationTypes: ['historical', 'forecast', 'budget'],
            supportedNodeTypes: ['DATA', 'CONSTANT', 'OPERATOR', 'METRIC', 'SEED'],
            cacheStats: { size: 0 }
        };
    }
    clearCaches() {
        this.coreEngine?.clearCaches();
    }
    async validateRequest(request) {
        return await this.coreEngine?.validateRequest(request) || { isValid: true, errors: [], warnings: [] };
    }
    async dryRun(request) {
        return await this.coreEngine?.dryRun(request) || { isValid: true, errors: [], warnings: [], estimatedNodes: 0, estimatedMonths: 0 };
    }
    dateToMMYYYY(date) {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}-${year}`;
    }
    mmyyyyToDate(mmyyyy) {
        const [month, year] = mmyyyy.split('-').map(Number);
        return new Date(year, month - 1, 1);
    }
};
exports.CalculationEngine = CalculationEngine;
exports.CalculationEngine = CalculationEngine = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)('USE_NEW_CALCULATION_ENGINE')),
    __metadata("design:paramtypes", [calculation_engine_core_1.CalculationEngineCore,
        calculation_adapter_1.CalculationAdapter, Boolean])
], CalculationEngine);
//# sourceMappingURL=calculation-engine.js.map