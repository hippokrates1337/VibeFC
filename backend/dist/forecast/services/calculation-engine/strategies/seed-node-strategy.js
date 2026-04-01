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
exports.SeedNodeStrategy = void 0;
const common_1 = require("@nestjs/common");
const period_service_1 = require("../services/period-service");
const variable_data_service_1 = require("../variable-data-service");
let SeedNodeStrategy = class SeedNodeStrategy {
    constructor(periodService, variableDataService) {
        this.periodService = periodService;
        this.variableDataService = variableDataService;
    }
    getNodeType() {
        return 'SEED';
    }
    async evaluate(node, month, calculationType, context) {
        const attributes = node.nodeData;
        if (!attributes || !attributes.sourceMetricId) {
            context.logger.error(`[SeedNodeStrategy] Missing sourceMetricId for SEED node ${node.nodeId}`);
            return null;
        }
        const cacheKey = context.cache.generateKey(node.nodeId, month, calculationType);
        const cachedValue = context.cache.get(cacheKey);
        if (cachedValue !== undefined) {
            context.logger.log(`[SeedNodeStrategy] Cache hit for SEED node ${node.nodeId}, month ${month}, type ${calculationType}: ${cachedValue}`);
            return cachedValue;
        }
        try {
            context.logger.log(`[SeedNodeStrategy] Evaluating SEED node ${node.nodeId} for month ${month}, type: ${calculationType}, sourceMetric: ${attributes.sourceMetricId}`);
            let result = null;
            const isForecastOnActualOnlyMonth = calculationType === 'forecast' &&
                context.periods.actualMonths.includes(month) &&
                !context.periods.forecastMonths.includes(month);
            if (isForecastOnActualOnlyMonth) {
                result = await this.getSameMonthHistoricalValueFromSourceMetric(attributes.sourceMetricId, month, context);
                context.logger.log(`[SeedNodeStrategy] SEED node ${node.nodeId} (${calculationType}) result: ${result} for month ${month} (forecast on actual-only month: same-month historical)`);
            }
            else {
                const isFirstMonth = this.isFirstMonthInPeriod(month, calculationType, context);
                if (isFirstMonth) {
                    result = await this.getHistoricalValueFromSourceMetric(attributes.sourceMetricId, month, context);
                }
                else {
                    const previousMonth = this.periodService.subtractMonths(month, 1);
                    result = await this.getPreviousMonthValueFromSourceMetric(attributes.sourceMetricId, previousMonth, calculationType, context);
                }
                context.logger.log(`[SeedNodeStrategy] SEED node ${node.nodeId} (${calculationType}) result: ${result} for month ${month} (first month: ${isFirstMonth})`);
            }
            context.cache.set(cacheKey, result);
            return result;
        }
        catch (error) {
            context.logger.error(`[SeedNodeStrategy] Error evaluating SEED node ${node.nodeId}:`, error);
            const result = null;
            context.cache.set(cacheKey, result);
            return result;
        }
    }
    validateNode(node) {
        const errors = [];
        if (node.nodeType !== 'SEED') {
            errors.push(`Expected SEED node, got ${node.nodeType}`);
        }
        const attributes = node.nodeData;
        if (!attributes) {
            errors.push('Missing node attributes');
            return { isValid: false, errors };
        }
        if (!attributes.sourceMetricId) {
            errors.push('SEED node must have sourceMetricId');
        }
        if (node.children && node.children.length > 0) {
            errors.push('SEED nodes should not have children');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    isFirstMonthInPeriod(month, calculationType, context) {
        switch (calculationType) {
            case 'forecast':
                return context.periods.forecastMonths[0] === month;
            case 'historical':
                return context.periods.actualMonths[0] === month;
            case 'budget':
                return context.periods.forecastMonths[0] === month;
            default:
                return false;
        }
    }
    async getSameMonthHistoricalValueFromSourceMetric(sourceMetricId, month, context) {
        context.logger.log(`[SeedNodeStrategy] Same-month historical from metric ${sourceMetricId} for ${month} (forecast on actual-only month)`);
        const sourceMetricNode = this.findSourceMetricNode(sourceMetricId, context);
        if (sourceMetricNode) {
            const metricAttributes = sourceMetricNode.nodeData;
            if (metricAttributes?.historicalVariableId) {
                const targetDate = this.periodService.mmyyyyToFirstOfMonth(month);
                const historicalValue = await this.variableDataService.getVariableValue(metricAttributes.historicalVariableId, targetDate, context.variables);
                if (historicalValue !== null) {
                    context.logger.log(`[SeedNodeStrategy] Found historical value ${historicalValue} for month ${month} (same-month)`);
                    return historicalValue;
                }
                context.logger.log(`[SeedNodeStrategy] historicalVariableId ${metricAttributes.historicalVariableId} returned null for month ${month} (same-month)`);
            }
            else {
                context.logger.warn(`[SeedNodeStrategy] Source metric ${sourceMetricId} has no historicalVariableId`);
            }
        }
        else {
            context.logger.warn(`[SeedNodeStrategy] Could not find source metric node ${sourceMetricId} in calculation trees`);
        }
        const sourceNodeResult = context.nodeResults.get(sourceMetricId);
        if (sourceNodeResult) {
            const monthlyValue = sourceNodeResult.values.find((v) => v.month === month);
            if (monthlyValue && monthlyValue.historical !== null) {
                context.logger.log(`[SeedNodeStrategy] Fallback: calculated historical ${monthlyValue.historical} for ${month}`);
                return monthlyValue.historical;
            }
        }
        context.logger.warn(`[SeedNodeStrategy] No same-month historical data for source metric ${sourceMetricId} at ${month}`);
        return null;
    }
    async getHistoricalValueFromSourceMetric(sourceMetricId, currentMonth, context) {
        const previousMonth = this.periodService.subtractMonths(currentMonth, 1);
        context.logger.log(`[SeedNodeStrategy] Looking for historical value from metric ${sourceMetricId} for month ${previousMonth} (t-1 from ${currentMonth})`);
        const sourceMetricNode = this.findSourceMetricNode(sourceMetricId, context);
        if (sourceMetricNode) {
            const metricAttributes = sourceMetricNode.nodeData;
            if (metricAttributes && metricAttributes.historicalVariableId) {
                context.logger.log(`[SeedNodeStrategy] Using historicalVariableId ${metricAttributes.historicalVariableId} from source metric ${sourceMetricId}`);
                const targetDate = this.periodService.mmyyyyToFirstOfMonth(previousMonth);
                const historicalValue = await this.variableDataService.getVariableValue(metricAttributes.historicalVariableId, targetDate, context.variables);
                if (historicalValue !== null) {
                    context.logger.log(`[SeedNodeStrategy] Found historical value ${historicalValue} from historicalVariableId for month ${previousMonth}`);
                    return historicalValue;
                }
                else {
                    context.logger.log(`[SeedNodeStrategy] historicalVariableId ${metricAttributes.historicalVariableId} returned null for month ${previousMonth}`);
                }
            }
            else {
                context.logger.warn(`[SeedNodeStrategy] Source metric ${sourceMetricId} has no historicalVariableId`);
            }
        }
        else {
            context.logger.warn(`[SeedNodeStrategy] Could not find source metric node ${sourceMetricId} in calculation trees`);
        }
        const sourceNodeResult = context.nodeResults.get(sourceMetricId);
        if (sourceNodeResult) {
            const monthlyValue = sourceNodeResult.values.find(v => v.month === previousMonth);
            if (monthlyValue && monthlyValue.historical !== null) {
                context.logger.log(`[SeedNodeStrategy] Fallback: Found calculated historical value ${monthlyValue.historical} from source metric ${sourceMetricId} for month ${previousMonth}`);
                return monthlyValue.historical;
            }
            else {
                context.logger.log(`[SeedNodeStrategy] Source metric ${sourceMetricId} has no historical value for month ${previousMonth}`);
            }
        }
        else {
            context.logger.warn(`[SeedNodeStrategy] Source metric ${sourceMetricId} not found in context.nodeResults - this indicates a dependency ordering issue`);
        }
        context.logger.warn(`[SeedNodeStrategy] No historical data found for source metric ${sourceMetricId} at month ${previousMonth}`);
        return null;
    }
    async getPreviousMonthValueFromSourceMetric(sourceMetricId, previousMonth, calculationType, context) {
        context.logger.log(`[SeedNodeStrategy] Looking for calculated value from metric ${sourceMetricId} for month ${previousMonth}`);
        if (calculationType === 'forecast') {
            const running = context.runningMetricForecasts.get(sourceMetricId);
            if (running && running.has(previousMonth)) {
                const rv = running.get(previousMonth) ?? null;
                context.logger.log(`[SeedNodeStrategy] Found forecast ${rv} from runningMetricForecasts for source metric ${sourceMetricId} month ${previousMonth}`);
                return rv;
            }
        }
        const sourceNodeResult = context.nodeResults.get(sourceMetricId);
        if (sourceNodeResult) {
            const monthlyValue = sourceNodeResult.values.find(v => v.month === previousMonth);
            if (monthlyValue) {
                let value = null;
                switch (calculationType) {
                    case 'historical':
                        value = monthlyValue.historical;
                        break;
                    case 'forecast':
                        value = monthlyValue.forecast;
                        break;
                    case 'budget':
                        value = monthlyValue.budget;
                        break;
                }
                if (value !== null) {
                    context.logger.log(`[SeedNodeStrategy] Found ${calculationType} value ${value} from source metric ${sourceMetricId} for month ${previousMonth}`);
                    return value;
                }
                else {
                    context.logger.log(`[SeedNodeStrategy] Source metric ${sourceMetricId} has null ${calculationType} value for month ${previousMonth}`);
                    return null;
                }
            }
            else {
                context.logger.warn(`[SeedNodeStrategy] No data found for month ${previousMonth} in source metric ${sourceMetricId}`);
                return null;
            }
        }
        context.logger.error(`[SeedNodeStrategy] Source metric ${sourceMetricId} result not found in context.nodeResults. This indicates a dependency ordering issue.`);
        return null;
    }
    findSourceMetricNode(sourceMetricId, context) {
        const trees = context.request.trees;
        if (!trees) {
            context.logger.warn(`[SeedNodeStrategy] No trees available in context to find source metric ${sourceMetricId}`);
            return null;
        }
        for (const tree of trees) {
            const foundNode = this.searchNodeInTree(tree.tree, sourceMetricId);
            if (foundNode) {
                return foundNode;
            }
        }
        context.logger.warn(`[SeedNodeStrategy] Source metric node ${sourceMetricId} not found in calculation trees`);
        return null;
    }
    searchNodeInTree(node, targetNodeId) {
        if (node.nodeId === targetNodeId) {
            return node;
        }
        for (const child of node.children) {
            const found = this.searchNodeInTree(child, targetNodeId);
            if (found) {
                return found;
            }
        }
        return null;
    }
};
exports.SeedNodeStrategy = SeedNodeStrategy;
exports.SeedNodeStrategy = SeedNodeStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [period_service_1.PeriodService,
        variable_data_service_1.VariableDataService])
], SeedNodeStrategy);
//# sourceMappingURL=seed-node-strategy.js.map