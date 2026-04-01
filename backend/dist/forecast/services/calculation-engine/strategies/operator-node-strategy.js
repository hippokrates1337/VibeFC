"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperatorNodeStrategy = void 0;
const common_1 = require("@nestjs/common");
let OperatorNodeStrategy = class OperatorNodeStrategy {
    getNodeType() {
        return 'OPERATOR';
    }
    async evaluate(node, month, calculationType, context) {
        const attributes = node.nodeData;
        if (!attributes || !attributes.op) {
            context.logger.error(`[OperatorNodeStrategy] Missing operator for OPERATOR node ${node.nodeId}`);
            return null;
        }
        const cacheKey = context.cache.generateKey(node.nodeId, month, calculationType);
        const cachedValue = context.cache.get(cacheKey);
        if (cachedValue !== undefined) {
            context.logger.log(`[OperatorNodeStrategy] Cache hit for OPERATOR node ${node.nodeId}, month ${month}, type ${calculationType}: ${cachedValue}`);
            return cachedValue;
        }
        try {
            context.logger.log(`[OperatorNodeStrategy] Evaluating OPERATOR node ${node.nodeId} (${attributes.op}) for month ${month}, type: ${calculationType}`);
            if (!node.children || node.children.length === 0) {
                context.logger.error(`[OperatorNodeStrategy] OPERATOR node ${node.nodeId} has no children`);
                const result = null;
                context.cache.set(cacheKey, result);
                return result;
            }
            const nodeEvaluator = this.getNodeEvaluator(context);
            const childValues = [];
            const childOrder = attributes.inputOrder || node.children.map(child => child.nodeId);
            for (const childId of childOrder) {
                const child = node.children.find(c => c.nodeId === childId);
                if (!child) {
                    context.logger.warn(`[OperatorNodeStrategy] Child node ${childId} not found in OPERATOR node ${node.nodeId}`);
                    continue;
                }
                const childValue = await nodeEvaluator.evaluate(child, month, calculationType, context);
                if (childValue === null) {
                    context.logger.warn(`[OperatorNodeStrategy] Child node ${childId} returned null value for OPERATOR node ${node.nodeId}`);
                    const result = null;
                    context.cache.set(cacheKey, result);
                    return result;
                }
                childValues.push(childValue);
            }
            if (childValues.length === 0) {
                context.logger.error(`[OperatorNodeStrategy] No valid child values for OPERATOR node ${node.nodeId}`);
                const result = null;
                context.cache.set(cacheKey, result);
                return result;
            }
            const result = this.performOperation(attributes.op, childValues);
            context.logger.log(`[OperatorNodeStrategy] OPERATOR node ${node.nodeId} (${attributes.op}) result: ${result} for month ${month}`);
            context.cache.set(cacheKey, result);
            return result;
        }
        catch (error) {
            context.logger.error(`[OperatorNodeStrategy] Error evaluating OPERATOR node ${node.nodeId}:`, error);
            const result = null;
            context.cache.set(cacheKey, result);
            return result;
        }
    }
    validateNode(node) {
        const errors = [];
        if (node.nodeType !== 'OPERATOR') {
            errors.push(`Expected OPERATOR node, got ${node.nodeType}`);
        }
        const attributes = node.nodeData;
        if (!attributes) {
            errors.push('Missing node attributes');
            return { isValid: false, errors };
        }
        const validOperators = ['+', '-', '*', '/', '^'];
        if (!attributes.op || !validOperators.includes(attributes.op)) {
            errors.push(`Invalid operator: ${attributes.op}. Valid operators are: ${validOperators.join(', ')}`);
        }
        if (!node.children || node.children.length === 0) {
            errors.push('OPERATOR nodes must have at least one child');
        }
        if (attributes.inputOrder) {
            if (!Array.isArray(attributes.inputOrder)) {
                errors.push('inputOrder must be an array');
            }
            else {
                const childIds = new Set(node.children?.map(c => c.nodeId) || []);
                const orderIds = new Set(attributes.inputOrder);
                for (const orderId of attributes.inputOrder) {
                    if (!childIds.has(orderId)) {
                        errors.push(`inputOrder references non-existent child: ${orderId}`);
                    }
                }
                for (const childId of childIds) {
                    if (!orderIds.has(childId)) {
                    }
                }
            }
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    performOperation(operator, values) {
        if (values.length === 0) {
            return null;
        }
        try {
            switch (operator) {
                case '+':
                    return values.reduce((sum, val) => sum + val, 0);
                case '-':
                    if (values.length === 1) {
                        return -values[0];
                    }
                    return values.reduce((diff, val, index) => index === 0 ? val : diff - val);
                case '*':
                    return values.reduce((product, val) => product * val, 1);
                case '/':
                    if (values.length === 1) {
                        return 1 / values[0];
                    }
                    return values.reduce((quotient, val, index) => {
                        if (index === 0)
                            return val;
                        if (val === 0)
                            throw new Error('Division by zero');
                        return quotient / val;
                    });
                case '^':
                    if (values.length !== 2) {
                        throw new Error('Power operation requires exactly 2 operands');
                    }
                    return Math.pow(values[0], values[1]);
                default:
                    throw new Error(`Unknown operator: ${operator}`);
            }
        }
        catch (error) {
            console.error(`[OperatorNodeStrategy] Operation error:`, error);
            return null;
        }
    }
    getNodeEvaluator(context) {
        return context.nodeEvaluator;
    }
};
exports.OperatorNodeStrategy = OperatorNodeStrategy;
exports.OperatorNodeStrategy = OperatorNodeStrategy = __decorate([
    (0, common_1.Injectable)()
], OperatorNodeStrategy);
//# sourceMappingURL=operator-node-strategy.js.map