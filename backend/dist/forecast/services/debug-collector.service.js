"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebugCollectorService = void 0;
const common_1 = require("@nestjs/common");
let DebugCollectorService = class DebugCollectorService {
    constructor() {
        this.steps = [];
        this.nodeExecutionTimes = new Map();
        this.stepCounter = 0;
        this.phaseStartTimes = new Map();
        this.cacheStats = { hits: 0, misses: 0 };
        this.warnings = [];
        this.errors = [];
        this.trees = [];
        this.executionOrder = [];
        this.dependencyGraph = {};
        this.metricOrder = [];
        this.currentTreeProcessing = new Map();
    }
    isDebugSessionActive() {
        return this.config !== undefined;
    }
    startCalculation(config) {
        this.config = config;
        this.reset();
        this.startTime = new Date();
        this.recordPhaseStart('total');
    }
    endCalculation() {
        if (!this.config) {
            return;
        }
        this.recordPhaseEnd('total');
        this.config = undefined;
    }
    startTree(treeId) {
        if (!this.config) {
            return;
        }
        this.currentTreeProcessing.set(treeId, Date.now());
        this.metricOrder.push(treeId);
    }
    endTree(treeId) {
        if (!this.config) {
            return;
        }
        const startTime = this.currentTreeProcessing.get(treeId);
        if (startTime) {
            const duration = Date.now() - startTime;
            this.nodeExecutionTimes.set(`tree_${treeId}`, duration);
            this.currentTreeProcessing.delete(treeId);
        }
    }
    startNode(nodeId, nodeType) {
        if (!this.config) {
            return;
        }
    }
    endNode(nodeId, result) {
        if (!this.config) {
            return;
        }
        const duration = result.endTime - result.startTime;
        this.nodeExecutionTimes.set(nodeId, duration);
        this.executionOrder.push(nodeId);
        if (result.cacheHit) {
            this.cacheStats.hits++;
        }
        else {
            this.cacheStats.misses++;
        }
        if (result.errorMessage) {
            this.recordError(nodeId, result.errorMessage);
        }
    }
    recordStep(step) {
        if (!this.config) {
            return;
        }
        if (this.config.maxStepsToCapture && this.steps.length >= this.config.maxStepsToCapture) {
            return;
        }
        if (this.config.focusNodeIds && !this.config.focusNodeIds.includes(step.nodeId)) {
            return;
        }
        this.steps.push({
            ...step,
            stepNumber: ++this.stepCounter,
            timestamp: new Date()
        });
    }
    recordCacheHit(nodeId) {
        if (!this.config) {
            return;
        }
        this.cacheStats.hits++;
    }
    recordCacheMiss(nodeId) {
        if (!this.config) {
            return;
        }
        this.cacheStats.misses++;
    }
    recordError(nodeId, error) {
        if (!this.config) {
            return;
        }
        this.errors.push(`Node ${nodeId}: ${error}`);
    }
    recordWarning(message) {
        if (!this.config) {
            return;
        }
        this.warnings.push(message);
    }
    setCalculationTree(trees, dependencyGraph) {
        if (!this.config) {
            return;
        }
        this.trees = trees;
        this.dependencyGraph = dependencyGraph;
    }
    recordPhaseStart(phase) {
        if (!this.config) {
            return;
        }
        this.phaseStartTimes.set(phase, Date.now());
    }
    recordPhaseEnd(phase) {
        if (!this.config) {
            return;
        }
        const startTime = this.phaseStartTimes.get(phase);
        if (startTime) {
            const duration = Date.now() - startTime;
            this.nodeExecutionTimes.set(`phase_${phase}`, duration);
            this.phaseStartTimes.delete(phase);
        }
    }
    getDebugInfo() {
        if (!this.config) {
            return {
                calculationTree: {
                    trees: [],
                    executionOrder: [],
                    totalNodes: 0,
                    dependencyGraph: {},
                    metricOrder: [],
                },
                calculationSteps: [],
                performanceMetrics: {
                    totalExecutionTimeMs: 0,
                    nodeExecutionTimes: {},
                    cacheHitRate: 0,
                    totalCacheHits: 0,
                    totalCacheMisses: 0,
                    phaseTimings: {
                        validation: 0,
                        treeProcessing: 0,
                        calculation: 0,
                        resultBuilding: 0,
                    },
                },
            };
        }
        const totalCacheOperations = this.cacheStats.hits + this.cacheStats.misses;
        const cacheHitRate = totalCacheOperations > 0 ? (this.cacheStats.hits / totalCacheOperations) * 100 : 0;
        const calculationTree = {
            trees: this.trees,
            executionOrder: this.executionOrder,
            totalNodes: this.executionOrder.length,
            dependencyGraph: this.dependencyGraph,
            metricOrder: this.metricOrder
        };
        const performanceMetrics = {
            totalExecutionTimeMs: this.nodeExecutionTimes.get('phase_total') || 0,
            nodeExecutionTimes: Object.fromEntries(Array.from(this.nodeExecutionTimes.entries()).filter(([key]) => !key.startsWith('phase_'))),
            cacheHitRate: Math.round(cacheHitRate * 100) / 100,
            totalCacheHits: this.cacheStats.hits,
            totalCacheMisses: this.cacheStats.misses,
            phaseTimings: {
                validation: this.nodeExecutionTimes.get('phase_validation') || 0,
                treeProcessing: this.nodeExecutionTimes.get('phase_treeProcessing') || 0,
                calculation: this.nodeExecutionTimes.get('phase_calculation') || 0,
                resultBuilding: this.nodeExecutionTimes.get('phase_resultBuilding') || 0
            }
        };
        if (this.config.includeMemoryUsage && process.memoryUsage) {
            const memUsage = process.memoryUsage();
            performanceMetrics.memoryUsageMB = Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100;
        }
        return {
            calculationTree,
            calculationSteps: this.steps,
            performanceMetrics,
            warnings: this.warnings.length > 0 ? this.warnings : undefined,
            errors: this.errors.length > 0 ? this.errors : undefined
        };
    }
    reset() {
        this.steps = [];
        this.nodeExecutionTimes.clear();
        this.stepCounter = 0;
        this.phaseStartTimes.clear();
        this.cacheStats = { hits: 0, misses: 0 };
        this.warnings = [];
        this.errors = [];
        this.trees = [];
        this.executionOrder = [];
        this.dependencyGraph = {};
        this.metricOrder = [];
        this.currentTreeProcessing.clear();
    }
    convertTreeNodeToDebug(node, position) {
        return {
            nodeId: node.nodeId,
            nodeType: node.nodeType,
            nodeData: node.nodeData,
            children: node.children.map(child => this.convertTreeNodeToDebug(child)),
            inputOrder: node.inputOrder ? [...node.inputOrder] : undefined,
            position: position || { x: 0, y: 0 },
            label: this.extractNodeLabel(node),
            isReference: node.isReference
        };
    }
    extractNodeLabel(node) {
        const nodeData = node.nodeData;
        switch (node.nodeType) {
            case 'METRIC':
                return nodeData?.label || 'Unnamed Metric';
            case 'DATA':
                return nodeData?.name || 'Data Node';
            case 'CONSTANT':
                return `Constant: ${nodeData?.value || 0}`;
            case 'OPERATOR':
                if (nodeData?.op === 'offset' && nodeData?.offsetMonths != null) {
                    return `Operator: offset (${nodeData.offsetMonths}m)`;
                }
                return `Operator: ${nodeData?.op || 'Unknown'}`;
            case 'SEED':
                return 'Seed Node';
            default:
                return 'Unknown Node';
        }
    }
};
exports.DebugCollectorService = DebugCollectorService;
exports.DebugCollectorService = DebugCollectorService = __decorate([
    (0, common_1.Injectable)()
], DebugCollectorService);
//# sourceMappingURL=debug-collector.service.js.map