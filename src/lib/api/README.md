# API Integration

This directory contains API integration services for communicating with the backend API.

## Files

- `forecast.ts` - Forecast API client for managing forecasts, nodes, and edges

## Usage

Import the API services to make requests to the backend:

```typescript
import { forecastApi } from '@/lib/api/forecast';

// Get all forecasts
const { data, error } = await forecastApi.getForecasts(organizationId);

// Get a specific forecast with nodes and edges
const { data, error } = await forecastApi.getForecast(forecastId);

// Create a new forecast
const { data, error } = await forecastApi.createForecast(name, startDate, endDate, organizationId);

// Update a forecast
const { data, error } = await forecastApi.updateForecast(forecastId, { name: 'New name' });

// Save the entire forecast graph
const { data, error } = await forecastApi.saveForecastGraph(
  forecastId,
  name,
  startDate,
  endDate,
  nodes,
  edges
);
```

## Helper Functions

The API modules include helper functions to convert between client and API data formats:

- `mapForecastToClientFormat`: Converts API response data to the format used by the client
- `mapClientToApiFormat`: Converts client data to the format expected by the API

## Field Naming Convention

All API interfaces use camelCase for field names (e.g., `forecastStartDate`, `forecastEndDate`, `organizationId`) to match the backend API response format. This ensures consistency and avoids ambiguity when working with API data.

## Authentication

All API requests automatically include the authentication token from the cookie, if available. 