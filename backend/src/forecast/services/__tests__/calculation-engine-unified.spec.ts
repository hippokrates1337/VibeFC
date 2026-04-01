import { CalculationEngine } from '../calculation-engine/calculation-engine';
import { VariableDataService } from '../calculation-engine/variable-data-service';
import type {
  CalculationTree,
  CalculationTreeNode,
  Variable,
  UnifiedCalculationRequest,
  UnifiedCalculationResult,
  CalculationType,
  DataNodeAttributes,
  ConstantNodeAttributes,
  OperatorNodeAttributes,
  MetricNodeAttributes,
} from '../calculation-engine/types';

// Mock VariableDataService
const mockVariableDataService = {
  getVariableValueForMonth: jest.fn(),
  getVariableValueWithOffset: jest.fn(),
} as jest.Mocked<Pick<VariableDataService, 'getVariableValueForMonth' | 'getVariableValueWithOffset'>>;

describe('CalculationEngine - Unified Calculation (Phase 2)', () => {
  let engine: CalculationEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new CalculationEngine(mockVariableDataService as any);
  });

  // Test data setup
  const testVariables: Variable[] = [
    {
      id: 'var-revenue',
      name: 'Revenue',
      type: 'ACTUAL',
      organizationId: 'org-1',
      timeSeries: [
        { date: new Date('2025-02-01T00:00:00.000Z'), value: 1000 },
        { date: new Date('2025-03-01T00:00:00.000Z'), value: 1200 },
        { date: new Date('2025-04-01T00:00:00.000Z'), value: 1100 },
      ],
    },
    {
      id: 'var-budget',
      name: 'Budget Revenue',
      type: 'BUDGET',
      organizationId: 'org-1',
      timeSeries: [
        { date: new Date('2025-02-01T00:00:00.000Z'), value: 950 },
        { date: new Date('2025-03-01T00:00:00.000Z'), value: 1150 },
        { date: new Date('2025-04-01T00:00:00.000Z'), value: 1050 },
      ],
    },
    {
      id: 'var-historical',
      name: 'Historical Revenue',
      type: 'ACTUAL',
      organizationId: 'org-1',
      timeSeries: [
        { date: new Date('2024-11-01T00:00:00.000Z'), value: 800 },
        { date: new Date('2024-12-01T00:00:00.000Z'), value: 900 },
        { date: new Date('2025-01-01T00:00:00.000Z'), value: 950 },
      ],
    },
  ];

  // Create simple test calculation tree using constants for predictable results
  const createTestTree = (): CalculationTree => {
    const constantNode: CalculationTreeNode = {
      nodeId: 'const-1',
      nodeType: 'CONSTANT',
      nodeData: {
        name: 'Test Constant',
        value: 100,
      } as ConstantNodeAttributes,
      children: [],
    };

    const metricNode: CalculationTreeNode = {
      nodeId: 'metric-1',
      nodeType: 'METRIC',
      nodeData: {
        label: 'Test Metric',
        budgetVariableId: 'var-budget',
        historicalVariableId: 'var-historical',
        useCalculated: true,
      } as MetricNodeAttributes,
      children: [constantNode],
    };

    return {
      rootMetricNodeId: 'metric-1',
      tree: metricNode,
    };
  };

  describe('calculateUnified', () => {
    beforeEach(() => {
      // Mock variable data service responses
      mockVariableDataService.getVariableValueForMonth.mockImplementation((variableId: string, targetDate: Date, variables: readonly Variable[]) => {
        const variable = variables.find((v: Variable) => v.id === variableId);
        if (!variable) return null;

        const targetTime = targetDate.getTime();
        const timeSeriesPoint = variable.timeSeries.find((ts: any) => {
          const tsTime = ts.date.getTime();
          return Math.abs(tsTime - targetTime) < 24 * 60 * 60 * 1000; // Within 1 day
        });

        return timeSeriesPoint?.value ?? null;
      });
    });

    it('should validate MM-YYYY periods', async () => {
      const trees = [createTestTree()];
      const request: UnifiedCalculationRequest = {
        calculationTypes: ['forecast'],
        includeIntermediateNodes: false,
      };

      await expect(
        engine.calculateWithPeriods(
          trees,
          'invalid-format', // Invalid forecast start
          '04-2025',
          '11-2024',
          '01-2025',
          testVariables,
          request
        )
      ).rejects.toThrow('Invalid MM-YYYY format');
    });

    it('should validate period ranges', async () => {
      const trees = [createTestTree()];
      const request: UnifiedCalculationRequest = {
        calculationTypes: ['forecast'],
        includeIntermediateNodes: false,
      };

      await expect(
        engine.calculateWithPeriods(
          trees,
          '04-2025', // End before start
          '02-2025',
          '11-2024',
          '01-2025',
          testVariables,
          request
        )
      ).rejects.toThrow('Forecast end month must be after or equal to start month');
    });

    it('should calculate forecast values only when requested', async () => {
      const trees = [createTestTree()];
      const request: UnifiedCalculationRequest = {
        calculationTypes: ['forecast'],
        includeIntermediateNodes: false,
      };

      const result = await engine.calculateWithPeriods(
        trees,
        '02-2025', // Forecast period
        '04-2025',
        '11-2024', // Actual period  
        '01-2025',
        testVariables,
        request
      );

      expect(result.calculationTypes).toEqual(['forecast']);
      expect(result.periodInfo.forecastStartMonth).toBe('02-2025');
      expect(result.periodInfo.forecastEndMonth).toBe('04-2025');
      expect(result.periodInfo.actualStartMonth).toBe('11-2024');
      expect(result.periodInfo.actualEndMonth).toBe('01-2025');

      // Should have metric results
      expect(result.metrics).toHaveLength(1);
      const metric = result.metrics[0];
      expect(metric.nodeId).toBe('metric-1');
      expect(metric.nodeType).toBe('METRIC');

      // Should have 3 months of forecast values
      expect(metric.values).toHaveLength(3);
      
      // Check each month has forecast values and no historical/budget
      for (const monthValue of metric.values) {
        expect(monthValue.month).toMatch(/^(02|03|04)-2025$/);
        expect(monthValue.forecast).toBe(100); // From constant node
        expect(monthValue.historical).toBeNull();
        expect(monthValue.budget).toBeNull();
      }
    });

    it('should calculate historical values only when requested', async () => {
      const trees = [createTestTree()];
      const request: UnifiedCalculationRequest = {
        calculationTypes: ['historical'],
        includeIntermediateNodes: false,
      };

      const result = await engine.calculateWithPeriods(
        trees,
        '02-2025', // Forecast period
        '04-2025',
        '11-2024', // Actual period  
        '01-2025',
        testVariables,
        request
      );

      expect(result.calculationTypes).toEqual(['historical']);

      // Should have metric results
      expect(result.metrics).toHaveLength(1);
      const metric = result.metrics[0];
      
      // Should have values for actual period only (3 months)
      expect(metric.values).toHaveLength(3);
      
      // Check each month has historical values and no forecast/budget
      for (const monthValue of metric.values) {
        expect(monthValue.month).toMatch(/^(11|12)-2024$|^01-2025$/);
        expect(monthValue.historical).toBe(100); // From constant node
        expect(monthValue.forecast).toBeNull();
        expect(monthValue.budget).toBeNull();
      }
    });

    it('should calculate budget values only when requested', async () => {
      const trees = [createTestTree()];
      const request: UnifiedCalculationRequest = {
        calculationTypes: ['budget'],
        includeIntermediateNodes: false,
      };

      const result = await engine.calculateWithPeriods(
        trees,
        '02-2025', // Forecast period (budget uses forecast period)
        '04-2025',
        '11-2024', // Actual period  
        '01-2025',
        testVariables,
        request
      );

      expect(result.calculationTypes).toEqual(['budget']);

      // Should have metric results
      expect(result.metrics).toHaveLength(1);
      const metric = result.metrics[0];
      
      // Should have values for forecast period (3 months) since budget uses forecast period
      expect(metric.values).toHaveLength(3);
      
      // Check each month has budget values and no forecast/historical
      for (const monthValue of metric.values) {
        expect(monthValue.month).toMatch(/^(02|03|04)-2025$/);
        expect(monthValue.budget).toBe(100); // From constant node  
        expect(monthValue.forecast).toBeNull();
        expect(monthValue.historical).toBeNull();
      }
    });

    it('should calculate all value types when requested', async () => {
      const trees = [createTestTree()];
      const request: UnifiedCalculationRequest = {
        calculationTypes: ['historical', 'forecast', 'budget'],
        includeIntermediateNodes: false,
      };

      const result = await engine.calculateWithPeriods(
        trees,
        '02-2025', // Forecast period
        '03-2025',
        '12-2024', // Actual period  
        '01-2025',
        testVariables,
        request
      );

      expect(result.calculationTypes).toEqual(['historical', 'forecast', 'budget']);

      // Should have metric results
      expect(result.metrics).toHaveLength(1);
      const metric = result.metrics[0];
      
      // Should have values for combined period (4 months total: 2 actual + 2 forecast)
      expect(metric.values).toHaveLength(4);

      // Check actual period months
      const actualMonths = metric.values.filter(v => ['12-2024', '01-2025'].includes(v.month));
      expect(actualMonths).toHaveLength(2);
      for (const month of actualMonths) {
        expect(month.historical).toBe(100); // From constant node
        expect(month.forecast).toBeNull();
        expect(month.budget).toBeNull();
      }

      // Check forecast period months
      const forecastMonths = metric.values.filter(v => ['02-2025', '03-2025'].includes(v.month));
      expect(forecastMonths).toHaveLength(2);
      for (const month of forecastMonths) {
        expect(month.forecast).toBe(100); // From constant node
        expect(month.budget).toBe(100); // From constant node
        expect(month.historical).toBeNull();
      }
    });

    it('should include intermediate nodes when requested', async () => {
      const trees = [createTestTree()];
      const request: UnifiedCalculationRequest = {
        calculationTypes: ['forecast'],
        includeIntermediateNodes: true,
      };

      const result = await engine.calculateWithPeriods(
        trees,
        '02-2025',
        '03-2025',
        '12-2024',
        '01-2025',
        testVariables,
        request
      );

      // Should have all nodes in the tree
      expect(result.allNodes.length).toBeGreaterThan(1);
      
      // Should include different node types
      const nodeTypes = result.allNodes.map(n => n.nodeType);
      expect(nodeTypes).toContain('METRIC');
      expect(nodeTypes).toContain('CONSTANT');

      // Check that intermediate nodes have calculated values
      const constantNode = result.allNodes.find(n => n.nodeType === 'CONSTANT');
      if (constantNode) {
        for (const monthValue of constantNode.values.filter(v => v.forecast !== null)) {
          expect(monthValue.calculated).toBe(100);
        }
      }
    });

    it('should exclude intermediate nodes when not requested', async () => {
      const trees = [createTestTree()];
      const request: UnifiedCalculationRequest = {
        calculationTypes: ['forecast'],
        includeIntermediateNodes: false,
      };

      const result = await engine.calculateWithPeriods(
        trees,
        '02-2025',
        '03-2025',
        '12-2024',
        '01-2025',
        testVariables,
        request
      );

      // Should have empty allNodes array
      expect(result.allNodes).toEqual([]);
      
      // Should still have metrics
      expect(result.metrics).toHaveLength(1);
    });

    it('should handle overlapping periods correctly', async () => {
      const trees = [createTestTree()];
      const request: UnifiedCalculationRequest = {
        calculationTypes: ['historical', 'forecast'],
        includeIntermediateNodes: false,
      };

      const result = await engine.calculateWithPeriods(
        trees,
        '01-2025', // Forecast period overlaps with actual
        '03-2025',
        '12-2024', // Actual period
        '01-2025',
        testVariables,
        request
      );

      // Should have metric results
      expect(result.metrics).toHaveLength(1);
      const metric = result.metrics[0];
      
      // Should handle all months in the combined range
      expect(metric.values).toHaveLength(4); // Dec 2024, Jan 2025, Feb 2025, Mar 2025

      // December 2024 - only historical
      const dec2024 = metric.values.find(v => v.month === '12-2024');
      expect(dec2024?.historical).toBe(100);
      expect(dec2024?.forecast).toBeNull();

      // January 2025 - both historical and forecast (overlapping period)
      const jan2025 = metric.values.find(v => v.month === '01-2025');
      expect(jan2025?.historical).toBe(100);
      expect(jan2025?.forecast).toBe(100);

      // February/March 2025 - only forecast
      const feb2025 = metric.values.find(v => v.month === '02-2025');
      const mar2025 = metric.values.find(v => v.month === '03-2025');
      expect(feb2025?.forecast).toBe(100);
      expect(feb2025?.historical).toBeNull();
      expect(mar2025?.forecast).toBe(100);
      expect(mar2025?.historical).toBeNull();
    });

    it('should handle empty calculation types gracefully', async () => {
      const trees = [createTestTree()];
      const request: UnifiedCalculationRequest = {
        calculationTypes: [],
        includeIntermediateNodes: false,
      };

      const result = await engine.calculateWithPeriods(
        trees,
        '02-2025',
        '03-2025',
        '12-2024',
        '01-2025',
        testVariables,
        request
      );

      // Should complete successfully but with no actual calculations
      expect(result.calculationTypes).toEqual([]);
      expect(result.metrics).toHaveLength(1);
      
      // All values should be null
      const metric = result.metrics[0];
      for (const monthValue of metric.values) {
        expect(monthValue.historical).toBeNull();
        expect(monthValue.forecast).toBeNull();
        expect(monthValue.budget).toBeNull();
        expect(monthValue.calculated).toBeNull();
      }
    });

    it('should maintain proper MM-YYYY format in results', async () => {
      const trees = [createTestTree()];
      const request: UnifiedCalculationRequest = {
        calculationTypes: ['forecast'],
        includeIntermediateNodes: false,
      };

      const result = await engine.calculateWithPeriods(
        trees,
        '02-2025',
        '04-2025',
        '11-2024',
        '01-2025',
        testVariables,
        request
      );

      // Check period info format
      expect(result.periodInfo.forecastStartMonth).toMatch(/^\d{2}-\d{4}$/);
      expect(result.periodInfo.forecastEndMonth).toMatch(/^\d{2}-\d{4}$/);
      expect(result.periodInfo.actualStartMonth).toMatch(/^\d{2}-\d{4}$/);
      expect(result.periodInfo.actualEndMonth).toMatch(/^\d{2}-\d{4}$/);

      // Check month values format
      const metric = result.metrics[0];
      for (const monthValue of metric.values) {
        expect(monthValue.month).toMatch(/^\d{2}-\d{4}$/);
      }
    });

    it('should handle multiple calculation trees with dependencies', async () => {
      // Create a second tree that depends on the first
      const tree1 = createTestTree();
      
      const seedNode: CalculationTreeNode = {
        nodeId: 'seed-1',
        nodeType: 'SEED',
        nodeData: {
          sourceMetricId: 'metric-1',
        },
        children: [],
      };

      const metric2: CalculationTreeNode = {
        nodeId: 'metric-2',
        nodeType: 'METRIC',
        nodeData: {
          label: 'Dependent Metric',
          budgetVariableId: 'var-budget',
          historicalVariableId: 'var-historical',
          useCalculated: true,
        } as MetricNodeAttributes,
        children: [seedNode],
      };

      const tree2: CalculationTree = {
        rootMetricNodeId: 'metric-2',
        tree: metric2,
      };

      const trees = [tree1, tree2];
      const request: UnifiedCalculationRequest = {
        calculationTypes: ['forecast'],
        includeIntermediateNodes: false,
      };

      const result = await engine.calculateWithPeriods(
        trees,
        '02-2025',
        '03-2025',
        '12-2024',
        '01-2025',
        testVariables,
        request
      );

      // Should have results for both metrics
      expect(result.metrics).toHaveLength(2);
      expect(result.metrics.map(m => m.nodeId)).toContain('metric-1');
      expect(result.metrics.map(m => m.nodeId)).toContain('metric-2');
    });
  });

  describe('Calculation Rules Verification', () => {
    it('should apply historical calculation rules correctly', async () => {
      // Test that METRIC nodes with useCalculated=false use historicalVariableId
      const metricWithHistoricalVar: CalculationTreeNode = {
        nodeId: 'metric-historical',
        nodeType: 'METRIC',
        nodeData: {
          label: 'Historical Metric',
          budgetVariableId: 'var-budget',
          historicalVariableId: 'var-historical',
          useCalculated: false, // Should use historicalVariableId
        } as MetricNodeAttributes,
        children: [],
      };

      const tree: CalculationTree = {
        rootMetricNodeId: 'metric-historical',
        tree: metricWithHistoricalVar,
      };

      const request: UnifiedCalculationRequest = {
        calculationTypes: ['historical'],
        includeIntermediateNodes: false,
      };

      const result = await engine.calculateWithPeriods(
        [tree],
        '02-2025',
        '03-2025',
        '11-2024',
        '01-2025',
        testVariables,
        request
      );

      expect(result.metrics).toHaveLength(1);
      // The metric should use historical variable data directly
      expect(mockVariableDataService.getVariableValueForMonth).toHaveBeenCalledWith(
        'var-historical',
        expect.any(Date),
        expect.any(Array)
      );
    });

    it('should apply budget calculation rules correctly', async () => {
      // Test that METRIC nodes with useCalculated=false use budgetVariableId
      const metricWithBudgetVar: CalculationTreeNode = {
        nodeId: 'metric-budget',
        nodeType: 'METRIC',
        nodeData: {
          label: 'Budget Metric',
          budgetVariableId: 'var-budget',
          historicalVariableId: 'var-historical',
          useCalculated: false, // Should use budgetVariableId
        } as MetricNodeAttributes,
        children: [],
      };

      const tree: CalculationTree = {
        rootMetricNodeId: 'metric-budget',
        tree: metricWithBudgetVar,
      };

      const request: UnifiedCalculationRequest = {
        calculationTypes: ['budget'],
        includeIntermediateNodes: false,
      };

      const result = await engine.calculateWithPeriods(
        [tree],
        '02-2025',
        '03-2025',
        '11-2024',
        '01-2025',
        testVariables,
        request
      );

      expect(result.metrics).toHaveLength(1);
      // The metric should use budget variable data directly
      expect(mockVariableDataService.getVariableValueForMonth).toHaveBeenCalledWith(
        'var-budget',
        expect.any(Date),
        expect.any(Array)
      );
    });

    it('should always calculate all nodes regardless of useCalculated flag for forecast', async () => {
      // For forecast calculation, useCalculated flag should be ignored
      const metricWithUseCalculatedFalse: CalculationTreeNode = {
        nodeId: 'metric-forecast',
        nodeType: 'METRIC',
        nodeData: {
          label: 'Forecast Metric',
          budgetVariableId: 'var-budget',
          historicalVariableId: 'var-historical',
          useCalculated: false, // Should still calculate from children for forecast
        } as MetricNodeAttributes,
        children: [
          {
            nodeId: 'const-child',
            nodeType: 'CONSTANT',
            nodeData: { name: 'Test', value: 100 } as ConstantNodeAttributes,
            children: [],
          }
        ],
      };

      const tree: CalculationTree = {
        rootMetricNodeId: 'metric-forecast',
        tree: metricWithUseCalculatedFalse,
      };

      const request: UnifiedCalculationRequest = {
        calculationTypes: ['forecast'],
        includeIntermediateNodes: false,
      };

      const result = await engine.calculateWithPeriods(
        [tree],
        '02-2025',
        '03-2025',
        '11-2024',
        '01-2025',
        testVariables,
        request
      );

      expect(result.metrics).toHaveLength(1);
      const metric = result.metrics[0];
      
      // Should have calculated forecast values even with useCalculated=false
      for (const monthValue of metric.values) {
        if (monthValue.forecast !== null) {
          expect(monthValue.forecast).toBe(100); // Value from constant child
        }
      }
    });
  });

  describe('Enhanced Debugging', () => {
    it('should provide comprehensive logging during calculation', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const trees = [createTestTree()];
      const request: UnifiedCalculationRequest = {
        calculationTypes: ['forecast'],
        includeIntermediateNodes: false,
      };

      await engine.calculateWithPeriods(
        trees,
        '02-2025',
        '03-2025',
        '11-2024',
        '01-2025',
        testVariables,
        request
      );

      // Should have logged calculation start
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CalculationEngine] Starting unified calculation')
      );

      // Should have logged periods
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Forecast period: 02-2025 to 03-2025')
      );

      // Should have logged calculation types
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Calculation types: [forecast]')
      );

      consoleSpy.mockRestore();
    });
  });
}); 