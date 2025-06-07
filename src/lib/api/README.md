# API Layer

This directory contains the API client modules for communicating with the VibeFC backend services.

## Overview

The API layer provides a clean, type-safe interface between the frontend application and backend services. Each API module handles authentication, error handling, and data transformation.

## Modules

### `forecast.ts`
Handles forecast management operations including:
- Creating and updating forecasts
- Managing forecast nodes and edges
- Organization-level forecast operations
- Graph data transformation between client and server formats

### `forecast-calculation.ts` 
Handles forecast calculation operations including:
- Triggering forecast calculations
- Retrieving calculation results
- Accessing calculation history
- Health checks for calculation services
- **Enhanced Error Handling:** Provides detailed error information for calculation failures
  - Historical data validation errors
  - Variable configuration issues
  - Graph structure problems
  - User-friendly error messages with actionable guidance

**API Endpoints:**
- `POST /forecasts/{forecastId}/calculate` - Trigger calculation (with comprehensive error responses)
- `GET /forecasts/{forecastId}/calculation-results` - Get latest results
- `GET /forecasts/{forecastId}/calculation-results/history` - Get calculation history
- `GET /forecasts/calculation/health` - Service health check

## Authentication

All API modules use cookie-based authentication with the `sb-access-token` cookie. Authentication is handled automatically by the `fetchWithAuth` helper function.

## Error Handling

The API layer implements consistent error handling:
- Network errors are caught and wrapped
- HTTP status codes are checked and converted to meaningful errors
- JSON parsing errors are handled gracefully
- 404 responses are treated as "not found" rather than errors where appropriate
- **Forecast Calculation Errors:** Enhanced error handling for calculation operations
  - Historical data missing errors with available date ranges
  - Variable configuration validation with specific guidance
  - Graph structure validation with detailed problem descriptions
  - User-friendly error titles and extended display duration

## Data Transformation

API modules handle data transformation between:
- Frontend client models (with proper TypeScript types)
- Backend DTOs (with date strings and specific formatting)
- Proper date object conversion and null handling

## Usage Example

```typescript
import { forecastCalculationApi } from '@/lib/api/forecast-calculation';

// Trigger calculation
try {
  const result = await forecastCalculationApi.calculateForecast('forecast-id');
  console.log('Calculation completed:', result);
} catch (error) {
  console.error('Calculation failed:', error.message);
}

// Get latest results
const results = await forecastCalculationApi.getCalculationResults('forecast-id');
if (results) {
  console.log('Found calculation results:', results);
} else {
  console.log('No calculation results available');
}
```

## Environment Configuration

API modules use `NEXT_PUBLIC_BACKEND_URL` environment variable to configure the backend endpoint:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

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
- `mapClientToApiFormat`: Converts client data to the format expected by the API (currently commented out after refactoring)

## Additional API Methods

The `forecastApi` object also includes methods for individual node and edge operations:

- `addNode`: Add a new node to a forecast
- `updateNode`: Update node attributes or position
- `deleteNode`: Remove a node and its connected edges
- `addEdge`: Create a connection between two nodes
- `deleteEdge`: Remove a connection between nodes
- `deleteForecast`: Delete an entire forecast

## Field Naming Convention

All API interfaces use camelCase for field names (e.g., `forecastStartDate`, `forecastEndDate`, `organizationId`) to match the backend API response format. This ensures consistency and avoids ambiguity when working with API data. 