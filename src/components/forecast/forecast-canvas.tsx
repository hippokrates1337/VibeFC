import React, { useCallback, MouseEvent } from 'react';
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
  BackgroundVariant,
  NodeMouseHandler,
  MarkerType
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
  DATA: DataNode,
  CONSTANT: ConstantNode,
  OPERATOR: OperatorNode,
  METRIC: MetricNode,
  SEED: SeedNode
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
  const setSelectedNodeId = useForecastGraphStore((state) => state.setSelectedNodeId);

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

  const handleNodeDoubleClick: NodeMouseHandler = useCallback((event: MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, [setSelectedNodeId]);

  return (
    <div className="h-full w-full bg-slate-900 relative">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes as Node[]}
          edges={edges as Edge[]}
          
          // Restored original handlers
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={handleNodeDoubleClick}
          
          nodeTypes={nodeTypes}
          fitView
          selectNodesOnDrag={false}
          
          // Enhanced styling
          className="forecast-canvas"
          
          // Default edge style with arrow
          defaultEdgeOptions={{
            style: {
              strokeWidth: 2,
              stroke: '#94a3b8',
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#94a3b8',
              width: 20,
              height: 20,
            },
            animated: false,
          }}
          
          // Connection line style
          connectionLineStyle={{
            strokeWidth: 2,
            stroke: '#60a5fa',
            strokeDasharray: '5,5',
          }}
        >
          <Controls 
            className="bg-slate-800 border border-slate-600 shadow-md rounded-lg"
            showZoom={true}
            showFitView={true}
            showInteractive={false}
          />
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={20} 
            size={1.5} 
            color="#475569"
            className="bg-slate-900"
          />
        </ReactFlow>
      </ReactFlowProvider>
      
      {/* Custom CSS for additional styling */}
      <style jsx>{`
        .forecast-canvas .react-flow__node {
          cursor: pointer;
        }
        
        .forecast-canvas .react-flow__node.selected {
          box-shadow: 0 0 0 2px #60a5fa;
        }
        
        .forecast-canvas .react-flow__edge {
          cursor: pointer;
        }
        
        .forecast-canvas .react-flow__edge.selected .react-flow__edge-path {
          stroke: #60a5fa;
          stroke-width: 3;
        }
        
        .forecast-canvas .react-flow__edge.selected .react-flow__edge-path[marker-end] {
          marker-end: url(#react-flow__arrowclosed);
        }
        
        .forecast-canvas .react-flow__connection-line {
          stroke: #60a5fa;
          stroke-width: 2;
          stroke-dasharray: 5,5;
        }
        
        .forecast-canvas .react-flow__handle {
          width: 8px;
          height: 8px;
          border: 2px solid #1e293b;
          background: #64748b;
        }
        
        .forecast-canvas .react-flow__handle-connecting,
        .forecast-canvas .react-flow__handle-valid {
          background: #22c55e;
        }
        
        .forecast-canvas .react-flow__handle-invalid {
          background: #ef4444;
        }
        
        .forecast-canvas .react-flow__controls {
          background: #1e293b !important;
          border: 1px solid #475569 !important;
        }
        
        .forecast-canvas .react-flow__controls button {
          background: #334155 !important;
          border: 1px solid #475569 !important;
          color: #e2e8f0 !important;
        }
        
        .forecast-canvas .react-flow__controls button:hover {
          background: #475569 !important;
        }
        
        /* Custom arrow marker styling */
        .forecast-canvas .react-flow__edge-path[marker-end*="arrowclosed"] {
          stroke: #94a3b8;
        }
        
        .forecast-canvas .react-flow__edge.selected .react-flow__edge-path[marker-end*="arrowclosed"] {
          stroke: #60a5fa;
        }
      `}</style>
    </div>
  );
};

export default ForecastCanvas; 