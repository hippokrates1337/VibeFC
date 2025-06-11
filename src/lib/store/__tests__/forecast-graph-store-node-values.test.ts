import { beforeEach, describe, expect, test } from '@jest/globals';
import { create } from 'zustand';
import type { ExtendedForecastCalculationResult, NodeCalculationResult, MonthlyNodeValue } from '@/types/forecast';

// Create a test store focused on node value functionality
interface TestNodeValueStore {
  calculationResults: ExtendedForecastCalculationResult | null;
  setCalculationResults: (results: ExtendedForecastCalculationResult) => void;
  getNodeValueForMonth: (nodeId: string, month: Date) => { value: number; type: 'forecast' | 'calculated' } | null;
}

const createTestNodeStore = () => create<TestNodeValueStore>((set, get) => ({
  calculationResults: null,

  setCalculationResults: (results) => {
    set({ calculationResults: results });
  },

  getNodeValueForMonth: (nodeId: string, month: Date) => {
    const state = get();
    const results = state.calculationResults;
    
    if (!results?.allNodes) return null;
    
    const nodeResult = results.allNodes.find(node => node.nodeId === nodeId);
    if (!nodeResult?.values) return null;
    
    const monthlyValue = nodeResult.values.find((v: MonthlyNodeValue) => {
      const valueDate = new Date(v.date);
      return valueDate.getFullYear() === month.getFullYear() && 
             valueDate.getMonth() === month.getMonth();
    });
    
    if (!monthlyValue) return null;
    
    // For METRIC nodes, prefer forecast values
    if (nodeResult.nodeType === 'METRIC') {
      if (monthlyValue.forecast !== null) {
        return {
          value: monthlyValue.forecast,
          type: 'forecast' as const
        };
      }
    }
    
    // For all other nodes (DATA, OPERATOR, SEED), use calculated values
    if (monthlyValue.calculated !== null) {
      return {
        value: monthlyValue.calculated,
        type: 'calculated' as const
      };
    }
    
    return null;
  },
}));

describe('Node Value Retrieval - Phase 5', () => {
  let store: ReturnType<typeof createTestNodeStore>;
  let getState: () => TestNodeValueStore;

  beforeEach(() => {
    store = createTestNodeStore();
    getState = store.getState;
  });

  const createMockExtendedResults = (): ExtendedForecastCalculationResult => ({
    forecastId: 'test-forecast',
    calculatedAt: new Date(),
    metrics: [],
    allNodes: [
      {
        nodeId: 'metric-node-1',
        nodeType: 'METRIC',
        values: [
          {
            date: new Date(2025, 1, 1), // February
            budget: 1000,
            historical: 900,
            forecast: 1100,
            calculated: null
          },
          {
            date: new Date(2025, 2, 1), // March
            budget: 1200,
            historical: 1050,
            forecast: 1300,
            calculated: null
          }
        ]
      },
      {
        nodeId: 'data-node-1',
        nodeType: 'DATA',
        values: [
          {
            date: new Date(2025, 1, 1), // February
            budget: null,
            historical: null,
            forecast: null,
            calculated: 500
          },
          {
            date: new Date(2025, 2, 1), // March
            budget: null,
            historical: null,
            forecast: null,
            calculated: 600
          }
        ]
      },
      {
        nodeId: 'operator-node-1',
        nodeType: 'OPERATOR',
        values: [
          {
            date: new Date(2025, 1, 1), // February
            budget: null,
            historical: null,
            forecast: null,
            calculated: 1600
          },
          {
            date: new Date(2025, 2, 1), // March
            budget: null,
            historical: null,
            forecast: null,
            calculated: 1900
          }
        ]
      },
      {
        nodeId: 'seed-node-1',
        nodeType: 'SEED',
        values: [
          {
            date: new Date(2025, 1, 1), // February
            budget: null,
            historical: null,
            forecast: null,
            calculated: 300
          },
          {
            date: new Date(2025, 2, 1), // March
            budget: null,
            historical: null,
            forecast: null,
            calculated: 350
          }
        ]
      },
      {
        nodeId: 'constant-node-1',
        nodeType: 'CONSTANT',
        values: []
      }
    ]
  });

  describe('METRIC Node Values', () => {
    test('should return forecast values for METRIC nodes', () => {
      const mockResults = createMockExtendedResults();
      getState().setCalculationResults(mockResults);
      
      const result = getState().getNodeValueForMonth('metric-node-1', new Date(2025, 1, 1)); // February
      
      expect(result).toEqual({
        value: 1100,
        type: 'forecast'
      });
    });

    test('should handle METRIC nodes for different months', () => {
      const mockResults = createMockExtendedResults();
      getState().setCalculationResults(mockResults);
      
      const febResult = getState().getNodeValueForMonth('metric-node-1', new Date(2025, 1, 1));
      const marResult = getState().getNodeValueForMonth('metric-node-1', new Date(2025, 2, 1));
      
      expect(febResult?.value).toBe(1100);
      expect(marResult?.value).toBe(1300);
      expect(febResult?.type).toBe('forecast');
      expect(marResult?.type).toBe('forecast');
    });
  });

  describe('DATA Node Values', () => {
    test('should return calculated values for DATA nodes', () => {
      const mockResults = createMockExtendedResults();
      getState().setCalculationResults(mockResults);
      
      const result = getState().getNodeValueForMonth('data-node-1', new Date(2025, 1, 1)); // February
      
      expect(result).toEqual({
        value: 500,
        type: 'calculated'
      });
    });

    test('should handle DATA nodes for different months', () => {
      const mockResults = createMockExtendedResults();
      getState().setCalculationResults(mockResults);
      
      const febResult = getState().getNodeValueForMonth('data-node-1', new Date(2025, 1, 1));
      const marResult = getState().getNodeValueForMonth('data-node-1', new Date(2025, 2, 1));
      
      expect(febResult?.value).toBe(500);
      expect(marResult?.value).toBe(600);
      expect(febResult?.type).toBe('calculated');
      expect(marResult?.type).toBe('calculated');
    });
  });

  describe('OPERATOR Node Values', () => {
    test('should return calculated values for OPERATOR nodes', () => {
      const mockResults = createMockExtendedResults();
      getState().setCalculationResults(mockResults);
      
      const result = getState().getNodeValueForMonth('operator-node-1', new Date(2025, 1, 1)); // February
      
      expect(result).toEqual({
        value: 1600,
        type: 'calculated'
      });
    });

    test('should handle OPERATOR nodes for different months', () => {
      const mockResults = createMockExtendedResults();
      getState().setCalculationResults(mockResults);
      
      const febResult = getState().getNodeValueForMonth('operator-node-1', new Date(2025, 1, 1));
      const marResult = getState().getNodeValueForMonth('operator-node-1', new Date(2025, 2, 1));
      
      expect(febResult?.value).toBe(1600);
      expect(marResult?.value).toBe(1900);
      expect(febResult?.type).toBe('calculated');
      expect(marResult?.type).toBe('calculated');
    });
  });

  describe('SEED Node Values', () => {
    test('should return calculated values for SEED nodes', () => {
      const mockResults = createMockExtendedResults();
      getState().setCalculationResults(mockResults);
      
      const result = getState().getNodeValueForMonth('seed-node-1', new Date(2025, 1, 1)); // February
      
      expect(result).toEqual({
        value: 300,
        type: 'calculated'
      });
    });

    test('should handle SEED nodes for different months', () => {
      const mockResults = createMockExtendedResults();
      getState().setCalculationResults(mockResults);
      
      const febResult = getState().getNodeValueForMonth('seed-node-1', new Date(2025, 1, 1));
      const marResult = getState().getNodeValueForMonth('seed-node-1', new Date(2025, 2, 1));
      
      expect(febResult?.value).toBe(300);
      expect(marResult?.value).toBe(350);
      expect(febResult?.type).toBe('calculated');
      expect(marResult?.type).toBe('calculated');
    });
  });

  describe('CONSTANT Node Values', () => {
    test('should return null for CONSTANT nodes', () => {
      const mockResults = createMockExtendedResults();
      getState().setCalculationResults(mockResults);
      
      const result = getState().getNodeValueForMonth('constant-node-1', new Date(2025, 1, 1)); // February
      
      expect(result).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    test('should return null for non-existent nodes', () => {
      const mockResults = createMockExtendedResults();
      getState().setCalculationResults(mockResults);
      
      const result = getState().getNodeValueForMonth('non-existent-node', new Date(2025, 1, 1));
      
      expect(result).toBeNull();
    });

    test('should return null for non-existent months', () => {
      const mockResults = createMockExtendedResults();
      getState().setCalculationResults(mockResults);
      
      const result = getState().getNodeValueForMonth('metric-node-1', new Date(2025, 5, 1)); // June (not in data)
      
      expect(result).toBeNull();
    });

    test('should return null when no calculation results available', () => {
      const result = getState().getNodeValueForMonth('metric-node-1', new Date(2025, 1, 1));
      
      expect(result).toBeNull();
    });

    test('should handle missing values gracefully', () => {
      const mockResults: ExtendedForecastCalculationResult = {
        forecastId: 'test-forecast',
        calculatedAt: new Date(),
        metrics: [],
        allNodes: [
          {
            nodeId: 'empty-node',
            nodeType: 'METRIC',
            values: []
          }
        ]
      };
      getState().setCalculationResults(mockResults);
      
      const result = getState().getNodeValueForMonth('empty-node', new Date(2025, 1, 1));
      
      expect(result).toBeNull();
    });
  });

  describe('Forecast-Only Value Display', () => {
    test('should only show forecast values for METRIC nodes, never budget or historical', () => {
      const mockResults = createMockExtendedResults();
      getState().setCalculationResults(mockResults);
      
      const result = getState().getNodeValueForMonth('metric-node-1', new Date(2025, 1, 1));
      
      // Should return forecast value (1100), not budget (1000) or historical (900)
      expect(result?.value).toBe(1100);
      expect(result?.type).toBe('forecast');
    });

    test('should only show calculated values for non-METRIC nodes', () => {
      const mockResults = createMockExtendedResults();
      getState().setCalculationResults(mockResults);
      
      const dataResult = getState().getNodeValueForMonth('data-node-1', new Date(2025, 1, 1));
      const operatorResult = getState().getNodeValueForMonth('operator-node-1', new Date(2025, 1, 1));
      const seedResult = getState().getNodeValueForMonth('seed-node-1', new Date(2025, 1, 1));
      
      expect(dataResult?.type).toBe('calculated');
      expect(operatorResult?.type).toBe('calculated');
      expect(seedResult?.type).toBe('calculated');
    });

    test('should never return budget or historical values', () => {
      const mockResults = createMockExtendedResults();
      getState().setCalculationResults(mockResults);
      
      // Even though budget and historical exist, only forecast should be returned
      const result = getState().getNodeValueForMonth('metric-node-1', new Date(2025, 1, 1));
      
      expect(result?.value).not.toBe(1000); // Not budget
      expect(result?.value).not.toBe(900);  // Not historical
      expect(result?.value).toBe(1100);     // Only forecast
    });
  });
}); 