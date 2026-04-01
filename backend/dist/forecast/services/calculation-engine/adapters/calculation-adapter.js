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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalculationAdapter = void 0;
const common_1 = require("@nestjs/common");
const calculation_engine_core_1 = require("../calculation-engine-core");
let CalculationAdapter = class CalculationAdapter {
    constructor(newEngine) {
        this.newEngine = newEngine;
    }
    async calculateForecast(trees, forecastStartDate, forecastEndDate, variables) {
        const request = this.adaptLegacyForecastRequest(trees, forecastStartDate, forecastEndDate, variables);
        const result = await this.newEngine.calculate(request);
        return this.adaptToLegacyForecastResult(result);
    }
    async calculateForecastExtended(trees, forecastStartDate, forecastEndDate, variables) {
        const request = this.adaptLegacyForecastRequest(trees, forecastStartDate, forecastEndDate, variables, true);
        const result = await this.newEngine.calculate(request);
        return this.adaptToExtendedForecastResult(result);
    }
    async calculateHistoricalValues(trees, actualStartDate, actualEndDate, variables) {
        const request = this.adaptLegacyHistoricalRequest(trees, actualStartDate, actualEndDate, variables);
        const result = await this.newEngine.calculate(request);
        return this.adaptToExtendedForecastResult(result);
    }
    async calculateWithPeriods(trees, forecastStartMonth, forecastEndMonth, actualStartMonth, actualEndMonth, variables, request) {
        const unifiedRequest = this.adaptUnifiedRequest(trees, forecastStartMonth, forecastEndMonth, actualStartMonth, actualEndMonth, variables, request);
        const result = await this.newEngine.calculate(unifiedRequest);
        return this.adaptToUnifiedResult(result);
    }
    adaptLegacyForecastRequest(trees, forecastStartDate, forecastEndDate, variables, includeAllNodes = false) {
        return {
            trees: this.convertLegacyTrees(trees),
            periods: {
                forecast: {
                    start: this.dateToMMYYYY(forecastStartDate),
                    end: this.dateToMMYYYY(forecastEndDate)
                },
                actual: {
                    start: this.dateToMMYYYY(this.subtractMonths(forecastStartDate, 6)),
                    end: this.dateToMMYYYY(this.subtractMonths(forecastStartDate, 1))
                }
            },
            calculationTypes: ['forecast'],
            includeAllNodes,
            variables: [...variables]
        };
    }
    adaptLegacyHistoricalRequest(trees, actualStartDate, actualEndDate, variables) {
        return {
            trees: this.convertLegacyTrees(trees),
            periods: {
                forecast: {
                    start: this.dateToMMYYYY(this.addMonths(actualEndDate, 1)),
                    end: this.dateToMMYYYY(this.addMonths(actualEndDate, 12))
                },
                actual: {
                    start: this.dateToMMYYYY(actualStartDate),
                    end: this.dateToMMYYYY(actualEndDate)
                }
            },
            calculationTypes: ['historical'],
            includeAllNodes: true,
            variables: [...variables]
        };
    }
    adaptUnifiedRequest(trees, forecastStartMonth, forecastEndMonth, actualStartMonth, actualEndMonth, variables, request) {
        return {
            trees: this.convertLegacyTrees(trees),
            periods: {
                forecast: {
                    start: forecastStartMonth,
                    end: forecastEndMonth
                },
                actual: {
                    start: actualStartMonth,
                    end: actualEndMonth
                }
            },
            calculationTypes: request.calculationTypes,
            includeAllNodes: request.includeIntermediateNodes,
            variables: [...variables]
        };
    }
    convertLegacyTrees(trees) {
        return trees.map(tree => ({
            rootMetricNodeId: tree.rootMetricNodeId,
            tree: tree.tree
        }));
    }
    adaptToLegacyForecastResult(result) {
        return {
            forecastId: result.forecastId,
            calculatedAt: result.calculatedAt,
            metrics: this.convertToLegacyMetrics(result.nodeResults.filter(n => n.nodeType === 'METRIC'))
        };
    }
    adaptToExtendedForecastResult(result) {
        const metrics = this.convertToLegacyMetrics(result.nodeResults.filter(n => n.nodeType === 'METRIC'));
        const allNodes = this.convertToLegacyNodes(result.nodeResults);
        return {
            forecastId: result.forecastId,
            calculatedAt: result.calculatedAt,
            metrics,
            allNodes
        };
    }
    adaptToUnifiedResult(result) {
        return {
            forecastId: result.forecastId,
            calculatedAt: result.calculatedAt,
            calculationTypes: result.calculationTypes,
            periodInfo: result.periodInfo,
            metrics: this.convertToUnifiedNodes(result.nodeResults.filter(n => n.nodeType === 'METRIC')),
            allNodes: this.convertToUnifiedNodes(result.nodeResults)
        };
    }
    convertToLegacyMetrics(nodeResults) {
        return nodeResults.map(node => ({
            metricNodeId: node.nodeId,
            values: node.values.map(value => ({
                date: this.mmyyyyToDate(value.month),
                forecast: value.forecast,
                budget: value.budget,
                historical: value.historical
            }))
        }));
    }
    convertToLegacyNodes(nodeResults) {
        return nodeResults.map(node => ({
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
        }));
    }
    convertToUnifiedNodes(nodeResults) {
        return nodeResults.map(node => ({
            nodeId: node.nodeId,
            nodeType: node.nodeType,
            nodeData: node.nodeData,
            values: node.values.map(value => ({
                month: value.month,
                historical: value.historical,
                forecast: value.forecast,
                budget: value.budget,
                calculated: value.calculated
            }))
        }));
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
    addMonths(date, months) {
        const result = new Date(date);
        result.setMonth(result.getMonth() + months);
        return result;
    }
    subtractMonths(date, months) {
        return this.addMonths(date, -months);
    }
};
exports.CalculationAdapter = CalculationAdapter;
exports.CalculationAdapter = CalculationAdapter = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [calculation_engine_core_1.CalculationEngineCore])
], CalculationAdapter);
//# sourceMappingURL=calculation-adapter.js.map