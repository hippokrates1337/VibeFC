import React, { useCallback, MouseEvent, useEffect, useMemo, useRef } from 'react';
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
  OnSelectionChangeFunc,
  OnConnectEnd
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  useForecastGraph,
  useForecastGraphActions,
  useCalculations
} from '@/lib/store/forecast-graph-store/hooks';
import {
  getConnectionRejection,
  getLoopHighlights
} from '@/lib/services/forecast-calculation/graph-validation';
import { useToast } from '@/components/ui/use-toast';
import { nodeTypes, edgeTypes, defaultEdgeOptions, connectionLineStyle } from './node-types';

/** Stroke for edges along a reported cycle (matches the red ring on its nodes). */
const LOOP_EDGE_STROKE = '#ef4444';

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
 * The React Flow graph itself; rendered inside ReactFlowProvider so it can read the
 * React Flow store (e.g. which handle a refused connection was dropped on).
 *
 * Note: nodeTypes, edgeTypes, defaultEdgeOptions, and connectionLineStyle are imported
 * from a separate module to ensure they are created once and never change.
 * This is critical for React Flow v11+ to prevent warnings about creating new objects.
 */
const ForecastCanvasFlow: React.FC = () => {
  const { nodes, edges, configPanelOpen } = useForecastGraph();
  const { graphValidation } = useCalculations();
  const { deleteNode, deleteEdge, openConfigPanelForNode, onNodesChange: onNodesChangeFromStore, onEdgesChange: onEdgesChangeFromStore, addEdge: addEdgeStore, setSelectedNodeId } = useForecastGraphActions();
  const store = useStoreApi();
  const { toast } = useToast();
  
  // Use refs to track selected elements to avoid triggering useEffect on selection changes
  const selectedNodesRef = useRef<Node[]>([]);
  const selectedEdgesRef = useRef<Edge[]>([]);

  // Custom keyboard handling for delete functionality
  const deletePressed = useKeyPress(['Delete', 'Backspace']);

  // Handle deletion when delete key is pressed (skip while node config sheet is open)
  useEffect(() => {
    if (!deletePressed || configPanelOpen) {
      return;
    }
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
  }, [deletePressed, configPanelOpen, deleteNode, deleteEdge]);

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

  // React Flow asks while the user drags over handles, so answers are cached per graph.
  const rejectionFor = useMemo(() => {
    const cache: Record<string, string | null> = {};
    return (source: string, target: string): string | null => {
      const key = `${source}->${target}`;
      if (!(key in cache)) {
        cache[key] = getConnectionRejection(nodes, edges, { source, target });
      }
      return cache[key];
    };
  }, [nodes, edges]);

  // Same rules as the backend calculation (packages/forecast-engine): refuse edges that add an error.
  const isValidConnection = useCallback((connection: Connection | Edge) => {
    if (!connection.source || !connection.target) {
      return false;
    }
    return rejectionFor(connection.source, connection.target) === null;
  }, [rejectionFor]);

  // React Flow drops a refused connection silently; say why.
  const onConnectEnd: OnConnectEnd = useCallback(() => {
    const { connectionStatus, connectionStartHandle, connectionEndHandle } = store.getState();
    if (connectionStatus !== 'invalid' || !connectionStartHandle?.nodeId || !connectionEndHandle?.nodeId) {
      return;
    }
    const fromTarget = connectionStartHandle.type === 'target';
    const source = fromTarget ? connectionEndHandle.nodeId : connectionStartHandle.nodeId;
    const target = fromTarget ? connectionStartHandle.nodeId : connectionEndHandle.nodeId;
    const reason = rejectionFor(source, target);
    if (reason) {
      toast({ title: 'Connection not allowed', description: reason, variant: 'destructive' });
    }
  }, [store, rejectionFor, toast]);

  // Ring the nodes of reported cycles / ungrounded recurrences and colour the edges along their path.
  const loopHighlights = useMemo(
    () => getLoopHighlights(graphValidation?.issues, edges),
    [graphValidation, edges]
  );
  const displayNodes = useMemo(() => {
    if (loopHighlights.nodeIds.size === 0) {
      return nodes as Node[];
    }
    return (nodes as Node[]).map((node) =>
      loopHighlights.nodeIds.has(node.id)
        ? { ...node, className: [node.className, 'forecast-node-loop'].filter(Boolean).join(' ') }
        : node
    );
  }, [nodes, loopHighlights]);
  const displayEdges = useMemo(() => {
    if (loopHighlights.edgeIds.size === 0) {
      return edges as Edge[];
    }
    return (edges as Edge[]).map((edge) =>
      loopHighlights.edgeIds.has(edge.id)
        ? {
            ...edge,
            className: [edge.className, 'forecast-edge-loop'].filter(Boolean).join(' '),
            style: { ...defaultEdgeOptions.style, ...edge.style, stroke: LOOP_EDGE_STROKE },
          }
        : edge
    );
  }, [edges, loopHighlights]);

  const handleNodeDoubleClick: NodeMouseHandler = useCallback((event: MouseEvent, node: Node) => {
    openConfigPanelForNode(node.id);
  }, [openConfigPanelForNode]);

  return (
    <>
      <ReactFlowErrorSuppressor />
      <ReactFlow
        key="forecast-canvas" // Stable key to prevent unnecessary remounts
        nodes={displayNodes}
        edges={displayEdges}

        // Restored original handlers
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onConnectEnd={onConnectEnd}
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
    </>
  );
};

/**
 * Main canvas for editing forecast graphs using React Flow.
 */
const ForecastCanvas: React.FC = () => {
  return (
    <div className="h-full w-full bg-slate-900 relative">
      <ReactFlowProvider>
        <ForecastCanvasFlow />
      </ReactFlowProvider>
      
      {/* Custom CSS for additional styling */}
      <style jsx>{`
        .forecast-canvas .react-flow__node {
          cursor: pointer;
          overflow: visible;
        }
        
        .forecast-canvas .react-flow__node.selected {
          box-shadow: 0 0 0 2px #60a5fa;
        }

        .forecast-canvas .react-flow__node.forecast-node-loop {
          border-radius: 8px;
          box-shadow: 0 0 0 3px #ef4444;
        }

        .forecast-canvas .react-flow__node.forecast-node-loop.selected {
          box-shadow: 0 0 0 3px #ef4444, 0 0 0 5px #60a5fa;
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