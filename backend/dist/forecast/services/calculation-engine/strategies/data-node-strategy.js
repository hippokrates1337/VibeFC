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
exports.DataNodeStrategy = void 0;
const common_1 = require("@nestjs/common");
const variable_data_service_1 = require("../variable-data-service");
const period_service_1 = require("../services/period-service");
let DataNodeStrategy = class DataNodeStrategy {
    constructor(variableDataService, periodService) {
        this.variableDataService = variableDataService;
        this.periodService = periodService;
    }
    getNodeType() {
        return 'DATA';
    }
    async evaluate(node, month, calculationType, context) {
        const attributes = node.nodeData;
        if (!attributes || !attributes.variableId) {
            context.logger.error(`[DataNodeStrategy] Missing variableId for DATA node ${node.nodeId}`);
            return null;
        }
        const cacheKey = context.cache.generateKey(node.nodeId, month, calculationType);
        const cachedValue = context.cache.get(cacheKey);
        if (cachedValue !== undefined) {
            context.logger.log(`[DataNodeStrategy] Cache hit for DATA node ${node.nodeId}, month ${month}, type ${calculationType}: ${cachedValue}`);
            return cachedValue;
        }
        try {
            const targetMonth = attributes.offsetMonths
                ? this.periodService.addMonths(month, attributes.offsetMonths)
                : month;
            context.logger.log(`[DataNodeStrategy] Evaluating DATA node ${node.nodeId} for month ${month} (target: ${targetMonth}), type: ${calculationType}, offset: ${attributes.offsetMonths}`);
            const variable = context.variables.find(v => v.id === attributes.variableId);
            if (!variable) {
                context.logger.warn(`[DataNodeStrategy] Variable ${attributes.variableId} not found for DATA node ${node.nodeId}`);
                const result = null;
                context.cache.set(cacheKey, result);
                return result;
            }
            let result = null;
            switch (calculationType) {
                case 'historical':
                    if (variable.type === 'ACTUAL' || variable.type === 'UNKNOWN') {
                        result = await this.getVariableValueOrZeroWhenMissing(variable.id, targetMonth, calculationType, node.nodeId, context);
                    }
                    else {
                        result = null;
                    }
                    break;
                case 'forecast':
                    if (variable.type === 'INPUT' || variable.type === 'UNKNOWN') {
                        result = await this.getVariableValueOrZeroWhenMissing(variable.id, targetMonth, calculationType, node.nodeId, context);
                    }
                    else {
                        result = null;
                    }
                    break;
                case 'budget':
                    if (variable.type === 'BUDGET') {
                        result = await this.getVariableValueOrZeroWhenMissing(variable.id, targetMonth, calculationType, node.nodeId, context);
                    }
                    else {
                        result = null;
                    }
                    break;
                default:
                    context.logger.error(`[DataNodeStrategy] Unknown calculation type: ${calculationType}`);
                    result = null;
            }
            context.logger.log(`[DataNodeStrategy] DATA node ${node.nodeId} (${calculationType}) result: ${result} for month ${targetMonth}`);
            context.cache.set(cacheKey, result);
            return result;
        }
        catch (error) {
            context.logger.error(`[DataNodeStrategy] Error evaluating DATA node ${node.nodeId}:`, error);
            const result = null;
            context.cache.set(cacheKey, result);
            return result;
        }
    }
    validateNode(node) {
        const errors = [];
        if (node.nodeType !== 'DATA') {
            errors.push(`Expected DATA node, got ${node.nodeType}`);
        }
        const attributes = node.nodeData;
        if (!attributes) {
            errors.push('Missing node attributes');
            return { isValid: false, errors };
        }
        if (!attributes.variableId) {
            errors.push('Missing variableId in DATA node attributes');
        }
        if (typeof attributes.offsetMonths !== 'number') {
            errors.push('offsetMonths must be a number');
        }
        if (node.children && node.children.length > 0) {
            errors.push('DATA nodes should not have children');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    async getVariableValue(variableId, month, context) {
        try {
            const targetDate = this.periodService.mmyyyyToFirstOfMonth(month);
            const value = await this.variableDataService.getVariableValue(variableId, targetDate, context.variables);
            return value;
        }
        catch (error) {
            context.logger.warn(`[DataNodeStrategy] Failed to get variable value for ${variableId} at ${month}:`, error);
            return null;
        }
    }
    async getVariableValueOrZeroWhenMissing(variableId, targetMonth, calculationType, dataNodeId, context) {
        const raw = await this.getVariableValue(variableId, targetMonth, context);
        if (raw === null) {
            context.logger.log(`[DataNodeStrategy] No value for variable ${variableId} at ${targetMonth} (${calculationType}), DATA ${dataNodeId} — using 0 fallback`);
            return 0;
        }
        return raw;
    }
};
exports.DataNodeStrategy = DataNodeStrategy;
exports.DataNodeStrategy = DataNodeStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [variable_data_service_1.VariableDataService,
        period_service_1.PeriodService])
], DataNodeStrategy);
//# sourceMappingURL=data-node-strategy.js.map