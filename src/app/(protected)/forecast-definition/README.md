# Forecast Definition Module

This directory contains the UI for the Graphical Forecast Definition feature, allowing users to create, edit, and manage forecast graphs.

## Files & Components

- **`page.tsx`** - The main page for listing and creating forecasts
- **`[forecastId]/page.tsx`** - The forecast editor page for a specific forecast
- **`[forecastId]/layout.tsx`** - Layout wrapper for the forecast editor

## Features

- List existing forecasts from the backend API
- Create new forecasts with default date range
- Build forecast graphs with nodes and connections using React Flow
- Configure node properties via the configuration panel
- Save and load forecast definitions via API integration
- Duplicate nodes with their connected edges
- Navigation with unsaved changes protection
- **Graph validation with comprehensive error and warning reporting**
- **Forecast calculation with real-time status updates**
- **Calculation result display in both sidebar and main area**
- **Simple table-based results display for quick data review**

## Technical Details

The forecast definition pages integrate with the backend API through services defined in `src/lib/api/forecast.ts` and `src/lib/api/forecast-calculation.ts`. The main components used are:

- **`ForecastCanvas`** - The graphical editor component from `src/components/forecast/forecast-canvas.tsx`
- **`ForecastToolbar`** - Enhanced controls for managing the forecast, graph validation, and calculation triggers from `src/components/forecast/forecast-toolbar.tsx`
- **`NodeConfigPanel`** - Configuration panel for editing node properties
- **`CalculationResultsDisplay`** - Sophisticated results display with export capabilities (sidebar)
- **`CalculationResultsTable`** - Simple table-based results display (main area)
- **`GraphValidationDisplay`** - Real-time graph validation status and controls
- **`CalculationErrorBoundary`** - Error boundary for calculation-related UI components

The state management is handled by Zustand store in `src/lib/store/forecast-graph-store.ts`, which manages the nodes, edges, forecast metadata, **graph validation state, and calculation results**.

See the `src/components/forecast/README.md` for additional details on the component architecture. 