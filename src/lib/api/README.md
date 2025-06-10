# API Layer Documentation

This directory contains the frontend API client modules for VibeFC application. These modules handle communication with the backend services.

## Structure

- **`forecast.ts`** - Forecast and forecast graph operations
- **`forecast-calculation.ts`** - Forecast calculation operations

## Modules

### `forecast.ts`
Handles forecast management operations including:
- Creating, updating, and deleting forecasts
- Managing forecast nodes and edges
- Organization-level forecast operations
- Graph data transformation between client and server formats

**Key Features:**
- **⚡ Bulk Save Optimization**: Single API call saves entire forecast graph
- **Performance**: Reduced save time from 10-30 seconds to under 1 second
- **Atomic Operations**: All changes saved as a single transaction

### `forecast-calculation.ts` 
Handles forecast calculation operations including:
- Triggering forecast calculations
- Retrieving calculation results
- Accessing calculation history
- Health checks for calculation services

**Enhanced Error Handling:**
- Historical data validation with available date ranges
- Variable configuration validation with specific guidance
- Graph structure validation with detailed problem descriptions
- User-friendly error messages with actionable guidance

## Authentication

All API modules use cookie-based authentication with the `sb-access-token` cookie. Authentication is handled automatically by the `fetchWithAuth` helper function.

## Usage Examples

### Forecast Operations
```typescript
import { forecastApi } from '@/lib/api/forecast';

// Get all forecasts for an organization
const { data, error } = await forecastApi.getForecasts(organizationId);

// Get a specific forecast with nodes and edges
const { data, error } = await forecastApi.getForecast(forecastId);

// Create a new forecast
const { data, error } = await forecastApi.createForecast(name, startDate, endDate, organizationId);

// Save the entire forecast graph (uses optimized bulk save)
const { data, error } = await forecastApi.saveForecastGraph(
  forecastId, name, startDate, endDate, nodes, edges
);
```

### Forecast Calculation Operations
```typescript
import { forecastCalculationApi } from '@/lib/api/forecast-calculation';

// Trigger calculation
const result = await forecastCalculationApi.calculateForecast('forecast-id');

// Get latest results
const results = await forecastCalculationApi.getCalculationResults('forecast-id');

// Get calculation history
const history = await forecastCalculationApi.getCalculationHistory('forecast-id');
```

## Response Format

All API functions return a standardized response format:

```typescript
interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    statusCode?: number;
  };
}
```

## Environment Configuration

API modules use `NEXT_PUBLIC_BACKEND_URL` environment variable to configure the backend endpoint:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

## Performance Features

### Bulk Save Operations
The forecast API includes optimized bulk save operations:
- **Single API Call**: All forecast data saved in one request
- **Atomic Transactions**: Database operations with rollback support
- **Node ID Mapping**: Server-side handling of node references
- **98% Reduction**: In network overhead compared to individual operations

### Feature Flag Support
- `NEXT_PUBLIC_ENABLE_BULK_SAVE=false` to use legacy version
- Default: `true` (uses optimized bulk save)

## Best Practices

1. **Check for errors** in the response before using data
2. **Handle loading states** appropriately in UI components
3. **Use TypeScript types** for better type safety
4. **Use bulk operations** when available for better performance

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