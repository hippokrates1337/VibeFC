import React, { useCallback } from 'react';
import ReactFlow, {
  Controls,
  Background,
  ReactFlowProvider,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  Connection,
  BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useForecastGraphStore } from '@/lib/store/forecast-graph-store';
// Node components (to be implemented)
import DataNode from './nodes/DataNode';
import ConstantNode from './nodes/ConstantNode';
import OperatorNode from './nodes/OperatorNode';
import MetricNode from './nodes/MetricNode';
import SeedNode from './nodes/SeedNode';

// Moved nodeTypes outside the component for stable reference
const nodeTypes = {
  data: DataNode,
  constant: ConstantNode,
  operator: OperatorNode,
  metric: MetricNode,
  seed: SeedNode
};

/**
 * Main canvas for editing forecast graphs using React Flow.
 */
const ForecastCanvas: React.FC = () => {
  const nodes = useForecastGraphStore((state) => state.nodes);
  const edges = useForecastGraphStore((state) => state.edges);
  
  // Original handlers and selectors from the store - kept for easy restoration
  const onNodesChangeFromStore = useForecastGraphStore((state) => state.onNodesChange);
  const onEdgesChangeFromStore = useForecastGraphStore((state) => state.onEdgesChange);
  const addEdgeStore = useForecastGraphStore((state) => state.addEdge);

  const handleNodesChange: OnNodesChange = useCallback((changes) => {
    onNodesChangeFromStore(changes);
  }, [onNodesChangeFromStore]);

  const handleEdgesChange: OnEdgesChange = useCallback((changes) => {
    onEdgesChangeFromStore(changes);
  }, [onEdgesChangeFromStore]);

  const onConnect: OnConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target) {
      addEdgeStore({ source: connection.source, target: connection.target });
    }
  }, [addEdgeStore]);

  return (
    <ReactFlowProvider>
      <ReactFlow
        nodes={nodes as Node[]}
        edges={edges as Edge[]}
        
        // Restored original handlers
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </ReactFlowProvider>
  );
};

export default ForecastCanvas; 