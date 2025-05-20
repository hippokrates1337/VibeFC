# Forecast Components

This directory contains the UI components for the Graphical Forecast Definition feature.

## Main Components

- `forecast-canvas.tsx` - The main canvas component that displays and manages the forecast graph
- `forecast-toolbar.tsx` - Toolbar for controlling the forecast graph and its metadata
- `node-config-panel.tsx` - Configuration panel for editing node properties. For Data, Metric, and Seed nodes, variable/metric selection dropdowns are dynamically populated from the global `useVariableStore`, filtered by the currently selected organization in that store.

## Node Components

Custom node components for different node types are found in the `nodes/` subdirectory:

- `constant-node.tsx` - Node for constant values
- `data-node.tsx` - Node for variable data references with optional time offset and custom name
- `metric-node.tsx` - Node for budget and historical metrics
- `operator-node.tsx` - Node for mathematical operations
- `seed-node.tsx` - Node for seeding forecast metrics from sources

## Functionality

The forecast editor provides the following functionality:

- Create and connect different types of nodes to build a forecast graph
- Configure node properties via the configuration panel, with dynamic variable lists for relevant nodes.
- Save and load forecast definitions from the API
- Duplicate nodes with their connected edges
- Visual design with drag-and-drop for building forecast relationships
- Name and label nodes for better identification

## API Integration

The components integrate with the backend API through the services defined in `src/lib/api/forecast.ts`. The graph state is managed through the Zustand store in `src/lib/store/forecast-graph-store.ts`. Variable data for dropdowns is sourced from `src/lib/store/variables.ts`.

For full implementation details of loading, saving, and manipulating forecast data, see:

- `src/app/(protected)/forecast-definition/[forecastId]/page.tsx` - Editor page with API integration
- `src/lib/store/forecast-graph-store.ts` - Graph state management including the "Duplicate with Edges" functionality
- `src/lib/store/variables.ts` - Global variable state management. 