# Forecast Components

This directory contains the UI components for the Graphical Forecast Definition feature.

## Main Components

- `forecast-canvas.tsx` - The main canvas component that displays and manages the forecast graph
- `forecast-toolbar.tsx` - Enhanced toolbar for controlling the forecast graph, metadata, **graph validation, and calculation triggers** (UPDATED)
- `node-config-panel.tsx` - Configuration panel for editing node properties. For Data, Metric, and Seed nodes, variable/metric selection dropdowns are dynamically populated from the global `useVariableStore`, filtered by the currently selected organization in that store.

## New Calculation Components

- `graph-validation-display.tsx` - Component for displaying graph validation status with error/warning details and validation controls
- `calculation-results-display.tsx` - Component for displaying forecast calculation results with export functionality and metric filtering
- `calculation-results-table.tsx` - Simple scrollable table for displaying calculation results in main editor area (interim solution)
- `calculation-error-boundary.tsx` - Error boundary component for graceful handling of calculation-related UI errors

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
- Configure node properties via the configuration panel, with dynamic variable lists for relevant nodes. The configuration panel opens automatically when a node is selected.
- Save and load forecast definitions from the API
- Duplicate nodes with their connected edges using the "Duplicate Node" button that appears when a node is selected
- Visual design with drag-and-drop for building forecast relationships
- Name and label nodes for better identification
- **Graph validation with cycle detection and business rule enforcement** (NEW)
- **Forecast calculation with real-time status updates** (NEW)
- **Calculation result display with export capabilities** (NEW)
- **Comprehensive error handling for calculation operations** (NEW)

## API Integration

The components integrate with the backend API through the services defined in `src/lib/api/forecast.ts`. The graph state is managed through the Zustand store in `src/lib/store/forecast-graph-store.ts`. Variable data for dropdowns is sourced from `src/lib/store/variables.ts`.

For full implementation details of loading, saving, and manipulating forecast data, see:

- `src/app/(protected)/forecast-definition/[forecastId]/page.tsx` - Editor page with API integration
- `src/lib/store/forecast-graph-store.ts` - Graph state management including the "Duplicate with Edges" functionality
- `src/lib/store/variables.ts` - Global variable state management. 