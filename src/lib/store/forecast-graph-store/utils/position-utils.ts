import type { ForecastNodeClient } from '../types';

/**
 * Calculate a smart position for a new node based on the last edited node position.
 * If no last edited position is available, returns a default position.
 * 
 * @param lastEditedPosition - The position of the last edited node
 * @param existingNodes - Array of existing nodes to avoid overlaps
 * @returns A position object with x and y coordinates
 */
export const calculateSmartNodePosition = (
  lastEditedPosition: { x: number; y: number } | null,
  existingNodes: ForecastNodeClient[] = []
): { x: number; y: number } => {
  // If no last edited position, use default with some randomness
  if (!lastEditedPosition) {
    return {
      x: Math.random() * 300 + 50,
      y: Math.random() * 300 + 50,
    };
  }

  // Base offset from the last edited node
  const baseOffsetX = 150;
  const baseOffsetY = 100;
  
  // Try different positions around the last edited node
  const candidatePositions = [
    { x: lastEditedPosition.x + baseOffsetX, y: lastEditedPosition.y }, // Right
    { x: lastEditedPosition.x, y: lastEditedPosition.y + baseOffsetY }, // Below
    { x: lastEditedPosition.x - baseOffsetX, y: lastEditedPosition.y }, // Left
    { x: lastEditedPosition.x, y: lastEditedPosition.y - baseOffsetY }, // Above
    { x: lastEditedPosition.x + baseOffsetX, y: lastEditedPosition.y + baseOffsetY }, // Bottom-right
    { x: lastEditedPosition.x - baseOffsetX, y: lastEditedPosition.y + baseOffsetY }, // Bottom-left
    { x: lastEditedPosition.x + baseOffsetX, y: lastEditedPosition.y - baseOffsetY }, // Top-right
    { x: lastEditedPosition.x - baseOffsetX, y: lastEditedPosition.y - baseOffsetY }, // Top-left
  ];

  // Check each candidate position for overlap with existing nodes
  for (const candidate of candidatePositions) {
    const hasOverlap = existingNodes.some(node => {
      const distance = Math.sqrt(
        Math.pow(node.position.x - candidate.x, 2) + 
        Math.pow(node.position.y - candidate.y, 2)
      );
      return distance < 120; // Minimum distance to avoid overlap
    });

    if (!hasOverlap) {
      return candidate;
    }
  }

  // If all positions have overlaps, use the first candidate with a random offset
  return {
    x: candidatePositions[0].x + (Math.random() - 0.5) * 100,
    y: candidatePositions[0].y + (Math.random() - 0.5) * 100,
  };
};
