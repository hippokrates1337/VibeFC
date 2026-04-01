/**
 * Calculation Validator Service - Phase 1.2
 * Validates calculation requests and components
 */

import { Injectable } from '@nestjs/common';
import { 
  CalculationRequest, 
  ValidationResult, 
  CalculationTree,
  Variable,
  CalculationTreeNode,
  DataNodeAttributes,
  MetricNodeAttributes,
  SeedNodeAttributes
} from '../types/calculation-types';
import { TreeProcessor } from './tree-processor';
import { PeriodService } from './period-service';

@Injectable()
export class CalculationValidator {
  
  constructor(
    private readonly treeProcessor: TreeProcessor,
    private readonly periodService: PeriodService
  ) {}

  /**
   * Validate complete calculation request
   */
  async validate(request: CalculationRequest): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate periods
    const periodValidation = this.periodService.validatePeriods(request.periods);
    errors.push(...periodValidation.errors);
    warnings.push(...periodValidation.warnings);

    // Validate calculation types
    const calculationTypeValidation = this.validateCalculationTypes(request.calculationTypes);
    errors.push(...calculationTypeValidation.errors);
    warnings.push(...calculationTypeValidation.warnings);

    // Validate trees
    const treeValidation = this.validateTrees(request.trees);
    errors.push(...treeValidation.errors);
    warnings.push(...treeValidation.warnings);

    // Validate variables
    const variableValidation = this.validateVariables(request.variables);
    errors.push(...variableValidation.errors);
    warnings.push(...variableValidation.warnings);

    // Cross-validation between trees and variables
    const crossValidation = this.validateTreeVariableReferences(request.trees, request.variables);
    errors.push(...crossValidation.errors);
    warnings.push(...crossValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate calculation types
   */
  private validateCalculationTypes(calculationTypes: string[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!calculationTypes || calculationTypes.length === 0) {
      errors.push('At least one calculation type must be specified');
      return { isValid: false, errors, warnings };
    }

    const validTypes = ['historical', 'forecast', 'budget'];
    const invalidTypes = calculationTypes.filter(type => !validTypes.includes(type));
    
    if (invalidTypes.length > 0) {
      errors.push(`Invalid calculation types: ${invalidTypes.join(', ')}. Valid types are: ${validTypes.join(', ')}`);
    }

    // Check for duplicates
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

  /**
   * Validate calculation trees
   */
  private validateTrees(trees: CalculationTree[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!trees || trees.length === 0) {
      errors.push('At least one calculation tree must be provided');
      return { isValid: false, errors, warnings };
    }

    // Validate individual trees
    for (let i = 0; i < trees.length; i++) {
      const tree = trees[i];
      const treeValidation = this.treeProcessor.validateTree(tree);
      
      if (!treeValidation.isValid) {
        errors.push(...treeValidation.errors.map(err => `Tree ${i + 1} (${tree.rootMetricNodeId}): ${err}`));
      }
    }

    // Validate tree dependencies
    try {
      this.treeProcessor.orderByDependencies(trees);
    } catch (error) {
      errors.push(`Tree dependency validation failed: ${error.message}`);
    }

    // Check for duplicate metric IDs
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

  /**
   * Validate variables
   */
  private validateVariables(variables: Variable[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!variables || variables.length === 0) {
      warnings.push('No variables provided - calculations may fail if DATA nodes reference variables');
      return { isValid: true, errors, warnings };
    }

    // Check for duplicate variable IDs
    const variableIds = variables.map(v => v.id);
    const duplicateIds = variableIds.filter((id, index) => variableIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push(`Duplicate variable IDs found: ${[...new Set(duplicateIds)].join(', ')}`);
    }

    // Validate individual variables
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
      } else if (variable.timeSeries.length === 0) {
        warnings.push(`Variable ${variable.id} has empty timeSeries data`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate tree-variable references
   */
  private validateTreeVariableReferences(trees: CalculationTree[], variables: Variable[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const variableIds = new Set(variables.map(v => v.id));
    const referencedVariableIds = new Set<string>();

    // Find all variable references in trees
    for (const tree of trees) {
      this.collectVariableReferences(tree.tree, referencedVariableIds);
    }

    // Check for missing variables
    for (const variableId of referencedVariableIds) {
      if (!variableIds.has(variableId)) {
        errors.push(`Variable ${variableId} is referenced in calculation trees but not provided in variables list`);
      }
    }

    // Check for unused variables
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

  /**
   * Collect all variable references from a tree
   */
  private collectVariableReferences(node: CalculationTreeNode, referencedIds: Set<string>): void {
    switch (node.nodeType) {
      case 'DATA':
        const dataAttrs = node.nodeData as DataNodeAttributes;
        if (dataAttrs?.variableId) {
          referencedIds.add(dataAttrs.variableId);
        }
        break;

      case 'METRIC':
        const metricAttrs = node.nodeData as MetricNodeAttributes;
        if (metricAttrs?.budgetVariableId) {
          referencedIds.add(metricAttrs.budgetVariableId);
        }
        if (metricAttrs?.historicalVariableId) {
          referencedIds.add(metricAttrs.historicalVariableId);
        }
        break;
    }

    // Recursively check children (skip for reference nodes)
    if (node.children && !node.isReference) {
      for (const child of node.children) {
        this.collectVariableReferences(child, referencedIds);
      }
    }
  }

  /**
   * Validate that required variables have data for calculation periods
   */
  async validateVariableData(
    variables: Variable[], 
    periods: { forecast: { start: string; end: string }; actual: { start: string; end: string } }
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const forecastMonths = this.periodService.getMonthsBetween(periods.forecast.start, periods.forecast.end);
    const actualMonths = this.periodService.getMonthsBetween(periods.actual.start, periods.actual.end);
    const allRequiredMonths = [...new Set([...forecastMonths, ...actualMonths])];

    for (const variable of variables) {
      if (!variable.timeSeries || variable.timeSeries.length === 0) {
        continue; // Already warned about in validateVariables
      }

      // Check data availability for required months
      const availableMonths = new Set(
        variable.timeSeries.map((ts: any) => this.periodService.dateToMMYYYY(ts.date))
      );

      const missingMonths = allRequiredMonths.filter(month => !availableMonths.has(month));
      
      if (missingMonths.length > 0) {
        warnings.push(
          `Variable ${variable.name} (${variable.id}) missing data for months: ${missingMonths.join(', ')}`
        );
      }

      // Check for null values in available data
      const nullValueMonths = variable.timeSeries
        .filter((ts: any) => ts.value === null)
        .map((ts: any) => this.periodService.dateToMMYYYY(ts.date))
        .filter((month: string) => allRequiredMonths.includes(month));

      if (nullValueMonths.length > 0) {
        warnings.push(
          `Variable ${variable.name} (${variable.id}) has null values for months: ${nullValueMonths.join(', ')}`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Quick validation for basic structure (used in performance-critical paths)
   */
  validateBasicStructure(request: CalculationRequest): ValidationResult {
    const errors: string[] = [];

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
}
