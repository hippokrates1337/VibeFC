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
exports.CalculationValidator = void 0;
const common_1 = require("@nestjs/common");
const tree_processor_1 = require("./tree-processor");
const period_service_1 = require("./period-service");
let CalculationValidator = class CalculationValidator {
    constructor(treeProcessor, periodService) {
        this.treeProcessor = treeProcessor;
        this.periodService = periodService;
    }
    async validate(request) {
        const errors = [];
        const warnings = [];
        const periodValidation = this.periodService.validatePeriods(request.periods);
        errors.push(...periodValidation.errors);
        warnings.push(...periodValidation.warnings);
        const calculationTypeValidation = this.validateCalculationTypes(request.calculationTypes);
        errors.push(...calculationTypeValidation.errors);
        warnings.push(...calculationTypeValidation.warnings);
        const treeValidation = this.validateTrees(request.trees);
        errors.push(...treeValidation.errors);
        warnings.push(...treeValidation.warnings);
        const variableValidation = this.validateVariables(request.variables);
        errors.push(...variableValidation.errors);
        warnings.push(...variableValidation.warnings);
        const crossValidation = this.validateTreeVariableReferences(request.trees, request.variables);
        errors.push(...crossValidation.errors);
        warnings.push(...crossValidation.warnings);
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    validateCalculationTypes(calculationTypes) {
        const errors = [];
        const warnings = [];
        if (!calculationTypes || calculationTypes.length === 0) {
            errors.push('At least one calculation type must be specified');
            return { isValid: false, errors, warnings };
        }
        const validTypes = ['historical', 'forecast', 'budget'];
        const invalidTypes = calculationTypes.filter(type => !validTypes.includes(type));
        if (invalidTypes.length > 0) {
            errors.push(`Invalid calculation types: ${invalidTypes.join(', ')}. Valid types are: ${validTypes.join(', ')}`);
        }
        const uniqueTypes = [...new Set(calculationTypes)];
        if (uniqueTypes.length !== calculationTypes.length) {
            warnings.push('Duplicate calculation types found and will be deduplicated');
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    validateTrees(trees) {
        const errors = [];
        const warnings = [];
        if (!trees || trees.length === 0) {
            errors.push('At least one calculation tree must be provided');
            return { isValid: false, errors, warnings };
        }
        for (let i = 0; i < trees.length; i++) {
            const tree = trees[i];
            const treeValidation = this.treeProcessor.validateTree(tree);
            if (!treeValidation.isValid) {
                errors.push(...treeValidation.errors.map(err => `Tree ${i + 1} (${tree.rootMetricNodeId}): ${err}`));
            }
        }
        try {
            this.treeProcessor.orderByDependencies(trees);
        }
        catch (error) {
            errors.push(`Tree dependency validation failed: ${error.message}`);
        }
        const metricIds = trees.map(tree => tree.rootMetricNodeId);
        const duplicateIds = metricIds.filter((id, index) => metricIds.indexOf(id) !== index);
        if (duplicateIds.length > 0) {
            errors.push(`Duplicate metric IDs found: ${[...new Set(duplicateIds)].join(', ')}`);
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    validateVariables(variables) {
        const errors = [];
        const warnings = [];
        if (!variables || variables.length === 0) {
            warnings.push('No variables provided - calculations may fail if DATA nodes reference variables');
            return { isValid: true, errors, warnings };
        }
        const variableIds = variables.map(v => v.id);
        const duplicateIds = variableIds.filter((id, index) => variableIds.indexOf(id) !== index);
        if (duplicateIds.length > 0) {
            errors.push(`Duplicate variable IDs found: ${[...new Set(duplicateIds)].join(', ')}`);
        }
        for (const variable of variables) {
            if (!variable.id) {
                errors.push('Variable missing ID');
                continue;
            }
            if (!variable.name) {
                warnings.push(`Variable ${variable.id} missing name`);
            }
            if (!variable.type || !['ACTUAL', 'BUDGET', 'INPUT', 'UNKNOWN'].includes(variable.type)) {
                warnings.push(`Variable ${variable.id} has invalid type: ${variable.type}`);
            }
            if (!variable.timeSeries || !Array.isArray(variable.timeSeries)) {
                warnings.push(`Variable ${variable.id} missing or invalid timeSeries data`);
            }
            else if (variable.timeSeries.length === 0) {
                warnings.push(`Variable ${variable.id} has empty timeSeries data`);
            }
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    validateTreeVariableReferences(trees, variables) {
        const errors = [];
        const warnings = [];
        const variableIds = new Set(variables.map(v => v.id));
        const referencedVariableIds = new Set();
        for (const tree of trees) {
            this.collectVariableReferences(tree.tree, referencedVariableIds);
        }
        for (const variableId of referencedVariableIds) {
            if (!variableIds.has(variableId)) {
                errors.push(`Variable ${variableId} is referenced in calculation trees but not provided in variables list`);
            }
        }
        const unusedVariables = variables.filter(v => !referencedVariableIds.has(v.id));
        if (unusedVariables.length > 0) {
            warnings.push(`Unused variables: ${unusedVariables.map(v => v.id).join(', ')}`);
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    collectVariableReferences(node, referencedIds) {
        switch (node.nodeType) {
            case 'DATA':
                const dataAttrs = node.nodeData;
                if (dataAttrs?.variableId) {
                    referencedIds.add(dataAttrs.variableId);
                }
                break;
            case 'METRIC':
                const metricAttrs = node.nodeData;
                if (metricAttrs?.budgetVariableId) {
                    referencedIds.add(metricAttrs.budgetVariableId);
                }
                if (metricAttrs?.historicalVariableId) {
                    referencedIds.add(metricAttrs.historicalVariableId);
                }
                break;
        }
        if (node.children && !node.isReference) {
            for (const child of node.children) {
                this.collectVariableReferences(child, referencedIds);
            }
        }
    }
    async validateVariableData(variables, periods) {
        const errors = [];
        const warnings = [];
        const forecastMonths = this.periodService.getMonthsBetween(periods.forecast.start, periods.forecast.end);
        const actualMonths = this.periodService.getMonthsBetween(periods.actual.start, periods.actual.end);
        const allRequiredMonths = [...new Set([...forecastMonths, ...actualMonths])];
        for (const variable of variables) {
            if (!variable.timeSeries || variable.timeSeries.length === 0) {
                continue;
            }
            const availableMonths = new Set(variable.timeSeries.map((ts) => this.periodService.dateToMMYYYY(ts.date)));
            const missingMonths = allRequiredMonths.filter(month => !availableMonths.has(month));
            if (missingMonths.length > 0) {
                warnings.push(`Variable ${variable.name} (${variable.id}) missing data for months: ${missingMonths.join(', ')}`);
            }
            const nullValueMonths = variable.timeSeries
                .filter((ts) => ts.value === null)
                .map((ts) => this.periodService.dateToMMYYYY(ts.date))
                .filter((month) => allRequiredMonths.includes(month));
            if (nullValueMonths.length > 0) {
                warnings.push(`Variable ${variable.name} (${variable.id}) has null values for months: ${nullValueMonths.join(', ')}`);
            }
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    validateBasicStructure(request) {
        const errors = [];
        if (!request) {
            errors.push('Request is null or undefined');
            return { isValid: false, errors, warnings: [] };
        }
        if (!request.trees || !Array.isArray(request.trees) || request.trees.length === 0) {
            errors.push('Missing or invalid trees array');
        }
        if (!request.periods) {
            errors.push('Missing periods configuration');
        }
        if (!request.calculationTypes || !Array.isArray(request.calculationTypes) || request.calculationTypes.length === 0) {
            errors.push('Missing or invalid calculationTypes array');
        }
        if (!request.variables || !Array.isArray(request.variables)) {
            errors.push('Missing or invalid variables array');
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings: []
        };
    }
};
exports.CalculationValidator = CalculationValidator;
exports.CalculationValidator = CalculationValidator = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tree_processor_1.TreeProcessor,
        period_service_1.PeriodService])
], CalculationValidator);
//# sourceMappingURL=calculation-validator.js.map