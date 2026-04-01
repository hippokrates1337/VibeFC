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
exports.MetricNodeStrategy = void 0;
const common_1 = require("@nestjs/common");
const variable_data_service_1 = require("../variable-data-service");
const period_service_1 = require("../services/period-service");
let MetricNodeStrategy = class MetricNodeStrategy {
    constructor(variableDataService, periodService) {
        this.variableDataService = variableDataService;
        this.periodService = periodService;
    }
    getNodeType() {
        return 'METRIC';
    }
    async evaluate(node, month, calculationType, context) {
        const attributes = node.nodeData;
        if (!attributes) {
            context.logger.error(`[MetricNodeStrategy] Missing attributes for METRIC node ${node.nodeId}`);
            return null;
        }
        const cacheKey = context.cache.generateKey(node.nodeId, month, calculationType);
        const cachedValue = context.cache.get(cacheKey);
        if (cachedValue !== undefined) {
            context.logger.log(`[MetricNodeStrategy] Cache hit for METRIC node ${node.nodeId}, month ${month}, type ${calculationType}: ${cachedValue}`);
            return cachedValue;
        }
        try {
            context.logger.log(`[MetricNodeStrategy] Evaluating METRIC node ${node.nodeId} for month ${month}, type: ${calculationType}, useCalculated: ${attributes.useCalculated}`);
            let result = null;
            if (calculationType === 'forecast') {
                context.logger.log(`[MetricNodeStrategy] METRIC node ${node.nodeId}: Using calculated forecast from child (always calculated)`);
                result = await this.evaluateFromCalculation(node, month, calculationType, context);
                context.logger.log(`[MetricNodeStrategy] METRIC node ${node.nodeId}: Child returned forecast value: ${result}`);
            }
            else {
                if (attributes.useCalculated) {
                    context.logger.log(`[MetricNodeStrategy] METRIC node ${node.nodeId}: Using calculated ${calculationType} from child (useCalculated=true)`);
                    result = await this.evaluateFromCalculation(node, month, calculationType, context);
                }
                else {
                    context.logger.log(`[MetricNodeStrategy] METRIC node ${node.nodeId}: Using variable ${calculationType} (useCalculated=false)`);
                    result = await this.evaluateFromVariable(node, month, calculationType, context, attributes);
                }
            }
            context.logger.log(`[MetricNodeStrategy] METRIC node ${node.nodeId} (${calculationType}) result: ${result} for month ${month}`);
            context.cache.set(cacheKey, result);
            return result;
        }
        catch (error) {
            context.logger.error(`[MetricNodeStrategy] Error evaluating METRIC node ${node.nodeId}:`, error);
            const result = null;
            context.cache.set(cacheKey, result);
            return result;
        }
    }
    validateNode(node) {
        const errors = [];
        if (node.nodeType !== 'METRIC') {
            errors.push(`Expected METRIC node, got ${node.nodeType}`);
        }
        const attributes = node.nodeData;
        if (!attributes) {
            errors.push('Missing node attributes');
            return { isValid: false, errors };
        }
        if (!node.children || node.children.length !== 1) {
            errors.push('METRIC nodes must have exactly one child for forecast calculations');
        }
        if (!attributes.useCalculated) {
            if (!attributes.budgetVariableId && !attributes.historicalVariableId) {
                errors.push('METRIC nodes with useCalculated=false must have budgetVariableId and/or historicalVariableId for historical/budget calculations');
            }
        }
        if (typeof attributes.useCalculated !== 'boolean') {
            errors.push('useCalculated must be a boolean');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    async evaluateFromCalculation(node, month, calculationType, context) {
        if (!node.children || node.children.length !== 1) {
            context.logger.error(`[MetricNodeStrategy] METRIC node ${node.nodeId} must have exactly one child for calculation, but has ${node.children?.length || 0}`);
            return null;
        }
        const nodeEvaluator = this.getNodeEvaluator(context);
        const child = node.children[0];
        context.logger.log(`[MetricNodeStrategy] METRIC node ${node.nodeId}: Evaluating child ${child.nodeId} (${child.nodeType}) for ${calculationType} calculation`);
        const result = await nodeEvaluator.evaluate(child, month, calculationType, context);
        context.logger.log(`[MetricNodeStrategy] METRIC node ${node.nodeId}: Child ${child.nodeId} returned: ${result}`);
        return result;
    }
    async evaluateFromVariable(node, month, calculationType, context, attributes) {
        let variableId = null;
        switch (calculationType) {
            case 'historical':
                variableId = attributes.historicalVariableId;
                if (!variableId) {
                    context.logger.warn(`[MetricNodeStrategy] No historicalVariableId for METRIC node ${node.nodeId} in historical calculation`);
                    return null;
                }
                break;
            case 'budget':
                variableId = attributes.budgetVariableId;
                if (!variableId) {
                    context.logger.warn(`[MetricNodeStrategy] No budgetVariableId for METRIC node ${node.nodeId} in budget calculation`);
                    return null;
                }
                break;
            case 'forecast':
                context.logger.error(`[MetricNodeStrategy] Forecast calculations should never use direct variables for METRIC node ${node.nodeId}`);
                return null;
            default:
                context.logger.error(`[MetricNodeStrategy] Unknown calculation type: ${calculationType}`);
                return null;
        }
        try {
            const targetDate = this.periodService.mmyyyyToFirstOfMonth(month);
            const value = await this.variableDataService.getVariableValue(variableId, targetDate, context.variables);
            return value;
        }
        catch (error) {
            context.logger.warn(`[MetricNodeStrategy] Failed to get variable value for ${variableId} at ${month}:`, error);
            return null;
        }
    }
    getNodeEvaluator(context) {
        return context.nodeEvaluator;
    }
};
exports.MetricNodeStrategy = MetricNodeStrategy;
exports.MetricNodeStrategy = MetricNodeStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [variable_data_service_1.VariableDataService,
        period_service_1.PeriodService])
], MetricNodeStrategy);
//# sourceMappingURL=metric-node-strategy.js.map