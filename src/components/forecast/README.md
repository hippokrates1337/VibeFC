# Forecast Components

This directory contains all components for the graphical forecast definition feature, including:

- `forecast-canvas.tsx`: Main React Flow canvas for editing forecast graphs.
- `nodes/`: Custom node components for each forecast node kind (Data, Constant, Operator, Metric, Seed).
- `node-config-panel.tsx`: Panel for editing node attributes based on node type.
- `forecast-toolbar.tsx`: Toolbar for canvas actions like adding nodes, setting forecast metadata, and saving changes.
- `__tests__/`: Tests for all forecast components.

## Component Structure

### ForecastCanvas
The main canvas component that wraps React Flow and handles the rendering of nodes and edges. It connects to the Zustand store for state management.

### NodeConfigPanel
A side panel that appears when a node is selected, allowing configuration of node-specific attributes. It dynamically renders different forms based on the type of the selected node.

### ForecastToolbar
Controls for the forecast graph editor, including:
- Forecast metadata (name, date range)
- Node creation buttons for each node type
- Save and other action buttons
- Validation for user inputs

### Custom Node Components
Located in the `nodes/` directory, these components define the visual appearance and behavior of each node type in the graph:
- `DataNode.tsx`: For data source nodes
- `ConstantNode.tsx`: For constant value nodes
- `OperatorNode.tsx`: For mathematical operation nodes
- `MetricNode.tsx`: For business metric definition nodes
- `SeedNode.tsx`: For seed value nodes

## State Management

All components interact with a central Zustand store (`forecast-graph-store.ts`) that handles:
- Nodes and edges data
- Node selection state
- Dirty state tracking
- Loading and error states
- CRUD operations for the graph elements

The components follow a unidirectional data flow pattern where UI events trigger store actions, and components subscribe to relevant parts of the store state. 