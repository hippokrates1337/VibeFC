"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphConverter = void 0;
class GraphConverter {
    constructor() {
        this.logger = console;
    }
    convertToTrees(nodes, edges) {
        try {
            this.logger.log('[GraphConverter] Starting graph-to-tree conversion');
            this.logger.log(`[GraphConverter] Input: ${nodes.length} nodes, ${edges.length} edges`);
            const validation = this.validateGraph(nodes, edges);
            if (!validation.isValid) {
                this.logger.error('[GraphConverter] Validation failed:', validation.errors);
                throw new Error(`Invalid graph: ${validation.errors.join(', ')}`);
            }
            if (validation.warnings.length > 0) {
                this.logger.warn('[GraphConverter] Validation warnings:', validation.warnings);
            }
            const topLevelMetricNodes = this.findTopLevelMetricNodes(nodes, edges);
            this.logger.log(`[GraphConverter] Found ${topLevelMetricNodes.length} top-level metric nodes for tree roots`);
            const trees = topLevelMetricNodes.map(metricNode => {
                this.logger.log(`[GraphConverter] Building tree for top-level metric node: ${metricNode.id}`);
                return {
                    rootMetricNodeId: metricNode.id,
                    tree: this.buildTreeFromMetric(metricNode.id, nodes, edges)
                };
            });
            this.logger.log(`[GraphConverter] Successfully created ${trees.length} calculation trees`);
            return trees;
        }
        catch (error) {
            this.logger.error('[GraphConverter] Conversion failed:', error);
            throw new Error(`Failed to convert graph to trees: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    validateGraph(nodes, edges) {
        const errors = [];
        const warnings = [];
        this.logger.log('[GraphConverter] Starting graph validation');
        const metricNodes = this.findMetricNodes(nodes);
        if (metricNodes.length === 0) {
            errors.push('Graph must contain at least one METRIC node');
        }
        if (this.detectCycles(nodes, edges)) {
            errors.push('Graph contains cycles - forecast graphs must be acyclic');
        }
        const inputCounts = this.calculateNodeInputCounts(nodes, edges);
        Array.from(inputCounts.entries()).forEach(([nodeId, inputCount]) => {
            const node = nodes.find(n => n.id === nodeId);
            if (node && node.type !== 'OPERATOR' && inputCount > 1) {
                errors.push(`Node ${nodeId} (${node.type}) has ${inputCount} inputs but only OPERATOR nodes can accept multiple inputs`);
            }
        });
        this.validateNodeConnections(nodes, edges, errors, warnings);
        this.validateSeedNodeConnections(nodes, edges, errors, warnings);
        this.validateMetricNodeConfiguration(nodes, edges, errors, warnings);
        const topLevelMetricNodes = this.findTopLevelMetricNodes(nodes, edges);
        if (topLevelMetricNodes.length === 0 && metricNodes.length > 0) {
            errors.push('All METRIC nodes are connected as inputs to other METRIC nodes - at least one METRIC node must be at the top level');
        }
        const isValid = errors.length === 0;
        this.logger.log(`[GraphConverter] Validation complete - ${isValid ? 'VALID' : 'INVALID'}`);
        if (errors.length > 0) {
            this.logger.log('[GraphConverter] Validation errors:', errors);
        }
        if (warnings.length > 0) {
            this.logger.log('[GraphConverter] Validation warnings:', warnings);
        }
        return { isValid, errors, warnings };
    }
    calculateNodeInputCounts(nodes, edges) {
        const inputCounts = new Map();
        nodes.forEach(node => inputCounts.set(node.id, 0));
        edges.forEach(edge => {
            const currentCount = inputCounts.get(edge.target) || 0;
            inputCounts.set(edge.target, currentCount + 1);
        });
        return inputCounts;
    }
    validateNodeConnections(nodes, edges, errors, warnings) {
        edges.forEach(edge => {
            const sourceExists = nodes.some(n => n.id === edge.source);
            const targetExists = nodes.some(n => n.id === edge.target);
            if (!sourceExists) {
                errors.push(`Edge ${edge.id} references non-existent source node: ${edge.source}`);
            }
            if (!targetExists) {
                errors.push(`Edge ${edge.id} references non-existent target node: ${edge.target}`);
            }
        });
        const connectedNodes = new Set();
        edges.forEach(edge => {
            connectedNodes.add(edge.source);
            connectedNodes.add(edge.target);
        });
        nodes.forEach(node => {
            if (!connectedNodes.has(node.id) && node.type !== 'METRIC') {
                warnings.push(`Node ${node.id} (${node.type}) is not connected to any other nodes`);
            }
        });
    }
    validateSeedNodeConnections(nodes, edges, errors, warnings) {
        const seedNodes = nodes.filter(n => n.type === 'SEED');
        seedNodes.forEach(seedNode => {
            const seedData = seedNode.data;
            if (!seedData.sourceMetricId) {
                errors.push(`SEED node ${seedNode.id} missing required sourceMetricId`);
                return;
            }
            const referencedMetric = nodes.find(n => n.id === seedData.sourceMetricId);
            if (!referencedMetric) {
                errors.push(`SEED node ${seedNode.id} references non-existent metric: ${seedData.sourceMetricId}. Please update the SEED node configuration or save the forecast to sync the latest changes.`);
            }
            else if (referencedMetric.type !== 'METRIC') {
                errors.push(`SEED node ${seedNode.id} sourceMetricId must reference a METRIC node, found: ${referencedMetric.type}`);
            }
        });
    }
    validateMetricNodeConfiguration(nodes, edges, errors, warnings) {
        const metricNodes = nodes.filter(n => n.type === 'METRIC');
        metricNodes.forEach(metricNode => {
            const metricData = metricNode.data;
            const hasCalculationInputs = edges.some(edge => edge.target === metricNode.id);
            if (!metricData.useCalculated) {
                if (!metricData.budgetVariableId) {
                    warnings.push(`METRIC node ${metricNode.id} has no budget variable configured - budget values will be null`);
                }
                if (!metricData.historicalVariableId) {
                    warnings.push(`METRIC node ${metricNode.id} has no historical variable configured - historical values will be null`);
                }
            }
            else {
                if (!metricData.budgetVariableId) {
                    warnings.push(`METRIC node ${metricNode.id} uses calculated values but has no budget variable fallback`);
                }
                if (!metricData.historicalVariableId) {
                    warnings.push(`METRIC node ${metricNode.id} uses calculated values but has no historical variable fallback`);
                }
            }
            if (!metricData.label) {
                warnings.push(`METRIC node ${metricNode.id} missing label`);
            }
        });
    }
    buildTreeFromMetric(metricNodeId, nodes, edges) {
        this.logger.log(`[GraphConverter] Building tree from metric node: ${metricNodeId}`);
        const node = nodes.find(n => n.id === metricNodeId);
        if (!node) {
            throw new Error(`Metric node ${metricNodeId} not found`);
        }
        const children = this.getNodeChildren(metricNodeId, nodes, edges);
        this.logger.log(`[GraphConverter] Node ${metricNodeId} has ${children.length} children`);
        return {
            nodeId: metricNodeId,
            nodeType: node.type,
            nodeData: node.data,
            children: children.map(child => this.buildTreeFromMetric(child.id, nodes, edges)),
            inputOrder: node.type === 'OPERATOR' ? node.data?.inputOrder : undefined
        };
    }
    getNodeChildren(nodeId, nodes, edges) {
        const childIds = edges
            .filter(edge => edge.target === nodeId)
            .map(edge => edge.source);
        return childIds
            .map(childId => nodes.find(n => n.id === childId))
            .filter((node) => node !== undefined);
    }
    detectCycles(nodes, edges) {
        const visited = new Set();
        const recursionStack = new Set();
        const hasCycleDFS = (nodeId) => {
            if (recursionStack.has(nodeId)) {
                return true;
            }
            if (visited.has(nodeId)) {
                return false;
            }
            visited.add(nodeId);
            recursionStack.add(nodeId);
            const outgoingEdges = edges.filter(edge => edge.source === nodeId);
            for (const edge of outgoingEdges) {
                if (hasCycleDFS(edge.target)) {
                    return true;
                }
            }
            recursionStack.delete(nodeId);
            return false;
        };
        for (const node of nodes) {
            if (!visited.has(node.id)) {
                if (hasCycleDFS(node.id)) {
                    return true;
                }
            }
        }
        return false;
    }
    findMetricNodes(nodes) {
        return nodes.filter(node => node.type === 'METRIC');
    }
    findTopLevelMetricNodes(nodes, edges) {
        const metricNodes = this.findMetricNodes(nodes);
        const metricNodesAsInputs = new Set();
        edges.forEach(edge => {
            const targetNode = nodes.find(n => n.id === edge.target);
            if (targetNode && targetNode.type === 'METRIC') {
                const sourceNode = nodes.find(n => n.id === edge.source);
                if (sourceNode && sourceNode.type === 'METRIC') {
                    metricNodesAsInputs.add(edge.source);
                }
            }
        });
        const topLevelMetrics = metricNodes.filter(metric => !metricNodesAsInputs.has(metric.id));
        this.logger.log(`[GraphConverter] Metric nodes analysis:`);
        this.logger.log(`[GraphConverter] - Total metric nodes: ${metricNodes.length}`);
        this.logger.log(`[GraphConverter] - Metric nodes used as inputs: ${metricNodesAsInputs.size}`);
        this.logger.log(`[GraphConverter] - Top-level metric nodes: ${topLevelMetrics.length}`);
        return topLevelMetrics;
    }
}
exports.GraphConverter = GraphConverter;
//# sourceMappingURL=graph-converter.js.map