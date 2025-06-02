# Forecast Edge Components (`src/components/forecast/edges/`)

This directory contains custom React Flow edge components for the forecast graph editor.

## Components

### `RankedEdge.tsx`
- **Purpose**: Custom edge component for connecting forecast nodes with ranking support
- **Features**:
  - Visual representation of data flow between nodes
  - Support for edge ranking/ordering when multiple edges connect to the same node
  - Custom styling with Tailwind CSS
  - Interactive edge selection and deletion
  - Smooth curved paths for better visual flow
- **Usage**: Used in the forecast canvas to represent connections between forecast nodes

## Edge Types

The forecast system uses custom edges to represent:
- **Data Flow**: How data moves from one node to another
- **Calculation Dependencies**: Which nodes depend on others for calculations
- **Ranking**: Order of inputs when a node has multiple connections

## Styling

Edges are styled with:
- **Custom Colors**: Different colors for different edge states (selected, hover, default)
- **Smooth Curves**: Bezier curves for natural-looking connections
- **Interactive States**: Visual feedback for user interactions
- **Ranking Indicators**: Visual cues for edge ordering when applicable

## Integration

Edge components work with:
- **React Flow**: Core library for graph visualization and interaction
- **Forecast Store**: State management for edge data and relationships
- **Node Components**: Connected to custom node components in the forecast system
- **Canvas Events**: Mouse and keyboard interactions for edge manipulation

## Usage

Edges are automatically rendered by React Flow when defined in the forecast graph:

```typescript
const edges = [
  {
    id: 'edge-1',
    source: 'node-1',
    target: 'node-2',
    type: 'ranked', // Uses RankedEdge component
    data: {
      rank: 1 // For ordering multiple inputs
    }
  }
];
```

## Customization

Edge appearance can be customized through:
- **Edge Data**: Additional properties passed to the edge component
- **CSS Classes**: Tailwind classes for styling
- **React Flow Props**: Standard React Flow edge properties
- **Theme Integration**: Consistent with the application's design system 