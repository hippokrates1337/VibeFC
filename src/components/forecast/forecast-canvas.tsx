import React, { useCallback, MouseEvent, useEffect, useState, useRef } from 'react';
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
  useStoreApi,
  useKeyPress,
  OnSelectionChangeFunc
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  useForecastGraphStore,
  useDeleteNode,
  useDeleteEdge,
  useForecastNodes,
  useForecastEdges,
  useOpenConfigPanelForNode
} from '@/lib/store/forecast-graph-store';
import { nodeTypes, edgeTypes, defaultEdgeOptions, connectionLineStyle } from './node-types';

// Component to handle React Flow store error suppression
const ReactFlowErrorSuppressor: React.FC = () => {
  const store = useStoreApi();
  
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      store.getState().onError = (code: string, message: string) => {
        if (code === "002") {
          return;
        }
        console.warn(message);
      };
    }
  }, [store]);
  
  return null;
};

/**
 * Main canvas for editing forecast graphs using React Flow.
 * 
 * Note: nodeTypes, edgeTypes, defaultEdgeOptions, and connectionLineStyle are imported
 * from a separate module to ensure they are created once and never change.
 * This is critical for React Flow v11+ to prevent warnings about creating new objects.
 */
const ForecastCanvas: React.FC = () => {
  const nodes = useForecastNodes();
  const edges = useForecastEdges();
  
  // Store actions for deletion - using custom hooks to ensure stability
  const deleteNode = useDeleteNode();
  const deleteEdge = useDeleteEdge();
  const openConfigPanelForNode = useOpenConfigPanelForNode();
  
  // Use refs to track selected elements to avoid triggering useEffect on selection changes
  const selectedNodesRef = useRef<Node[]>([]);
  const selectedEdgesRef = useRef<Edge[]>([]);
  
  // Original handlers and selectors from the store - kept for easy restoration
  const onNodesChangeFromStore = useForecastGraphStore((state) => state.onNodesChange);
  const onEdgesChangeFromStore = useForecastGraphStore((state) => state.onEdgesChange);
  const addEdgeStore = useForecastGraphStore((state) => state.addEdge);
  const setSelectedNodeId = useForecastGraphStore((state) => state.setSelectedNodeId);

  // Custom keyboard handling for delete functionality
  const deletePressed = useKeyPress(['Delete', 'Backspace']);

  // Handle deletion when delete key is pressed - only depends on deletePressed
  useEffect(() => {
    if (deletePressed) {
      // Delete selected nodes (and their connected edges will be deleted automatically by the store)
      selectedNodesRef.current.forEach((node) => {
        deleteNode(node.id);
      });
      
      // Delete selected edges
      selectedEdgesRef.current.forEach((edge) => {
        deleteEdge(edge.id);
      });
      
      // Clear the refs after deletion
      selectedNodesRef.current = [];
      selectedEdgesRef.current = [];
    }
  }, [deletePressed]); // Only depend on deletePressed to avoid infinite loops

  // Track selection changes to know what to delete - update refs instead of state
  const onSelectionChange: OnSelectionChangeFunc = useCallback(({ nodes: selectedNodes, edges: selectedEdges }) => {
    selectedNodesRef.current = selectedNodes;
    selectedEdgesRef.current = selectedEdges;
    
    // Update store's selectedNodeId based on selection
    if (selectedNodes.length === 1) {
      // Single node selected - set it as selected in store
      setSelectedNodeId(selectedNodes[0].id);
    } else {
      // No nodes selected or multiple nodes selected - clear selection
      setSelectedNodeId(null);
    }
  }, [setSelectedNodeId]);

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
    openConfigPanelForNode(node.id);
  }, [openConfigPanelForNode]);

  return (
    <div className="h-full w-full bg-slate-900 relative">
      <ReactFlowProvider>
        <ReactFlowErrorSuppressor />
        <ReactFlow
          key="forecast-canvas" // Stable key to prevent unnecessary remounts
          nodes={nodes as Node[]}
          edges={edges as Edge[]}
          
          // Restored original handlers
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={handleNodeDoubleClick}
          onSelectionChange={onSelectionChange}
          
          // Disable built-in delete key handling since we're implementing custom logic
          deleteKeyCode={[]}
          
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          selectNodesOnDrag={false}
          
          // Enhanced styling
          className="forecast-canvas"
          
          // Default edge style with arrow
          defaultEdgeOptions={defaultEdgeOptions}
          
          // Connection line style
          connectionLineStyle={connectionLineStyle}
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