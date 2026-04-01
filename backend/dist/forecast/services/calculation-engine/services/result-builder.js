"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultBuilder = void 0;
const common_1 = require("@nestjs/common");
let ResultBuilder = class ResultBuilder {
    build(nodeResults, request) {
        const allNodes = Array.from(nodeResults.values());
        const { metrics, intermediateNodes } = this.separateNodeTypes(allNodes);
        return {
            forecastId: '',
            calculatedAt: new Date(),
            calculationTypes: request.calculationTypes,
            periodInfo: this.buildPeriodInfo(request.periods),
            nodeResults: request.includeAllNodes ? allNodes : metrics
        };
    }
    separateNodeTypes(nodes) {
        const metrics = nodes.filter(n => n.nodeType === 'METRIC');
        const intermediateNodes = nodes.filter(n => n.nodeType !== 'METRIC');
        return { metrics, intermediateNodes };
    }
    buildPeriodInfo(periods) {
        return {
            forecastStartMonth: periods.forecast.start,
            forecastEndMonth: periods.forecast.end,
            actualStartMonth: periods.actual.start,
            actualEndMonth: periods.actual.end
        };
    }
    filterMetrics(nodeResults, metricNodeIds) {
        return nodeResults.filter(result => result.nodeType === 'METRIC' && metricNodeIds.includes(result.nodeId));
    }
    getResultSummary(result) {
        const metrics = result.nodeResults.filter(n => n.nodeType === 'METRIC');
        const intermediateNodes = result.nodeResults.filter(n => n.nodeType !== 'METRIC');
        const monthCount = result.nodeResults.length > 0 ? result.nodeResults[0].values.length : 0;
        return {
            totalNodes: result.nodeResults.length,
            metricCount: metrics.length,
            intermediateNodeCount: intermediateNodes.length,
            monthCount,
            calculationTypes: result.calculationTypes
        };
    }
    validateResult(result) {
        const errors = [];
        if (!result.nodeResults || !Array.isArray(result.nodeResults)) {
            errors.push('Missing or invalid nodeResults array');
            return { isValid: false, errors };
        }
        if (!result.calculationTypes || !Array.isArray(result.calculationTypes)) {
            errors.push('Missing or invalid calculationTypes array');
        }
        if (!result.periodInfo) {
            errors.push('Missing periodInfo');
        }
        for (const nodeResult of result.nodeResults) {
            const nodeErrors = this.validateNodeResult(nodeResult);
            errors.push(...nodeErrors);
        }
        const monthCounts = result.nodeResults.map(n => n.values.length);
        const uniqueMonthCounts = [...new Set(monthCounts)];
        if (uniqueMonthCounts.length > 1) {
            errors.push(`Inconsistent month counts across nodes: ${uniqueMonthCounts.join(', ')}`);
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    validateNodeResult(nodeResult) {
        const errors = [];
        if (!nodeResult.nodeId) {
            errors.push('NodeResult missing nodeId');
        }
        if (!nodeResult.nodeType) {
            errors.push(`NodeResult ${nodeResult.nodeId} missing nodeType`);
        }
        if (!nodeResult.values || !Array.isArray(nodeResult.values)) {
            errors.push(`NodeResult ${nodeResult.nodeId} missing or invalid values array`);
            return errors;
        }
        for (let i = 0; i < nodeResult.values.length; i++) {
            const monthlyValue = nodeResult.values[i];
            if (!monthlyValue.month) {
                errors.push(`NodeResult ${nodeResult.nodeId} value at index ${i} missing month`);
            }
            if (monthlyValue.month && !/^(0[1-9]|1[0-2])-\d{4}$/.test(monthlyValue.month)) {
                errors.push(`NodeResult ${nodeResult.nodeId} value at index ${i} has invalid month format: ${monthlyValue.month}`);
            }
        }
        return errors;
    }
    mergeResults(results) {
        if (results.length === 0) {
            throw new Error('Cannot merge empty results array');
        }
        if (results.length === 1) {
            return results[0];
        }
        const baseResult = results[0];
        const allNodeResults = new Map();
        for (const result of results) {
            for (const nodeResult of result.nodeResults) {
                allNodeResults.set(nodeResult.nodeId, nodeResult);
            }
        }
        const allCalculationTypes = [...new Set(results.flatMap(r => r.calculationTypes))];
        return {
            forecastId: baseResult.forecastId,
            calculatedAt: new Date(),
            calculationTypes: allCalculationTypes,
            periodInfo: baseResult.periodInfo,
            nodeResults: Array.from(allNodeResults.values())
        };
    }
};
exports.ResultBuilder = ResultBuilder;
exports.ResultBuilder = ResultBuilder = __decorate([
    (0, common_1.Injectable)()
], ResultBuilder);
//# sourceMappingURL=result-builder.js.map