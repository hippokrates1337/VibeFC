"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstantNodeStrategy = void 0;
const common_1 = require("@nestjs/common");
let ConstantNodeStrategy = class ConstantNodeStrategy {
    getNodeType() {
        return 'CONSTANT';
    }
    async evaluate(node, month, calculationType, context) {
        const attributes = node.nodeData;
        if (!attributes || typeof attributes.value !== 'number') {
            context.logger.error(`[ConstantNodeStrategy] Missing or invalid value for CONSTANT node ${node.nodeId}`);
            return null;
        }
        const cacheKey = context.cache.generateKey(node.nodeId, month, calculationType);
        const cachedValue = context.cache.get(cacheKey);
        if (cachedValue !== undefined) {
            return cachedValue;
        }
        const result = attributes.value;
        context.logger.log(`[ConstantNodeStrategy] CONSTANT node ${node.nodeId} (${calculationType}) result: ${result} for month ${month}`);
        context.cache.set(cacheKey, result);
        return result;
    }
    validateNode(node) {
        const errors = [];
        if (node.nodeType !== 'CONSTANT') {
            errors.push(`Expected CONSTANT node, got ${node.nodeType}`);
        }
        const attributes = node.nodeData;
        if (!attributes) {
            errors.push('Missing node attributes');
            return { isValid: false, errors };
        }
        if (typeof attributes.value !== 'number') {
            errors.push('CONSTANT node value must be a number');
        }
        if (isNaN(attributes.value) || !isFinite(attributes.value)) {
            errors.push('CONSTANT node value must be a finite number');
        }
        if (node.children && node.children.length > 0) {
            errors.push('CONSTANT nodes should not have children');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
};
exports.ConstantNodeStrategy = ConstantNodeStrategy;
exports.ConstantNodeStrategy = ConstantNodeStrategy = __decorate([
    (0, common_1.Injectable)()
], ConstantNodeStrategy);
//# sourceMappingURL=constant-node-strategy.js.map