/**
 * Refactored Calculation Engine Tests - Phase 3.2
 * Comprehensive test suite for the new unified calculation engine
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CalculationEngineCore } from '../calculation-engine-core';
import { CalculationEngineCoreModule } from '../calculation-engine-core.module';
import { 
  CalculationRequest,
  CalculationResult,
  CalculationTree,
  CalculationTreeNode,
  Variable,
  DataNodeAttributes,
  ConstantNodeAttributes,
  OperatorNodeAttributes,
  MetricNodeAttributes,
  SeedNodeAttributes
} from '../types/calculation-types';

describe('CalculationEngineCore', () => {
  let engine: CalculationEngineCore;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [CalculationEngineCoreModule],
    }).compile();

    engine = module.get<CalculationEngineCore>(CalculationEngineCore);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Basic Functionality', () => {
    it('should be defined', () => {
      expect(engine).toBeDefined();
    });

    it('should return engine statistics', () => {
      const stats = engine.getStats();
      
      expect(stats).toHaveProperty('supportedCalculationTypes');
      expect(stats).toHaveProperty('supportedNodeTypes');
      expect(stats).toHaveProperty('cacheStats');
      
      expect(stats.supportedCalculationTypes).toEqual(['historical', 'forecast', 'budget']);
      expect(stats.supportedNodeTypes).toContain('DATA');
      expect(stats.supportedNodeTypes).toContain('CONSTANT');
      expect(stats.supportedNodeTypes).toContain('OPERATOR');
      expect(stats.supportedNodeTypes).toContain('METRIC');
      expect(stats.supportedNodeTypes).toContain('SEED');
    });

    it('should clear caches', () => {
      expect(() => engine.clearCaches()).not.toThrow();
    });
  });

  describe('Request Validation', () => {
    it('should validate a basic request structure', async () => {
      const request: CalculationRequest = {
        trees: [],
        periods: {
          forecast: { start: '01-2025', end: '12-2025' },
          actual: { start: '01-2024', end: '12-2024' }
        },
        calculationTypes: ['forecast'],
        includeAllNodes: false,
        variables: []
      };

      const validation = await engine.validateRequest(request);
      
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('errors');
      expect(validation).toHaveProperty('warnings');
    });

    it('should reject invalid calculation types', async () => {
      const request: CalculationRequest = {
        trees: [],
        periods: {
          forecast: { start: '01-2025', end: '12-2025' },
          actual: { start: '01-2024', end: '12-2024' }
        },
        calculationTypes: ['invalid' as any],
        includeAllNodes: false,
        variables: []
      };

      const validation = await engine.validateRequest(request);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(expect.stringContaining('Invalid calculation types'));
    });

    it('should reject invalid period formats', async () => {
      const request: CalculationRequest = {
        trees: [],
        periods: {
          forecast: { start: 'invalid', end: '12-2025' },
          actual: { start: '01-2024', end: '12-2024' }
        },
        calculationTypes: ['forecast'],
        includeAllNodes: false,
        variables: []
      };

      const validation = await engine.validateRequest(request);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(expect.stringContaining('Invalid forecast start period format'));
    });
  });

  describe('Dry Run', () => {
    it('should perform dry run validation', async () => {
      const request: CalculationRequest = {
        trees: createSimpleMetricTree(),
        periods: {
          forecast: { start: '01-2025', end: '03-2025' },
          actual: { start: '10-2024', end: '12-2024' }
        },
        calculationTypes: ['forecast'],
        includeAllNodes: true,
        variables: createTestVariables()
      };

      const dryRun = await engine.dryRun(request);
      
      expect(dryRun).toHaveProperty('isValid');
      expect(dryRun).toHaveProperty('estimatedNodes');
      expect(dryRun).toHaveProperty('estimatedMonths');
      
      if (dryRun.isValid) {
        expect(dryRun.estimatedNodes).toBeGreaterThan(0);
        expect(dryRun.estimatedMonths).toBeGreaterThan(0);
      }
    });
  });

  describe('Simple Calculations', () => {
    it('should calculate a constant node', async () => {
      const constantTree = createConstantTree();
      const request: CalculationRequest = {
        trees: [constantTree],
        periods: {
          forecast: { start: '01-2025', end: '02-2025' },
          actual: { start: '11-2024', end: '12-2024' }
        },
        calculationTypes: ['forecast'],
        includeAllNodes: true,
        variables: []
      };

      const result = await engine.calculate(request);
      
      expect(result).toBeDefined();
      expect(result.nodeResults).toHaveLength(2); // CONSTANT + METRIC
      
      const constantNode = result.nodeResults.find(n => n.nodeType === 'CONSTANT');
      expect(constantNode).toBeDefined();
      expect(constantNode!.values).toHaveLength(2); // 2 months
      expect(constantNode!.values[0].forecast).toBe(100000);
      expect(constantNode!.values[0].calculated).toBe(100000);
    });

    it('should calculate a data node with variables', async () => {
      const dataTree = createDataTree();
      const variables = createTestVariables();
      
      const request: CalculationRequest = {
        trees: [dataTree],
        periods: {
          forecast: { start: '01-2025', end: '02-2025' },
          actual: { start: '11-2024', end: '12-2024' }
        },
        calculationTypes: ['forecast'],
        includeAllNodes: true,
        variables
      };

      const result = await engine.calculate(request);
      
      expect(result).toBeDefined();
      expect(result.nodeResults).toHaveLength(2); // DATA + METRIC
      
      const dataNode = result.nodeResults.find(n => n.nodeType === 'DATA');
      expect(dataNode).toBeDefined();
      expect(dataNode!.values).toHaveLength(2); // 2 months
    });

    it('should calculate an operator node', async () => {
      const operatorTree = createOperatorTree();
      
      const request: CalculationRequest = {
        trees: [operatorTree],
        periods: {
          forecast: { start: '01-2025', end: '02-2025' },
          actual: { start: '11-2024', end: '12-2024' }
        },
        calculationTypes: ['forecast'],
        includeAllNodes: true,
        variables: []
      };

      const result = await engine.calculate(request);
      
      expect(result).toBeDefined();
      expect(result.nodeResults).toHaveLength(4); // 2 CONSTANT + 1 OPERATOR + 1 METRIC
      
      const operatorNode = result.nodeResults.find(n => n.nodeType === 'OPERATOR');
      expect(operatorNode).toBeDefined();
      expect(operatorNode!.values[0].forecast).toBe(150000); // 100000 + 50000
      expect(operatorNode!.values[0].calculated).toBe(150000);
    });
  });

  describe('Multiple Calculation Types', () => {
    it('should calculate multiple types in single request', async () => {
      const tree = createConstantTree();
      const request: CalculationRequest = {
        trees: [tree],
        periods: {
          forecast: { start: '01-2025', end: '02-2025' },
          actual: { start: '11-2024', end: '12-2024' }
        },
        calculationTypes: ['historical', 'forecast', 'budget'],
        includeAllNodes: true,
        variables: []
      };

      const result = await engine.calculate(request);
      
      expect(result).toBeDefined();
      expect(result.calculationTypes).toEqual(['historical', 'forecast', 'budget']);
      
      const constantNode = result.nodeResults.find(n => n.nodeType === 'CONSTANT');
      expect(constantNode).toBeDefined();
      
      // Check that all calculation types are present for forecast months
      const forecastMonthValue = constantNode!.values.find(v => v.month === '01-2025');
      expect(forecastMonthValue).toBeDefined();
      expect(forecastMonthValue!.forecast).toBe(100000);
      expect(forecastMonthValue!.budget).toBe(100000);
      
      // Check that historical is only present for actual months
      const actualMonthValue = constantNode!.values.find(v => v.month === '12-2024');
      expect(actualMonthValue).toBeDefined();
      expect(actualMonthValue!.historical).toBe(100000);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing variables gracefully', async () => {
      const dataTree = createDataTree();
      
      const request: CalculationRequest = {
        trees: [dataTree],
        periods: {
          forecast: { start: '01-2025', end: '01-2025' },
          actual: { start: '12-2024', end: '12-2024' }
        },
        calculationTypes: ['forecast'],
        includeAllNodes: true,
        variables: [] // No variables provided
      };

      const result = await engine.calculate(request);
      
      expect(result).toBeDefined();
      
      // DATA node should return null values when variable is missing
      const dataNode = result.nodeResults.find(n => n.nodeType === 'DATA');
      expect(dataNode).toBeDefined();
      expect(dataNode!.values[0].forecast).toBeNull();
    });

    it('should handle circular dependencies', async () => {
      // This would need a more complex setup to create actual circular dependencies
      // For now, just test that the validation catches basic issues
      const request: CalculationRequest = {
        trees: [],
        periods: {
          forecast: { start: '01-2025', end: '01-2025' },
          actual: { start: '12-2024', end: '12-2024' }
        },
        calculationTypes: ['forecast'],
        includeAllNodes: true,
        variables: []
      };

      await expect(engine.calculate(request)).rejects.toThrow();
    });
  });

  // Helper functions to create test data
  function createSimpleMetricTree(): CalculationTree[] {
    const constantNode: CalculationTreeNode = {
      nodeId: 'constant-1',
      nodeType: 'CONSTANT',
      nodeData: { name: 'Test Constant', value: 100000 } as ConstantNodeAttributes,
      children: []
    };

    const metricNode: CalculationTreeNode = {
      nodeId: 'metric-1',
      nodeType: 'METRIC',
      nodeData: {
        label: 'Test Metric',
        budgetVariableId: '',
        historicalVariableId: '',
        useCalculated: true
      } as MetricNodeAttributes,
      children: [constantNode]
    };

    return [{
      rootMetricNodeId: 'metric-1',
      tree: metricNode
    }];
  }

  function createConstantTree(): CalculationTree {
    const constantNode: CalculationTreeNode = {
      nodeId: 'constant-1',
      nodeType: 'CONSTANT',
      nodeData: { name: 'Test Constant', value: 100000 } as ConstantNodeAttributes,
      children: []
    };

    const metricNode: CalculationTreeNode = {
      nodeId: 'metric-1',
      nodeType: 'METRIC',
      nodeData: {
        label: 'Test Metric',
        budgetVariableId: '',
        historicalVariableId: '',
        useCalculated: true
      } as MetricNodeAttributes,
      children: [constantNode]
    };

    return {
      rootMetricNodeId: 'metric-1',
      tree: metricNode
    };
  }

  function createDataTree(): CalculationTree {
    const dataNode: CalculationTreeNode = {
      nodeId: 'data-1',
      nodeType: 'DATA',
      nodeData: {
        name: 'Test Data',
        variableId: 'var-1',
        offsetMonths: 0
      } as DataNodeAttributes,
      children: []
    };

    const metricNode: CalculationTreeNode = {
      nodeId: 'metric-1',
      nodeType: 'METRIC',
      nodeData: {
        label: 'Test Metric',
        budgetVariableId: '',
        historicalVariableId: '',
        useCalculated: true
      } as MetricNodeAttributes,
      children: [dataNode]
    };

    return {
      rootMetricNodeId: 'metric-1',
      tree: metricNode
    };
  }

  function createOperatorTree(): CalculationTree {
    const constant1: CalculationTreeNode = {
      nodeId: 'constant-1',
      nodeType: 'CONSTANT',
      nodeData: { name: 'Constant 1', value: 100000 } as ConstantNodeAttributes,
      children: []
    };

    const constant2: CalculationTreeNode = {
      nodeId: 'constant-2',
      nodeType: 'CONSTANT',
      nodeData: { name: 'Constant 2', value: 50000 } as ConstantNodeAttributes,
      children: []
    };

    const operatorNode: CalculationTreeNode = {
      nodeId: 'operator-1',
      nodeType: 'OPERATOR',
      nodeData: {
        op: '+',
        inputOrder: ['constant-1', 'constant-2']
      } as OperatorNodeAttributes,
      children: [constant1, constant2]
    };

    const metricNode: CalculationTreeNode = {
      nodeId: 'metric-1',
      nodeType: 'METRIC',
      nodeData: {
        label: 'Test Metric',
        budgetVariableId: '',
        historicalVariableId: '',
        useCalculated: true
      } as MetricNodeAttributes,
      children: [operatorNode]
    };

    return {
      rootMetricNodeId: 'metric-1',
      tree: metricNode
    };
  }

  function createTestVariables(): Variable[] {
    return [
      {
        id: 'var-1',
        name: 'Test Variable 1',
        type: 'ACTUAL',
        organizationId: 'org-1',
        timeSeries: [
          { date: new Date('2024-12-01'), value: 75000 },
          { date: new Date('2025-01-01'), value: 80000 },
          { date: new Date('2025-02-01'), value: 85000 }
        ]
      }
    ];
  }
});
