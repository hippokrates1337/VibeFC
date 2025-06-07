"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalculationEngine = void 0;
class CalculationEngine {
    constructor(variableDataService) {
        this.variableDataService = variableDataService;
        this.logger = console;
    }
    async calculateForecast(trees, forecastStartDate, forecastEndDate, variables) {
        try {
            this.logger.log('[CalculationEngine] Starting forecast calculation');
            this.logger.log(`[CalculationEngine] Period: ${forecastStartDate.toISOString()} to ${forecastEndDate.toISOString()}`);
            this.logger.log(`[CalculationEngine] Processing ${trees.length} calculation trees`);
            const context = {
                variables,
                forecastStartDate,
                forecastEndDate,
                calculationCache: new Map(),
                monthlyCache: new Map(),
            };
            const metrics = [];
            for (let i = 0; i < trees.length; i++) {
                const tree = trees[i];
                this.logger.log(`[CalculationEngine] Processing tree ${i + 1}/${trees.length} (metric: ${tree.rootMetricNodeId})`);
                const metricResult = await this.calculateMetricTree(tree, context, trees);
                metrics.push(metricResult);
            }
            return {
                forecastId: '',
                calculatedAt: new Date(),
                metrics,
            };
        }
        catch (error) {
            this.logger.error('[CalculationEngine] Forecast calculation failed:', error);
            throw new Error(`Forecast calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async calculateMetricTree(tree, context, allTrees) {
        const monthlyValues = [];
        const monthCount = this.getMonthsBetween(context.forecastStartDate, context.forecastEndDate);
        for (let monthOffset = 0; monthOffset < monthCount; monthOffset++) {
            const targetDate = this.addMonths(context.forecastStartDate, monthOffset);
            const normalizedDate = this.normalizeToFirstOfMonth(targetDate);
            const forecastValue = await this.evaluateNode(tree.tree, normalizedDate, 'forecast', { ...context, currentMonth: monthOffset }, allTrees);
            const budgetValue = await this.evaluateNode(tree.tree, normalizedDate, 'budget', { ...context, currentMonth: monthOffset }, allTrees);
            const historicalValue = await this.evaluateNode(tree.tree, normalizedDate, 'historical', { ...context, currentMonth: monthOffset }, allTrees);
            const monthlyValue = {
                date: normalizedDate,
                forecast: forecastValue,
                budget: budgetValue,
                historical: historicalValue,
            };
            monthlyValues.push(monthlyValue);
            if (!context.monthlyCache.has(tree.rootMetricNodeId)) {
                context.monthlyCache.set(tree.rootMetricNodeId, new Map());
            }
            context.monthlyCache.get(tree.rootMetricNodeId).set(monthOffset, monthlyValue);
            this.logger.log(`[CalculationEngine] - Cached month ${monthOffset} for metric ${tree.rootMetricNodeId}: forecast=${forecastValue}, budget=${budgetValue}, historical=${historicalValue}`);
        }
        return {
            metricNodeId: tree.rootMetricNodeId,
            values: monthlyValues,
        };
    }
    async evaluateNode(node, targetDate, calculationType, context, allTrees) {
        try {
            const cacheKey = `${node.nodeId}-${targetDate.getTime()}-${calculationType}`;
            if (context.calculationCache.has(cacheKey)) {
                return context.calculationCache.get(cacheKey);
            }
            let result = null;
            switch (node.nodeType) {
                case 'DATA':
                    result = await this.evaluateDataNode(node, targetDate, calculationType, context, allTrees);
                    break;
                case 'CONSTANT':
                    result = await this.evaluateConstantNode(node, targetDate, calculationType, context, allTrees);
                    break;
                case 'OPERATOR':
                    result = await this.evaluateOperatorNode(node, targetDate, calculationType, context, allTrees);
                    break;
                case 'METRIC':
                    result = await this.evaluateMetricNode(node, targetDate, calculationType, context, allTrees);
                    break;
                case 'SEED':
                    result = await this.evaluateSeedNode(node, targetDate, calculationType, context, allTrees);
                    break;
                default:
                    throw new Error(`Unknown node type: ${node.nodeType}`);
            }
            context.calculationCache.set(cacheKey, result);
            return result;
        }
        catch (error) {
            throw new Error(`Node evaluation failed for ${node.nodeId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async evaluateDataNode(node, targetDate, calculationType, context, allTrees) {
        const dataAttributes = node.nodeData;
        if (!dataAttributes.variableId) {
            throw new Error(`DATA node ${node.nodeId} missing variableId`);
        }
        return this.variableDataService.getVariableValueWithOffset(dataAttributes.variableId, targetDate, dataAttributes.offsetMonths || 0, context.variables);
    }
    async evaluateConstantNode(node, targetDate, calculationType, context, allTrees) {
        const constantAttributes = node.nodeData;
        return constantAttributes.value ?? null;
    }
    async evaluateOperatorNode(node, targetDate, calculationType, context, allTrees) {
        const operatorAttributes = node.nodeData;
        if (!operatorAttributes.op) {
            throw new Error(`OPERATOR node ${node.nodeId} missing operator`);
        }
        this.logger.log(`[CalculationEngine] OPERATOR ${node.nodeId} evaluation:`);
        this.logger.log(`[CalculationEngine] - Actual children: [${node.children.map(c => c.nodeId).join(', ')}]`);
        this.logger.log(`[CalculationEngine] - InputOrder: [${operatorAttributes.inputOrder?.join(', ') || 'none'}]`);
        const orderedChildren = operatorAttributes.inputOrder
            ? this.orderChildrenByInputOrder(node.children, operatorAttributes.inputOrder)
            : node.children;
        this.logger.log(`[CalculationEngine] - Ordered children after processing: [${orderedChildren.map(c => c.nodeId).join(', ')}]`);
        const childValues = [];
        for (const child of orderedChildren) {
            const childValue = await this.evaluateNode(child, targetDate, calculationType, context, allTrees);
            this.logger.log(`[CalculationEngine] - Child ${child.nodeId} (${child.nodeType}) value: ${childValue}`);
            if (childValue === null) {
                this.logger.log(`[CalculationEngine] - OPERATOR returning null due to null child value`);
                return null;
            }
            childValues.push(childValue);
        }
        if (childValues.length === 0) {
            this.logger.error(`[CalculationEngine] - OPERATOR node ${node.nodeId} has no valid children`);
            throw new Error(`OPERATOR node ${node.nodeId} has no valid children`);
        }
        let result = childValues[0];
        for (let i = 1; i < childValues.length; i++) {
            const rightValue = childValues[i];
            switch (operatorAttributes.op) {
                case '+':
                    result += rightValue;
                    break;
                case '-':
                    result -= rightValue;
                    break;
                case '*':
                    result *= rightValue;
                    break;
                case '/':
                    if (rightValue === 0) {
                        return null;
                    }
                    result /= rightValue;
                    break;
                case '^':
                    result = Math.pow(result, rightValue);
                    break;
                default:
                    throw new Error(`Unknown operator: ${operatorAttributes.op}`);
            }
        }
        return result;
    }
    async evaluateMetricNode(node, targetDate, calculationType, context, allTrees) {
        const metricAttributes = node.nodeData;
        if (node.children.length > 1) {
            throw new Error(`METRIC node ${node.nodeId} cannot have more than one child`);
        }
        switch (calculationType) {
            case 'forecast':
                if (node.children.length > 0) {
                    return this.evaluateNode(node.children[0], targetDate, calculationType, context, allTrees);
                }
                if (metricAttributes.budgetVariableId) {
                    return this.variableDataService.getVariableValueForMonth(metricAttributes.budgetVariableId, targetDate, context.variables);
                }
                return null;
            case 'budget':
                if (metricAttributes.useCalculated && node.children.length > 0) {
                    return this.evaluateNode(node.children[0], targetDate, calculationType, context, allTrees);
                }
                if (metricAttributes.budgetVariableId) {
                    return this.variableDataService.getVariableValueForMonth(metricAttributes.budgetVariableId, targetDate, context.variables);
                }
                return null;
            case 'historical':
                if (metricAttributes.useCalculated && node.children.length > 0) {
                    return this.evaluateNode(node.children[0], targetDate, calculationType, context, allTrees);
                }
                if (metricAttributes.historicalVariableId) {
                    return this.variableDataService.getVariableValueForMonth(metricAttributes.historicalVariableId, targetDate, context.variables);
                }
                return null;
            default:
                throw new Error(`Unknown calculation type: ${calculationType}`);
        }
    }
    async evaluateSeedNode(node, targetDate, calculationType, context, allTrees) {
        const seedAttributes = node.nodeData;
        if (!seedAttributes.sourceMetricId) {
            throw new Error(`SEED node ${node.nodeId} missing sourceMetricId`);
        }
        this.logger.log(`[CalculationEngine] SEED ${node.nodeId} evaluation for month ${context.currentMonth}:`);
        this.logger.log(`[CalculationEngine] - Source metric ID: ${seedAttributes.sourceMetricId}`);
        this.logger.log(`[CalculationEngine] - Calculation type: ${calculationType}`);
        if (context.currentMonth === 0) {
            this.logger.log(`[CalculationEngine] - First month (0), using historical data from connected metric`);
            const prevMonthDate = this.addMonths(context.forecastStartDate, -1);
            this.logger.log(`[CalculationEngine] - Looking for historical data at ${prevMonthDate.toISOString()}`);
            const referencedMetricTree = allTrees?.find(tree => tree.rootMetricNodeId === seedAttributes.sourceMetricId);
            if (referencedMetricTree) {
                const metricNodeData = referencedMetricTree.tree.nodeData;
                if (metricNodeData.historicalVariableId) {
                    this.logger.log(`[CalculationEngine] - Looking up historical variable: ${metricNodeData.historicalVariableId}`);
                    const value = this.variableDataService.getVariableValueForMonth(metricNodeData.historicalVariableId, prevMonthDate, context.variables);
                    if (value !== null) {
                        this.logger.log(`[CalculationEngine] - SEED first month historical value from ${metricNodeData.historicalVariableId}: ${value}`);
                        return value;
                    }
                    else {
                        const historicalVariable = context.variables.find(v => v.id === metricNodeData.historicalVariableId);
                        if (!historicalVariable) {
                            throw new Error(`Historical variable ${metricNodeData.historicalVariableId} not found. Please ensure the variable exists and data is loaded.`);
                        }
                        const typedVariable = historicalVariable;
                        let availableDates = [];
                        if (typedVariable.timeSeries && Array.isArray(typedVariable.timeSeries)) {
                            availableDates = typedVariable.timeSeries
                                .map((ts) => {
                                const date = ts.date instanceof Date ? ts.date : new Date(ts.date);
                                return date.toISOString().substring(0, 10);
                            })
                                .filter((date) => date && date !== 'Invalid Date')
                                .sort();
                            this.logger.log(`[CalculationEngine] - Found ${availableDates.length} available dates in timeSeries`);
                        }
                        else {
                            this.logger.log(`[CalculationEngine] - No timeSeries found or timeSeries is not an array`);
                        }
                        const expectedDate = prevMonthDate.toISOString().substring(0, 10);
                        const datesDisplay = availableDates.length > 0
                            ? availableDates.slice(0, 10).join(', ') + (availableDates.length > 10 ? ` (and ${availableDates.length - 10} more)` : '')
                            : 'No valid dates found in variable data';
                        throw new Error(`Historical data for ${expectedDate} not found in variable '${typedVariable.name}' (${metricNodeData.historicalVariableId}). Available dates: ${datesDisplay}. Please ensure historical data exists for the month prior to the forecast start date (${expectedDate}), or adjust your forecast start date to begin after the latest available historical data.`);
                    }
                }
                else {
                    throw new Error(`Metric node ${seedAttributes.sourceMetricId} has no historical variable configured. Please configure a historical variable for this metric.`);
                }
            }
            else {
                throw new Error(`Referenced metric node ${seedAttributes.sourceMetricId} not found in calculation trees.`);
            }
        }
        const previousMonthOffset = context.currentMonth - 1;
        this.logger.log(`[CalculationEngine] - Looking for previous month result at offset ${previousMonthOffset}`);
        const metricCache = context.monthlyCache.get(seedAttributes.sourceMetricId);
        if (!metricCache) {
            this.logger.log(`[CalculationEngine] - No metric cache found for ${seedAttributes.sourceMetricId}`);
            this.logger.log(`[CalculationEngine] - Available cache keys: [${Array.from(context.monthlyCache.keys()).join(', ')}]`);
            return null;
        }
        this.logger.log(`[CalculationEngine] - Metric cache exists, contains offsets: [${Array.from(metricCache.keys()).join(', ')}]`);
        const previousMonthResult = metricCache.get(previousMonthOffset);
        if (!previousMonthResult) {
            this.logger.log(`[CalculationEngine] - No previous month result found for offset ${previousMonthOffset}`);
            return null;
        }
        this.logger.log(`[CalculationEngine] - Previous month result found: forecast=${previousMonthResult.forecast}, budget=${previousMonthResult.budget}, historical=${previousMonthResult.historical}`);
        let result = null;
        switch (calculationType) {
            case 'forecast':
                result = previousMonthResult.forecast;
                break;
            case 'budget':
                result = previousMonthResult.budget;
                break;
            case 'historical':
                result = previousMonthResult.historical;
                break;
            default:
                throw new Error(`Unknown calculation type: ${calculationType}`);
        }
        this.logger.log(`[CalculationEngine] - SEED returning: ${result}`);
        return result;
    }
    orderChildrenByInputOrder(children, inputOrder) {
        const childMap = new Map();
        children.forEach(child => childMap.set(child.nodeId, child));
        const orderedChildren = [];
        inputOrder.forEach(nodeId => {
            const child = childMap.get(nodeId);
            if (child) {
                orderedChildren.push(child);
                childMap.delete(nodeId);
            }
        });
        childMap.forEach(child => orderedChildren.push(child));
        return orderedChildren;
    }
    getMonthsBetween(startDate, endDate) {
        const start = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        return ((end.getFullYear() - start.getFullYear()) * 12) + (end.getMonth() - start.getMonth()) + 1;
    }
    addMonths(date, months) {
        const result = new Date(date);
        result.setMonth(result.getMonth() + months);
        return result;
    }
    normalizeToFirstOfMonth(date) {
        return new Date(date.getFullYear(), date.getMonth(), 1);
    }
}
exports.CalculationEngine = CalculationEngine;
//# sourceMappingURL=calculation-engine.js.map