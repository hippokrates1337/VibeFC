import { renderHook, act } from '@testing-library/react';
import { 
  useForecastGraphStore, 
  calculateSmartNodePosition,
  useLastEditedNodePosition,
  useUpdateLastEditedNodePosition,
  type ForecastNodeClient 
} from '../forecast-graph-store';

// Mock logger to avoid console output in tests
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock UUID generation for consistent test results
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

describe('Smart Node Positioning', () => {
  beforeEach(() => {
    // Reset store state between tests
    const { result } = renderHook(() => useForecastGraphStore());
    act(() => {
      result.current.resetStore();
    });
  });

  describe('calculateSmartNodePosition', () => {
    it('should return default position when no last edited position exists', () => {
      const position = calculateSmartNodePosition(null, []);
      
      expect(position.x).toBeGreaterThanOrEqual(50);
      expect(position.x).toBeLessThanOrEqual(350);
      expect(position.y).toBeGreaterThanOrEqual(50);
      expect(position.y).toBeLessThanOrEqual(350);
    });

    it('should place new node to the right of last edited node when no overlaps', () => {
      const lastEditedPosition = { x: 100, y: 100 };
      const existingNodes: ForecastNodeClient[] = [];
      
      const position = calculateSmartNodePosition(lastEditedPosition, existingNodes);
      
      expect(position).toEqual({ x: 250, y: 100 }); // 100 + 150 offset
    });

    it('should avoid overlapping with existing nodes', () => {
      const lastEditedPosition = { x: 100, y: 100 };
      const existingNodes: ForecastNodeClient[] = [
        {
          id: 'existing-1',
          type: 'CONSTANT',
          position: { x: 250, y: 100 }, // Right position is occupied
          data: { name: 'Test', value: 1 },
        },
      ];
      
      const position = calculateSmartNodePosition(lastEditedPosition, existingNodes);
      
      // Should use the next available position (below)
      expect(position).toEqual({ x: 100, y: 200 }); // 100 + 100 offset
    });

    it('should try all candidate positions before falling back to random offset', () => {
      const lastEditedPosition = { x: 100, y: 100 };
      const existingNodes: ForecastNodeClient[] = [
        { id: '1', type: 'CONSTANT', position: { x: 250, y: 100 }, data: { name: 'Test', value: 1 } }, // Right
        { id: '2', type: 'CONSTANT', position: { x: 100, y: 200 }, data: { name: 'Test', value: 1 } }, // Below
        { id: '3', type: 'CONSTANT', position: { x: -50, y: 100 }, data: { name: 'Test', value: 1 } }, // Left
        { id: '4', type: 'CONSTANT', position: { x: 100, y: 0 }, data: { name: 'Test', value: 1 } }, // Above
        { id: '5', type: 'CONSTANT', position: { x: 250, y: 200 }, data: { name: 'Test', value: 1 } }, // Bottom-right
        { id: '6', type: 'CONSTANT', position: { x: -50, y: 200 }, data: { name: 'Test', value: 1 } }, // Bottom-left
        { id: '7', type: 'CONSTANT', position: { x: 250, y: 0 }, data: { name: 'Test', value: 1 } }, // Top-right
        { id: '8', type: 'CONSTANT', position: { x: -50, y: 0 }, data: { name: 'Test', value: 1 } }, // Top-left
      ];
      
      const position = calculateSmartNodePosition(lastEditedPosition, existingNodes);
      
      // Should fall back to first candidate with random offset
      expect(position.x).toBeGreaterThan(200); // Should be around 250 +/- 50
      expect(position.x).toBeLessThan(300);
      expect(position.y).toBeGreaterThan(50); // Should be around 100 +/- 50  
      expect(position.y).toBeLessThan(150);
    });
  });

  describe('Store Integration', () => {
    it('should track last edited node position when adding a node', () => {
      const { result } = renderHook(() => ({
        store: useForecastGraphStore(),
        lastEditedPosition: useLastEditedNodePosition(),
      }));

      // Initially no last edited position
      expect(result.current.lastEditedPosition).toBeNull();

      act(() => {
        result.current.store.addNode({
          type: 'CONSTANT',
          data: { name: 'Test', value: 1 },
          position: { x: 200, y: 150 },
        });
      });

      // Should track the position of the added node
      expect(result.current.lastEditedPosition).toEqual({ x: 200, y: 150 });
    });

    it('should track last edited node position when updating node data', () => {
      const { result } = renderHook(() => ({
        store: useForecastGraphStore(),
        lastEditedPosition: useLastEditedNodePosition(),
      }));

      // Add a node first
      let nodeId: string;
      act(() => {
        nodeId = result.current.store.addNode({
          type: 'CONSTANT',
          data: { name: 'Test', value: 1 },
          position: { x: 100, y: 100 },
        });
      });

      act(() => {
        result.current.store.updateNodeData(nodeId, { value: 2 });
      });

      // Should still track the node's position after data update
      expect(result.current.lastEditedPosition).toEqual({ x: 100, y: 100 });
    });

    it('should track last edited node position when updating node position', () => {
      const { result } = renderHook(() => ({
        store: useForecastGraphStore(),
        lastEditedPosition: useLastEditedNodePosition(),
      }));

      // Add a node first
      let nodeId: string;
      act(() => {
        nodeId = result.current.store.addNode({
          type: 'CONSTANT',
          data: { name: 'Test', value: 1 },
          position: { x: 100, y: 100 },
        });
      });

      act(() => {
        result.current.store.updateNodePosition(nodeId, { x: 300, y: 250 });
      });

      // Should track the new position
      expect(result.current.lastEditedPosition).toEqual({ x: 300, y: 250 });
    });

    it('should track last edited node position when duplicating a node', () => {
      const { result } = renderHook(() => ({
        store: useForecastGraphStore(),
        lastEditedPosition: useLastEditedNodePosition(),
      }));

      // Add a node first
      let nodeId: string;
      act(() => {
        nodeId = result.current.store.addNode({
          type: 'CONSTANT',
          data: { name: 'Test', value: 1 },
          position: { x: 100, y: 100 },
        });
      });

      act(() => {
        result.current.store.duplicateNodeWithEdges(nodeId);
      });

      // Should track the duplicated node's position (original + offset)
      expect(result.current.lastEditedPosition).toEqual({ x: 150, y: 150 });
    });

    it('should preserve last edited position when resetting store', () => {
      const { result } = renderHook(() => ({
        store: useForecastGraphStore(),
        lastEditedPosition: useLastEditedNodePosition(),
      }));

      // Add a node to set last edited position
      act(() => {
        result.current.store.addNode({
          type: 'CONSTANT',
          data: { name: 'Test', value: 1 },
          position: { x: 200, y: 150 },
        });
      });

      expect(result.current.lastEditedPosition).toEqual({ x: 200, y: 150 });

      act(() => {
        result.current.store.resetStore();
      });

      // Last edited position should be reset to null
      expect(result.current.lastEditedPosition).toBeNull();
    });

    it('should allow manual update of last edited position', () => {
      const { result } = renderHook(() => ({
        updatePosition: useUpdateLastEditedNodePosition(),
        lastEditedPosition: useLastEditedNodePosition(),
      }));

      // Initially no last edited position
      expect(result.current.lastEditedPosition).toBeNull();

      act(() => {
        result.current.updatePosition({ x: 400, y: 300 });
      });

      // Should update the last edited position
      expect(result.current.lastEditedPosition).toEqual({ x: 400, y: 300 });
    });
  });

  describe('Position Changes Tracking', () => {
    it('should track position changes from onNodesChange', () => {
      const { result } = renderHook(() => ({
        store: useForecastGraphStore(),
        lastEditedPosition: useLastEditedNodePosition(),
      }));

      // Add a node first
      let nodeId: string;
      act(() => {
        nodeId = result.current.store.addNode({
          type: 'CONSTANT',
          data: { name: 'Test', value: 1 },
          position: { x: 100, y: 100 },
        });
      });

      // Simulate a position change from React Flow (drag end)
      act(() => {
        result.current.store.onNodesChange([
          {
            id: nodeId,
            type: 'position',
            position: { x: 200, y: 200 },
            dragging: false,
          },
        ]);
      });

      // Should track the new position
      expect(result.current.lastEditedPosition).toEqual({ x: 200, y: 200 });
    });

    it('should track position changes while dragging', () => {
      const { result } = renderHook(() => ({
        store: useForecastGraphStore(),
        lastEditedPosition: useLastEditedNodePosition(),
      }));

      // Add a node first
      let nodeId: string;
      act(() => {
        nodeId = result.current.store.addNode({
          type: 'CONSTANT',
          data: { name: 'Test', value: 1 },
          position: { x: 100, y: 100 },
        });
      });

      // Simulate a position change during dragging
      act(() => {
        result.current.store.onNodesChange([
          {
            id: nodeId,
            type: 'position',
            position: { x: 250, y: 250 },
            dragging: true,
          },
        ]);
      });

      // Should track the position even while dragging
      expect(result.current.lastEditedPosition).toEqual({ x: 250, y: 250 });
    });

    it('should track position changes when drag ends', () => {
      const { result } = renderHook(() => ({
        store: useForecastGraphStore(),
        lastEditedPosition: useLastEditedNodePosition(),
      }));

      // Add a node first
      let nodeId: string;
      act(() => {
        nodeId = result.current.store.addNode({
          type: 'CONSTANT',
          data: { name: 'Test', value: 1 },
          position: { x: 100, y: 100 },
        });
      });

      // Simulate drag ending with final position
      act(() => {
        result.current.store.onNodesChange([
          {
            id: nodeId,
            type: 'position',
            position: { x: 300, y: 300 },
            dragging: false,
          },
        ]);
      });

      // Should track the final position when drag ends
      expect(result.current.lastEditedPosition).toEqual({ x: 300, y: 300 });
    });

    it('should handle multiple position changes and use the latest one', () => {
      const { result } = renderHook(() => ({
        store: useForecastGraphStore(),
        lastEditedPosition: useLastEditedNodePosition(),
      }));

      // Add two nodes
      let nodeId1: string, nodeId2: string;
      act(() => {
        nodeId1 = result.current.store.addNode({
          type: 'CONSTANT',
          data: { name: 'Test1', value: 1 },
          position: { x: 100, y: 100 },
        });
        nodeId2 = result.current.store.addNode({
          type: 'CONSTANT',
          data: { name: 'Test2', value: 2 },
          position: { x: 200, y: 200 },
        });
      });

      // Simulate multiple position changes in a single update
      act(() => {
        result.current.store.onNodesChange([
          {
            id: nodeId1,
            type: 'position',
            position: { x: 150, y: 150 },
            dragging: false,
          },
          {
            id: nodeId2,
            type: 'position',
            position: { x: 250, y: 250 },
            dragging: false,
          },
        ]);
      });

      // Should use the position from the last change (nodeId2)
      expect(result.current.lastEditedPosition).toEqual({ x: 250, y: 250 });
    });
  });
}); 