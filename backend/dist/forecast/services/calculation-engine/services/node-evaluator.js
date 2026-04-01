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
exports.NodeEvaluator = void 0;
const common_1 = require("@nestjs/common");
const data_node_strategy_1 = require("../strategies/data-node-strategy");
const constant_node_strategy_1 = require("../strategies/constant-node-strategy");
const operator_node_strategy_1 = require("../strategies/operator-node-strategy");
const metric_node_strategy_1 = require("../strategies/metric-node-strategy");
const seed_node_strategy_1 = require("../strategies/seed-node-strategy");
let NodeEvaluator = class NodeEvaluator {
    constructor(dataNodeStrategy, constantNodeStrategy, operatorNodeStrategy, metricNodeStrategy, seedNodeStrategy, logger) {
        this.dataNodeStrategy = dataNodeStrategy;
        this.constantNodeStrategy = constantNodeStrategy;
        this.operatorNodeStrategy = operatorNodeStrategy;
        this.metricNodeStrategy = metricNodeStrategy;
        this.seedNodeStrategy = seedNodeStrategy;
        this.logger = logger;
        this.strategies = new Map();
        this.registerStrategy(this.dataNodeStrategy);
        this.registerStrategy(this.constantNodeStrategy);
        this.registerStrategy(this.operatorNodeStrategy);
        this.registerStrategy(this.metricNodeStrategy);
        this.registerStrategy(this.seedNodeStrategy);
        this.logger.log(`[NodeEvaluator] Initialized with ${this.strategies.size} strategies`);
    }
    async evaluate(node, month, calculationType, context) {
        const enhancedContext = {
            ...context,
            nodeEvaluator: this
        };
        const strategy = this.strategies.get(node.nodeType);
        if (!strategy) {
            this.logger.error(`[NodeEvaluator] No strategy found for node type: ${node.nodeType}`);
            throw new Error(`Unknown node type: ${node.nodeType}`);
        }
        this.logger.log(`[NodeEvaluator] Evaluating ${node.nodeType} node ${node.nodeId} for month ${month}, type ${calculationType}`);
        try {
            const result = await strategy.evaluate(node, month, calculationType, enhancedContext);
            this.logger.log(`[NodeEvaluator] Node ${node.nodeId} evaluation result: ${result}`);
            return result;
        }
        catch (error) {
            this.logger.error(`[NodeEvaluator] Error evaluating node ${node.nodeId}:`, error);
            throw error;
        }
    }
    validateNode(node) {
        const strategy = this.strategies.get(node.nodeType);
        if (!strategy) {
            return {
                isValid: false,
                errors: [`Unknown node type: ${node.nodeType}`]
            };
        }
        return strategy.validateNode(node);
    }
    validateNodes(nodes) {
        const allErrors = [];
        for (const node of nodes) {
            const validation = this.validateNode(node);
            if (!validation.isValid) {
                allErrors.push(...validation.errors.map(err => `Node ${node.nodeId}: ${err}`));
            }
        }
        return {
            isValid: allErrors.length === 0,
            errors: allErrors
        };
    }
    getSupportedNodeTypes() {
        return Array.from(this.strategies.keys());
    }
    isNodeTypeSupported(nodeType) {
        return this.strategies.has(nodeType);
    }
    registerStrategy(strategy) {
        const nodeType = strategy.getNodeType();
        if (this.strategies.has(nodeType)) {
            this.logger.warn(`[NodeEvaluator] Overriding existing strategy for node type: ${nodeType}`);
        }
        this.strategies.set(nodeType, strategy);
        this.logger.log(`[NodeEvaluator] Registered strategy for node type: ${nodeType}`);
    }
    async evaluateParallel(evaluations) {
        this.logger.log(`[NodeEvaluator] Evaluating ${evaluations.length} nodes in parallel`);
        const promises = evaluations.map(({ node, month, calculationType, context }) => this.evaluate(node, month, calculationType, context));
        try {
            const results = await Promise.all(promises);
            this.logger.log(`[NodeEvaluator] Parallel evaluation completed for ${evaluations.length} nodes`);
            return results;
        }
        catch (error) {
            this.logger.error(`[NodeEvaluator] Error in parallel evaluation:`, error);
            throw error;
        }
    }
    async evaluateTree(node, month, calculationType, context, visited = new Set()) {
        if (visited.has(node.nodeId)) {
            this.logger.error(`[NodeEvaluator] Circular dependency detected involving node: ${node.nodeId}`);
            throw new Error(`Circular dependency detected involving node: ${node.nodeId}`);
        }
        visited.add(node.nodeId);
        try {
            if (node.children && node.children.length > 0 && !node.isReference) {
                for (const child of node.children) {
                    await this.evaluateTree(child, month, calculationType, context, new Set(visited));
                }
            }
            const result = await this.evaluate(node, month, calculationType, context);
            visited.delete(node.nodeId);
            return result;
        }
        catch (error) {
            visited.delete(node.nodeId);
            throw error;
        }
    }
    getEvaluationStats() {
        return {
            strategiesRegistered: this.strategies.size,
            supportedNodeTypes: this.getSupportedNodeTypes()
        };
    }
    clearCaches() {
        this.logger.log('[NodeEvaluator] Clearing strategy caches');
    }
};
exports.NodeEvaluator = NodeEvaluator;
exports.NodeEvaluator = NodeEvaluator = __decorate([
    (0, common_1.Injectable)(),
    __param(5, (0, common_1.Inject)('Logger')),
    __metadata("design:paramtypes", [data_node_strategy_1.DataNodeStrategy,
        constant_node_strategy_1.ConstantNodeStrategy,
        operator_node_strategy_1.OperatorNodeStrategy,
        metric_node_strategy_1.MetricNodeStrategy,
        seed_node_strategy_1.SeedNodeStrategy, Object])
], NodeEvaluator);
//# sourceMappingURL=node-evaluator.js.map