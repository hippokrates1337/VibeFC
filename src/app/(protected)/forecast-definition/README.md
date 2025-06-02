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

## Technical Details

The forecast definition pages integrate with the backend API through services defined in `src/lib/api/forecast.ts`. The main components used are:

- **`ForecastCanvas`** - The graphical editor component from `src/components/forecast/forecast-canvas.tsx`
- **`ForecastToolbar`** - Controls for managing the forecast from `src/components/forecast/forecast-toolbar.tsx`
- **`NodeConfigPanel`** - Configuration panel for editing node properties

The state management is handled by Zustand store in `src/lib/store/forecast-graph-store.ts`, which manages the nodes, edges, and forecast metadata.

See the `src/components/forecast/README.md` for additional details on the component architecture. 