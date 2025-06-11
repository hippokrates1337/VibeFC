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

## New Visualization Components

- `month-slider.tsx` - Interactive month slider for selecting which month to visualize on the canvas
- `visualization-controls.tsx` - Controls panel for toggling visualization features on/off  
- `node-value-overlay.tsx` - Overlay component that displays forecast and calculated values on nodes for the selected month (Phase 5: ✅ Complete node coverage with color-coded overlays and standardized US number formatting)

## Node Components

Custom node components for different node types are found in the `nodes/` subdirectory:

- `constant-node.tsx` - Node for constant values (Phase 5: ✅ Visualization overlay removed as constants don't need month-based forecasting)
- `data-node.tsx` - Node for variable data references with optional time offset and custom name (Phase 5: ✅ Complete value tracking implemented)
- `metric-node.tsx` - Node for budget and historical metrics (Phase 5: ✅ Complete value tracking implemented)
- `operator-node.tsx` - Node for mathematical operations (Phase 5: ✅ Complete value tracking implemented)
- `seed-node.tsx` - Node for referencing other metric calculations (Phase 5: ✅ Complete value tracking implemented)

## Functionality

The forecast editor provides the following functionality:

- Create and connect different types of nodes to build a forecast graph
- Configure node properties via the configuration panel, with dynamic variable lists for relevant nodes. The configuration panel opens automatically when a node is selected.
- Save and load forecast definitions from the API
- Duplicate nodes with their connected edges using the "Duplicate Node" button that appears when a node is selected
- Visual design with drag-and-drop for building forecast relationships
- Name and label nodes for better identification
- **Smart node positioning - new nodes appear near the last edited node** (NEW)
- **Graph validation with cycle detection and business rule enforcement** (NEW)
- **Forecast calculation with real-time status updates** (NEW)
- **Calculation result display with export capabilities** (NEW)
- **Comprehensive error handling for calculation operations** (NEW)
- **Month-by-month visualization with interactive slider** (NEW)
- **Node value overlays showing calculated values for selected months** (NEW)
- **Automatic visualization updates when forecast period changes** (NEW)

## API Integration

The components integrate with the backend API through the services defined in `src/lib/api/forecast.ts`. The graph state is managed through the Zustand store in `src/lib/store/forecast-graph-store.ts`. Variable data for dropdowns is sourced from `src/lib/store/variables.ts`.

## Smart Node Positioning

The forecast editor now includes intelligent node positioning that places new nodes near your last edit location instead of randomly in the center of the canvas. This feature:

- **Comprehensively tracks** the position of the last edited node (added, moved, modified, or duplicated)
- **Monitors all position changes** including drag operations and programmatic moves
- Places new nodes in optimal positions around the last edited node
- Automatically avoids overlapping with existing nodes
- Provides 8 candidate positions: right, below, left, above, and the four diagonal combinations
- Falls back to a position with random offset if all positions are occupied

### Enhanced Position Tracking

The system now tracks position changes through multiple mechanisms:
- **Node additions** - Tracked when nodes are created
- **Attribute modifications** - Position updated when node data changes
- **Drag operations** - Real-time tracking of manual node movements
- **Programmatic moves** - Position changes via store actions
- **Node duplication** - Tracks the duplicated node's position

The positioning logic is implemented in `calculateSmartNodePosition()` in the forecast graph store and is automatically used by the toolbar when adding new nodes.

For full implementation details of loading, saving, and manipulating forecast data, see:

- `src/app/(protected)/forecast-definition/[forecastId]/page.tsx` - Editor page with API integration
- `src/lib/store/forecast-graph-store.ts` - Graph state management including the "Duplicate with Edges" functionality and **smart positioning logic** (UPDATED)
- `src/lib/store/variables.ts` - Global variable state management.

## Design Improvements (Latest Updates)

### Color-Coded Node Value Overlays
The visualization overlays now use color schemes that perfectly match each node type:
- **DATA nodes**: Blue overlays (`bg-blue-900/90 border-blue-600/50 text-blue-200`)
- **OPERATOR nodes**: Yellow overlays (`bg-yellow-900/90 border-yellow-600/50 text-yellow-200`)
- **METRIC nodes**: Purple overlays (`bg-purple-900/90 border-purple-600/50 text-purple-200`) - Removed conflicting header icon
- **SEED nodes**: Pink overlays (`bg-pink-900/90 border-pink-600/50 text-pink-200`)

### Improved Overlay Positioning  
All overlays now use `bottom-right` positioning to avoid overlapping with:
- Node names and titles in headers
- Icons and other UI elements
- Optimal visibility without cluttering the interface

### Standardized Number Formatting
All node value displays now use consistent US-style formatting:
- **Whole numbers only**: Decimal places removed (e.g., `96,285` instead of `96.285,22`)
- **Thousand separators**: Commas for readability (e.g., `1,234,567`)
- **Consistent scale**: No more mixed units like "22 Mio." vs "96.285,22"

These improvements provide a cleaner, more professional visualization experience that matches the sophisticated dark theme and enhances readability across all node types. 