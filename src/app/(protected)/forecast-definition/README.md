# Forecast Definition Module

This directory contains the UI for the Graphical Forecast Definition feature, allowing users to create, edit, and manage forecast graphs.

## Files & Components

- **`page.tsx`** - The main page for listing and creating forecasts
- **`[forecastId]/page.tsx`** - The forecast editor page for a specific forecast
- **`[forecastId]/layout.tsx`** - Layout wrapper for the forecast editor

## Features

- List existing forecasts
- Create new forecasts
- Build forecast graphs with nodes and connections
- Save and load forecast definitions

The graphical editor is built with React Flow and integrates with the Forecast API endpoints from the backend.

## Forecast Graph Editor

The forecast definition page now uses the `ForecastCanvas` component from `src/components/forecast/forecast-canvas.tsx`, which provides a graphical editor for forecast graphs using React Flow. Custom node components are implemented in `src/components/forecast/nodes/`.

See the `src/components/forecast/README.md` for details on the forecast editor architecture. 