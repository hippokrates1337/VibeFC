import React from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { useForecastNodes } from '@/lib/store/forecast-graph-store';

/**
 * Custom edge component that displays input rank for operator nodes
 */
const RankedEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  source,
  target,
  selected,
}) => {
  const nodes = useForecastNodes();
  
  // Get the target node to check if it's an operator
  const targetNode = nodes.find(node => node.id === target);
  const isTargetOperator = targetNode?.type === 'OPERATOR';
  
  // Get the input rank if target is an operator
  let inputRank: number | null = null;
  if (isTargetOperator && targetNode?.data) {
    const inputOrder = (targetNode.data as any)?.inputOrder || [];
    const rankIndex = inputOrder.indexOf(source);
    // Convert to 1-based index for display
    if (rankIndex >= 0) {
      inputRank = rankIndex + 1;
    }
  }
  
  const [edgePath, labelX, labelY, offsetX, offsetY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  
  // Use the exact labelX, labelY coordinates from getBezierPath
  // These represent the center of the Bézier curve path
  // We can also use offsetX, offsetY if needed for fine-tuning
  const rankLabelX = labelX;
  const rankLabelY = labelY;
  
  // Style for selected edges
  const edgeStyle = selected 
    ? {
        ...style,
        stroke: '#60a5fa', // Blue color for selected edges
        strokeWidth: 3,
      }
    : style;
  
  return (
    <>
      <path
        id={id}
        style={edgeStyle}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      {isTargetOperator && inputRank !== null && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${rankLabelX}px,${rankLabelY}px)`,
              fontSize: 12,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div className={`rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold border-2 shadow-md ${
              selected 
                ? 'bg-blue-600 text-white border-blue-200' 
                : 'bg-blue-500 text-white border-white'
            }`}>
              {inputRank}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default RankedEdge; 