"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeProcessor = void 0;
const common_1 = require("@nestjs/common");
let TreeProcessor = class TreeProcessor {
    orderByDependencies(trees) {
        const orderedTrees = [];
        const processed = new Set();
        const inProgress = new Set();
        const processTree = (tree) => {
            if (processed.has(tree.rootMetricNodeId)) {
                return;
            }
            if (inProgress.has(tree.rootMetricNodeId)) {
                throw new Error(`Circular dependency detected involving metric: ${tree.rootMetricNodeId}`);
            }
            inProgress.add(tree.rootMetricNodeId);
            orderedTrees.push(tree);
            processed.add(tree.rootMetricNodeId);
            inProgress.delete(tree.rootMetricNodeId);
        };
        for (const tree of trees) {
            processTree(tree);
        }
        return orderedTrees;
    }
    flattenToNodes(tree) {
        return [tree.tree];
    }
    flattenForIntermediateResults(tree) {
        const orderedNodes = [];
        const processed = new Set();
        const processNode = (node) => {
            if (processed.has(node.nodeId)) {
                return;
            }
            if (node.children && !node.isReference) {
                for (const child of node.children) {
                    processNode(child);
                }
            }
            orderedNodes.push(node);
            processed.add(node.nodeId);
        };
        processNode(tree.tree);
        return orderedNodes;
    }
    flattenAllTrees(trees) {
        const orderedTrees = this.orderByDependencies(trees);
        const allNodes = [];
        for (const tree of orderedTrees) {
            const treeNodes = this.flattenForIntermediateResults(tree);
            for (const node of treeNodes) {
                if (!allNodes.find(n => n.nodeId === node.nodeId)) {
                    allNodes.push(node);
                }
            }
        }
        return allNodes;
    }
    findSeedDependencies(node) {
        const dependencies = [];
        const traverse = (currentNode) => {
            if (currentNode.nodeType === 'SEED') {
                const seedAttributes = currentNode.nodeData;
                if (seedAttributes.sourceMetricId) {
                    dependencies.push(seedAttributes.sourceMetricId);
                }
            }
            if (currentNode.children) {
                for (const child of currentNode.children) {
                    traverse(child);
                }
            }
        };
        traverse(node);
        return [...new Set(dependencies)];
    }
    validateTree(tree) {
        const errors = [];
        const visitedNodes = new Set();
        const validateNode = (node, path) => {
            if (path.includes(node.nodeId)) {
                errors.push(`Circular reference detected in tree: ${[...path, node.nodeId].join(' -> ')}`);
                return;
            }
            if (visitedNodes.has(node.nodeId) && !node.isReference) {
                errors.push(`Duplicate node ID found: ${node.nodeId}`);
                return;
            }
            if (!node.isReference) {
                visitedNodes.add(node.nodeId);
            }
            this.validateNodeConstraints(node, errors);
            if (node.children && !node.isReference) {
                for (const child of node.children) {
                    validateNode(child, [...path, node.nodeId]);
                }
            }
        };
        validateNode(tree.tree, []);
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    validateNodeConstraints(node, errors) {
        switch (node.nodeType) {
            case 'OPERATOR':
                if (!node.isReference && (!node.children || node.children.length === 0)) {
                    errors.push(`OPERATOR node ${node.nodeId} must have at least one child`);
                }
                break;
            case 'METRIC':
                if (!node.isReference && (!node.children || node.children.length !== 1)) {
                    errors.push(`METRIC node ${node.nodeId} must have exactly one child`);
                }
                break;
            case 'DATA':
            case 'CONSTANT':
                if (node.children && node.children.length > 0 && !node.isReference) {
                    errors.push(`${node.nodeType} node ${node.nodeId} should not have children`);
                }
                break;
            case 'SEED':
                if (node.children && node.children.length > 0 && !node.isReference) {
                    errors.push(`SEED node ${node.nodeId} should not have children`);
                }
                const seedAttributes = node.nodeData;
                if (!seedAttributes || !seedAttributes.sourceMetricId) {
                    errors.push(`SEED node ${node.nodeId} must have sourceMetricId`);
                }
                break;
            default:
                errors.push(`Unknown node type: ${node.nodeType}`);
        }
    }
    getMetricNodeIds(trees) {
        return trees.map(tree => tree.rootMetricNodeId);
    }
    findTreeContainingNode(trees, nodeId) {
        for (const tree of trees) {
            if (this.treeContainsNode(tree.tree, nodeId)) {
                return tree;
            }
        }
        return null;
    }
    treeContainsNode(node, nodeId) {
        if (node.nodeId === nodeId) {
            return true;
        }
        if (node.children && !node.isReference) {
            for (const child of node.children) {
                if (this.treeContainsNode(child, nodeId)) {
                    return true;
                }
            }
        }
        return false;
    }
};
exports.TreeProcessor = TreeProcessor;
exports.TreeProcessor = TreeProcessor = __decorate([
    (0, common_1.Injectable)()
], TreeProcessor);
//# sourceMappingURL=tree-processor.js.map