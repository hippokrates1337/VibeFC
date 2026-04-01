'use client';

import React, { useMemo, useState, useCallback, memo, useRef, useLayoutEffect, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  TreePine, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2,
  Minimize2,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { getNodeTypeColor, formatExecutionTime } from '@/lib/api/debug-calculation';
import { getDebugNodeLabel } from '@/lib/utils/debug-node-label';
import type { 
  DebugCalculationTree, 
  DebugTreeNode, 
  CalculationTreeVisualizationProps 
} from '@/types/debug';

interface TreeNodeVisualization {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  color: string;
  isSelected: boolean;
  isHighlighted: boolean;
  executionOrder?: number;
  executionTime?: number;
  hasError: boolean;
  children: string[];
  nodeData: any;
}

interface TreeLayoutConfig {
  nodeWidth: number;
  nodeHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  marginTop: number;
  marginLeft: number;
}

const DEFAULT_LAYOUT_CONFIG: TreeLayoutConfig = {
  nodeWidth: 180,
  nodeHeight: 72,
  horizontalSpacing: 100,
  verticalSpacing: 96,
  marginTop: 50,
  marginLeft: 50
};

/** Horizontal gap between separate root metric trees (not sibling spacing within a tree). */
const INTER_TREE_GAP = 40;

const CONTENT_PADDING = 48;

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.15;

/**
 * Calculate tree layout positions using a hierarchical layout algorithm
 */
function calculateTreeLayout(
  trees: DebugTreeNode[], 
  config: TreeLayoutConfig
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  let currentTreeX = config.marginLeft;

  trees.forEach((tree) => {
    // Calculate positions for this tree
    const treePositions = calculateNodePositions(tree, currentTreeX, config.marginTop, config);
    
    // Add to global positions map
    treePositions.forEach((pos, nodeId) => {
      positions.set(nodeId, pos);
    });

    // Calculate tree width for next tree positioning
    const treeWidth = calculateTreeWidth(tree, config);
    currentTreeX += treeWidth + INTER_TREE_GAP;
  });

  return positions;
}

/**
 * Calculate positions for nodes in a single tree
 */
function calculateNodePositions(
  node: DebugTreeNode,
  startX: number,
  startY: number,
  config: TreeLayoutConfig,
  positions = new Map<string, { x: number; y: number }>()
): Map<string, { x: number; y: number }> {
  // Position current node
  positions.set(node.nodeId, { x: startX, y: startY });

  // Position children
  if (node.children && node.children.length > 0) {
    const childrenY = startY + config.verticalSpacing;
    const totalChildrenWidth = node.children.length * config.nodeWidth + (node.children.length - 1) * config.horizontalSpacing;
    let childX = startX - totalChildrenWidth / 2 + config.nodeWidth / 2;

    node.children.forEach((child, index) => {
      calculateNodePositions(child, childX, childrenY, config, positions);
      childX += config.nodeWidth + config.horizontalSpacing;
    });
  }

  return positions;
}

/**
 * Calculate the total width of a tree
 */
function calculateTreeWidth(node: DebugTreeNode, config: TreeLayoutConfig): number {
  if (!node.children || node.children.length === 0) {
    return config.nodeWidth;
  }

  const childrenWidths = node.children.map(child => calculateTreeWidth(child, config));
  const totalChildrenWidth = childrenWidths.reduce((sum, width) => sum + width, 0);
  const spacingWidth = (node.children.length - 1) * config.horizontalSpacing;
  
  return Math.max(config.nodeWidth, totalChildrenWidth + spacingWidth);
}

function formatNodeIdPreview(nodeId: string): string {
  return nodeId.length > 10 ? `${nodeId.substring(0, 8)}…` : nodeId;
}

/**
 * Tree Node Component
 */
interface TreeNodeComponentProps {
  node: TreeNodeVisualization;
  onNodeClick: (nodeId: string) => void;
  onNodeHover: (nodeId: string | null) => void;
}

const TreeNodeComponent = memo(function TreeNodeComponent({ node, onNodeClick, onNodeHover }: TreeNodeComponentProps) {
  const handleClick = useCallback(() => {
    onNodeClick(node.id);
  }, [node.id, onNodeClick]);

  const handleMouseEnter = useCallback(() => {
    onNodeHover(node.id);
  }, [node.id, onNodeHover]);

  const handleMouseLeave = useCallback(() => {
    onNodeHover(null);
  }, [onNodeHover]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <g
            transform={`translate(${node.position.x}, ${node.position.y})`}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="cursor-pointer"
          >
            {/* Node Rectangle */}
            <rect
              width={DEFAULT_LAYOUT_CONFIG.nodeWidth}
              height={DEFAULT_LAYOUT_CONFIG.nodeHeight}
              rx={8}
              fill={node.color}
              stroke={node.isSelected ? '#3B82F6' : node.isHighlighted ? '#F59E0B' : '#475569'}
              strokeWidth={node.isSelected ? 3 : node.isHighlighted ? 2 : 1}
              opacity={node.isHighlighted || node.isSelected ? 1 : 0.9}
              className="transition-all duration-200"
            />

            {/* Node name */}
            <text
              x={DEFAULT_LAYOUT_CONFIG.nodeWidth / 2}
              y={20}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize={11}
              fontWeight="500"
              className="select-none pointer-events-none"
            >
              <tspan x={DEFAULT_LAYOUT_CONFIG.nodeWidth / 2} dy="0">
                {node.label.length > 22 ? `${node.label.substring(0, 19)}…` : node.label}
              </tspan>
            </text>

            {/* Node id (short) */}
            <text
              x={DEFAULT_LAYOUT_CONFIG.nodeWidth / 2}
              y={DEFAULT_LAYOUT_CONFIG.nodeHeight / 2 + 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(226, 232, 240, 0.85)"
              fontSize={9}
              fontFamily="ui-monospace, monospace"
              className="select-none pointer-events-none"
            >
              {formatNodeIdPreview(node.id)}
            </text>

            {/* Node type */}
            <text
              x={DEFAULT_LAYOUT_CONFIG.nodeWidth / 2}
              y={DEFAULT_LAYOUT_CONFIG.nodeHeight - 10}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(255, 255, 255, 0.75)"
              fontSize={9}
              className="select-none pointer-events-none"
            >
              {node.type}
            </text>

            {/* Execution Order Badge */}
            {node.executionOrder !== undefined && (
              <circle
                cx={DEFAULT_LAYOUT_CONFIG.nodeWidth - 15}
                cy={15}
                r={12}
                fill="#3B82F6"
                stroke="white"
                strokeWidth={2}
              />
            )}
            {node.executionOrder !== undefined && (
              <text
                x={DEFAULT_LAYOUT_CONFIG.nodeWidth - 15}
                y={15}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize={9}
                fontWeight="bold"
                className="select-none pointer-events-none"
              >
                {node.executionOrder}
              </text>
            )}

            {/* Error/Success Indicator */}
            {node.hasError ? (
              <circle
                cx={15}
                cy={15}
                r={8}
                fill="#EF4444"
                stroke="white"
                strokeWidth={2}
              />
            ) : (
              <circle
                cx={15}
                cy={15}
                r={8}
                fill="#10B981"
                stroke="white"
                strokeWidth={2}
              />
            )}
          </g>
        </TooltipTrigger>
        <TooltipContent className="bg-slate-800 border-slate-600 text-slate-200 max-w-sm">
          <div className="space-y-1">
            <div className="font-medium">{node.label}</div>
            <div className="text-xs font-mono text-slate-400 break-all">ID: {node.id}</div>
            <div className="text-sm text-slate-400">Type: {node.type}</div>
            {node.executionTime !== undefined && (
              <div className="text-sm text-slate-400">
                Execution: {formatExecutionTime(node.executionTime)}
              </div>
            )}
            {node.children.length > 0 && (
              <div className="text-sm text-slate-400">
                Children: {node.children.length}
              </div>
            )}
            <div className="text-xs text-slate-500">Click to select</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

/**
 * Connection Lines Component
 */
interface ConnectionLinesProps {
  nodes: TreeNodeVisualization[];
}

function ConnectionLines({ nodes }: ConnectionLinesProps) {
  const nodePositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();
    nodes.forEach(node => {
      positions.set(node.id, node.position);
    });
    return positions;
  }, [nodes]);

  const connections = useMemo(() => {
    const lines: Array<{ from: { x: number; y: number }; to: { x: number; y: number } }> = [];
    
    nodes.forEach(node => {
      const parentPos = nodePositions.get(node.id);
      if (!parentPos) return;

      node.children.forEach(childId => {
        const childPos = nodePositions.get(childId);
        if (!childPos) return;

        lines.push({
          from: {
            x: parentPos.x + DEFAULT_LAYOUT_CONFIG.nodeWidth / 2,
            y: parentPos.y + DEFAULT_LAYOUT_CONFIG.nodeHeight
          },
          to: {
            x: childPos.x + DEFAULT_LAYOUT_CONFIG.nodeWidth / 2,
            y: childPos.y
          }
        });
      });
    });

    return lines;
  }, [nodes, nodePositions]);

  return (
    <g className="connections">
      {connections.map((connection, index) => (
        <line
          key={index}
          x1={connection.from.x}
          y1={connection.from.y}
          x2={connection.to.x}
          y2={connection.to.y}
          stroke="#64748B"
          strokeWidth={2}
          markerEnd="url(#arrowhead)"
          className="transition-all duration-200"
        />
      ))}
    </g>
  );
}

/**
 * Main Calculation Tree Visualization Component
 */
export function CalculationTreeVisualization({
  tree,
  selectedNode,
  onNodeSelect,
  onNodeHover,
  highlightedNodes = new Set(),
  expandedNodes = new Set(),
  onNodeToggle
}: CalculationTreeVisualizationProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panDragRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const treeKeyRef = useRef<string>('');
  const visualizationDataRef = useRef({ nodes: [] as TreeNodeVisualization[], contentWidth: 800, contentHeight: 600 });
  const panRef = useRef({ x: 0, y: 0 });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Transform tree data into visualization format; normalize bbox so content sits in +x/+y with padding
  const visualizationData = useMemo(() => {
    if (!tree || !tree.trees) {
      return { nodes: [], contentWidth: 800, contentHeight: 600 };
    }

    const positions = calculateTreeLayout(tree.trees, DEFAULT_LAYOUT_CONFIG);
    const nodes: TreeNodeVisualization[] = [];

    const processNode = (node: DebugTreeNode): void => {
      const hasError = false; // TODO: Determine from calculation steps
      const executionTime = 0; // TODO: Get from performance metrics

      nodes.push({
        id: node.nodeId,
        type: node.nodeType,
        label: getDebugNodeLabel(node),
        position: positions.get(node.nodeId) || { x: 0, y: 0 },
        color: getNodeTypeColor(node.nodeType),
        isSelected: selectedNode === node.nodeId,
        isHighlighted: highlightedNodes.has(node.nodeId) || hoveredNode === node.nodeId,
        executionOrder: (() => {
          const i = tree.executionOrder.indexOf(node.nodeId);
          return i >= 0 ? i + 1 : undefined;
        })(),
        executionTime,
        hasError,
        children: node.children?.map(child => child.nodeId) || [],
        nodeData: node.nodeData
      });

      if (node.children) {
        node.children.forEach(child => processNode(child));
      }
    };

    tree.trees.forEach((rootNode: DebugTreeNode) => processNode(rootNode));

    if (nodes.length === 0) {
      return { nodes, contentWidth: 800, contentHeight: 600 };
    }

    const nw = DEFAULT_LAYOUT_CONFIG.nodeWidth;
    const nh = DEFAULT_LAYOUT_CONFIG.nodeHeight;
    const minX = Math.min(...nodes.map(n => n.position.x));
    const minY = Math.min(...nodes.map(n => n.position.y));
    const maxX = Math.max(...nodes.map(n => n.position.x + nw));
    const maxY = Math.max(...nodes.map(n => n.position.y + nh));
    const offsetX = CONTENT_PADDING - minX;
    const offsetY = CONTENT_PADDING - minY;

    const normalized = nodes.map(n => ({
      ...n,
      position: { x: n.position.x + offsetX, y: n.position.y + offsetY }
    }));

    const contentWidth = maxX - minX + 2 * CONTENT_PADDING;
    const contentHeight = maxY - minY + 2 * CONTENT_PADDING;

    return { nodes: normalized, contentWidth, contentHeight };
  }, [tree, selectedNode, highlightedNodes, hoveredNode]);

  visualizationDataRef.current = visualizationData;
  panRef.current = pan;

  const centerView = useCallback(() => {
    const el = containerRef.current;
    const vd = visualizationDataRef.current;
    if (!el || vd.nodes.length === 0) return;
    const { contentWidth, contentHeight } = vd;
    const w = el.clientWidth;
    const h = el.clientHeight;
    setZoom(1);
    setPan({
      x: (w - contentWidth) / 2,
      y: (h - contentHeight) / 2
    });
  }, []);

  useLayoutEffect(() => {
    const key = tree?.trees?.map(t => t.nodeId).join(',') ?? '';
    if (treeKeyRef.current !== key) {
      treeKeyRef.current = key;
      requestAnimationFrame(() => centerView());
    }
  }, [tree, visualizationData.contentWidth, visualizationData.contentHeight, centerView]);

  useLayoutEffect(() => {
    if (!isFullscreen) return;
    requestAnimationFrame(() => centerView());
  }, [isFullscreen, centerView]);

  const handleWheelNative = useCallback((e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom(z => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z + delta)));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => el.removeEventListener('wheel', handleWheelNative);
  }, [handleWheelNative, tree]);

  const handleNodeClick = useCallback((nodeId: string) => {
    onNodeSelect(nodeId);
  }, [onNodeSelect]);

  const handleNodeHover = useCallback((nodeId: string | null) => {
    setHoveredNode(nodeId);
    if (onNodeHover) {
      onNodeHover(nodeId);
    }
  }, [onNodeHover]);

  const handleZoomIn = () => setZoom(z => Math.min(ZOOM_MAX, z + ZOOM_STEP));
  const handleZoomOut = () => setZoom(z => Math.max(ZOOM_MIN, z - ZOOM_STEP));
  const handleResetZoom = () => centerView();
  const handleToggleFullscreen = () => setIsFullscreen(!isFullscreen);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    if (target.closest('g.cursor-pointer')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsPanning(true);
    const p = panRef.current;
    panDragRef.current = { x: e.clientX, y: e.clientY, panX: p.x, panY: p.y };
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    const d = panDragRef.current;
    setPan({
      x: d.panX + (e.clientX - d.x),
      y: d.panY + (e.clientY - d.y)
    });
  }, [isPanning]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    setIsPanning(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }, []);

  if (!tree || !tree.trees || tree.trees.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <TreePine className="h-5 w-5" />
            Calculation Tree
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center">
            <TreePine className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">
              No Calculation Tree Available
            </h3>
            <p className="text-slate-400 text-sm">
              Run a debug calculation to view the calculation tree structure
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-slate-800 border-slate-700 ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <TreePine className="h-5 w-5" />
            Calculation Tree
          </CardTitle>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant="secondary" className="bg-slate-700">
                {tree.totalNodes} nodes
              </Badge>
              <Badge variant="secondary" className="bg-slate-700">
                {tree.trees.length} metrics
              </Badge>
              {selectedNode && (
                <Badge variant="outline" className="border-blue-500 text-blue-400">
                  Selected: {selectedNode}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleZoomOut} className="border-slate-600">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetZoom} className="border-slate-600">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomIn} className="border-slate-600">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleToggleFullscreen} className="border-slate-600">
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-slate-500 mb-2">
          Drag the canvas to pan · Scroll wheel to zoom · Reset centers and sets zoom to 100%
        </p>
        <div
          ref={containerRef}
          className={`relative overflow-hidden overscroll-contain bg-slate-900 rounded-lg touch-none select-none ${
            isPanning ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{ height: isFullscreen ? 'calc(100vh - 200px)' : '600px' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              width: visualizationData.contentWidth,
              height: visualizationData.contentHeight,
              willChange: 'transform'
            }}
          >
            <svg
              width={visualizationData.contentWidth}
              height={visualizationData.contentHeight}
              viewBox={`0 0 ${visualizationData.contentWidth} ${visualizationData.contentHeight}`}
              className="block"
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#64748B" />
                </marker>
              </defs>

              <ConnectionLines nodes={visualizationData.nodes} />

              {visualizationData.nodes.map((node) => (
                <TreeNodeComponent
                  key={node.id}
                  node={node}
                  onNodeClick={handleNodeClick}
                  onNodeHover={handleNodeHover}
                />
              ))}
            </svg>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 p-4 bg-slate-700 rounded-lg">
          <h4 className="text-sm font-medium text-slate-300 mb-3">Node Types</h4>
          <div className="flex flex-wrap gap-3">
            {(['METRIC', 'DATA', 'CONSTANT', 'OPERATOR', 'SEED'] as const).map(nodeType => (
              <div key={nodeType} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: getNodeTypeColor(nodeType) }}
                />
                <span className="text-sm text-slate-300">{nodeType}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
              <span>Green dot: step completed without error</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
              <span>Red dot: error during evaluation</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white ring-2 ring-white"
                aria-hidden
              >
                n
              </span>
              <span>Blue badge: execution order (global sequence in this calculation)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
