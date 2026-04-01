import { describe, expect, test } from '@jest/globals';
import { render } from '@testing-library/react';
import NodeValueOverlay from '../node-value-overlay';
import type { NodeVisualizationValue } from '@/types/forecast';

describe('NodeValueOverlay Component', () => {
  const createMockValue = (value: number, type: 'forecast' | 'calculated' = 'forecast'): NodeVisualizationValue => ({
    nodeId: 'test-node-1',
    month: new Date(2025, 1, 1),
    value,
    valueType: type,
    formattedValue: value.toLocaleString()
  });

  const defaultProps = {
    nodeId: 'test-node-1',
    value: createMockValue(1234),
    nodeType: 'METRIC' as const,
  };

  test('should render without crashing', () => {
    expect(() => {
      render(<NodeValueOverlay {...defaultProps} />);
    }).not.toThrow();
  });

  test('should handle different node types', () => {
    const nodeTypes = ['METRIC', 'DATA', 'OPERATOR', 'SEED', 'CONSTANT'] as const;
    
    nodeTypes.forEach(nodeType => {
      expect(() => {
        render(<NodeValueOverlay {...defaultProps} nodeType={nodeType} />);
      }).not.toThrow();
    });
  });

  test('should handle null value', () => {
    expect(() => {
      render(<NodeValueOverlay {...defaultProps} value={null} />);
    }).not.toThrow();
  });

  test('should handle missing nodeId', () => {
    expect(() => {
      render(<NodeValueOverlay {...defaultProps} nodeId="" />);
    }).not.toThrow();
  });

  test('should render with proper positioning options', () => {
    const positions = ['top-right', 'bottom-right', 'top-left', 'bottom-left'] as const;
    
    positions.forEach(position => {
      expect(() => {
        render(<NodeValueOverlay {...defaultProps} position={position} />);
      }).not.toThrow();
    });
  });

  test('should handle different value types', () => {
    const forecastValue = createMockValue(5000, 'forecast');
    const calculatedValue = createMockValue(7500, 'calculated');
    
    expect(() => {
      render(<NodeValueOverlay {...defaultProps} value={forecastValue} />);
    }).not.toThrow();
    
    expect(() => {
      render(<NodeValueOverlay {...defaultProps} value={calculatedValue} />);
    }).not.toThrow();
  });

  test('should handle large numbers', () => {
    const largeValue = createMockValue(1234567);
    
    expect(() => {
      render(<NodeValueOverlay {...defaultProps} value={largeValue} />);
    }).not.toThrow();
  });

  test('should handle negative numbers', () => {
    const negativeValue = createMockValue(-1234);
    
    expect(() => {
      render(<NodeValueOverlay {...defaultProps} value={negativeValue} />);
    }).not.toThrow();
  });

  test('should handle zero value', () => {
    const zeroValue = createMockValue(0);
    
    expect(() => {
      render(<NodeValueOverlay {...defaultProps} value={zeroValue} />);
    }).not.toThrow();
  });
}); 