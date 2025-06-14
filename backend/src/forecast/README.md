# Forecast Calculation System ⚡ **OPTIMIZED**

This directory contains the comprehensive forecast calculation system for VibeFC, including graph-based calculations, error handling, and result storage.

## 🚀 Performance Optimization Status

**✅ COMPLETED OPTIMIZATIONS:**
- **Database Layer**: Migrated to `SupabaseOptimizedService` with connection pooling
- **Service Layer**: All forecast services (ForecastService, ForecastNodeService, ForecastEdgeService) optimized  
- **Controller Layer**: Updated to pass request objects for user context isolation
- **Bulk Operations**: High-performance bulk save reduces API calls by 98.7%

**Performance Gains:**
- **Bulk Save**: 10-30 seconds → <1 second (95%+ improvement)
- **Individual Operations**: 50-200ms → 10-50ms (75%+ improvement)  
- **Connection Overhead**: Eliminated via connection pooling
- **Memory Usage**: Reduced via client caching

**Architecture Changes:**
```typescript
// Before: Request-scoped service injection
constructor(private supabaseService: SupabaseService) {}

// After: Singleton service with request-scoped clients  
constructor(private supabaseService: SupabaseOptimizedService) {}

async someMethod(data: any, request: Request) {
  const client = this.supabaseService.getClientForRequest(request);
  // ... use client instead of this.supabaseService.client
}
```

## Overview

The forecast calculation system processes user-defined forecast graphs to produce time-series financial projections. It supports complex calculation workflows through interconnected nodes and provides robust error handling with user-friendly messaging.

## Architecture

### Core Components

1. **ForecastCalculationService** (`services/forecast-calculation.service.ts`)
   - Main orchestration service for forecast calculations
   - Handles data fetching, validation, and result storage
   - Integrates with calculation engine and provides error handling

2. **CalculationEngine** (`services/calculation-engine/calculation-engine.ts`)
   - Core calculation logic for processing forecast graphs
   - Converts graphs to calculation trees for efficient evaluation
   - Implements monthly iteration with caching for performance

3. **VariableDataService** (`services/calculation-engine/variable-data-service.ts`)
   - Handles variable data retrieval and time-series operations
   - Provides data access layer for calculation engine

## Calculation Flow

### 1. Graph Processing
```
User Graph → Data Validation → Tree Conversion → Monthly Calculation → Result Storage
```

### 2. Node Types & Evaluation

#### DATA Nodes
- Reference variables for time-series data with user-defined labels
- Support offset months for historical lookups
- Automatically handle different data types (forecast/budget/historical)
- Include a `name` field for better identification in complex graphs

#### CONSTANT Nodes
- Provide fixed numeric values with user-defined labels
- Remain constant across all calculation types and months
- Include a `name` field for better identification in complex graphs

#### OPERATOR Nodes
- Perform mathematical operations (+, -, *, /, ^)
- Process children in specified input order
- Support complex nested calculations

#### METRIC Nodes
- Root nodes that define calculation outputs
- Control whether to use calculated values or direct variable references
- Manage historical, budget, and forecast value sources
- **Graceful Handling**: Budget and historical variables are optional - missing or empty variables result in null values instead of calculation errors
- Support partial forecasts when only some variables are configured

#### SEED Nodes
- Provide time-series dependencies between calculations
- **First Month Behavior:** Uses historical data from connected metric (t-1)
- **Subsequent Months:** Uses previous month's calculated result from the metric
- Enable complex temporal relationships in forecasts

### 3. Monthly Iteration
- Processes each month sequentially from forecast start to end date
- Maintains calculation cache for performance optimization
- Stores monthly results for each metric node

### 4. Graceful Error Handling for Missing Variables

#### METRIC Node Behavior
When budget or historical variables are not configured for a METRIC node:
- **Budget Calculation**: Returns `null` when `budgetVariableId` is empty
- **Historical Calculation**: Returns `null` when `historicalVariableId` is empty
- **Forecast Calculation**: Falls back to budget variable if available, otherwise returns `null`
- **Warning Logs**: Missing variables generate warnings but do not halt calculation

#### SEED Node Behavior
When the connected metric has no historical variable:
- **First Month**: Returns `null` for historical lookup instead of throwing error
- **Subsequent Months**: Uses previous month's calculated results normally
- **Graceful Degradation**: Allows forecasts to continue with partial data

#### Validation Changes
- Graph validation now generates **warnings** instead of **errors** for missing variables
- Calculations proceed even with incomplete variable configuration
- Users receive informative warnings about missing data in calculation results

## Error Handling

### Comprehensive Validation System

#### Historical Data Validation
- Checks availability of required historical data points
- Reports expected dates vs. available dates
- Provides actionable guidance for missing data scenarios

```typescript
// Example error message
"Historical data for 2025-03-01 not found in variable 'AG_REV_Recurring_All'. 
Available dates: 2024-01-01, 2024-02-01, ..., 2025-01-01. 
Please ensure historical data exists for the month prior to the forecast start date, 
or adjust your forecast start date to begin after the latest available historical data."
```

#### Variable Configuration Validation
- Validates variable references in nodes
- Checks for missing or misconfigured variables
- Ensures proper variable types for intended usage

#### Graph Structure Validation
- Detects circular dependencies
- Validates edge connections
- Ensures graph integrity before calculation

### Error Response Flow
```
CalculationEngine → ForecastCalculationService → Frontend API → Store → UI Toast
```

### Frontend Error Handling
- Categorized error titles based on error patterns
- Extended display duration (8 seconds) for complex errors
- Clean error messages without backend prefixes
- Actionable guidance for users

## API Endpoints

### Calculation Operations
- `POST /forecasts/:id/calculate` - Trigger forecast calculation
- `GET /forecasts/:id/calculation-results` - Get latest calculation results
- `GET /forecasts/:id/calculation-results/history` - Get calculation history
- `GET /forecasts/calculation/health` - Health check endpoint

### Performance Optimized Operations
- `POST /forecasts/:id/bulk-save` - ⚡ **NEW**: High-performance bulk save operation for forecast graphs
  - Replaces N+1 individual API calls with single atomic operation
  - Utilizes PostgreSQL stored procedure for optimal database performance
  - Reduces save times from 10-30 seconds to under 1 second

### Request/Response Examples

#### Calculate Forecast
```http
POST /forecasts/123e4567-e89b-12d3-a456-426614174000/calculate
Authorization: Bearer <token>

Response (200 OK):
{
  "id": "calc-result-id",
  "forecastId": "123e4567-e89b-12d3-a456-426614174000",
  "calculatedAt": "2025-01-27T10:30:00Z",
  "metrics": [
    {
      "metricNodeId": "node-id",
      "values": [
        {
          "date": "2025-02-01T00:00:00Z",
          "forecast": 1500000,
          "budget": 1400000,
          "historical": null
        }
      ]
    }
  ]
}
```

#### Bulk Save Request
```http
POST /forecasts/123e4567-e89b-12d3-a456-426614174000/bulk-save
Authorization: Bearer <token>
Content-Type: application/json

{
  "forecast": {
    "name": "Updated Forecast Name",
    "forecastStartDate": "2025-02-01",
    "forecastEndDate": "2025-12-31"
  },
  "nodes": [
    {
      "clientId": "client-node-1",
      "kind": "METRIC",
      "attributes": { "name": "Revenue" },
      "position": { "x": 100, "y": 100 }
    }
  ],
  "edges": [
    {
      "sourceClientId": "client-node-1",
      "targetClientId": "client-node-2"
    }
  ]
}
```

#### Error Response (400 Bad Request)
```json
{
  "message": "Historical data for 2025-03-01 not found in variable 'AG_REV_Recurring_All' (791b4e1d-352e-4ea0-9455-3bca9384c3aa). Available dates: 2024-01-01, 2024-02-01, 2025-01-01, 2025-02-01. Please ensure historical data exists for the month prior to the forecast start date (2025-03-01), or adjust your forecast start date to begin after the latest available historical data.",
  "statusCode": 400
}
```

## Database Schema

### Calculation Results Storage
```sql
CREATE TABLE forecast_calculation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_id UUID NOT NULL REFERENCES forecasts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  results JSONB NOT NULL, -- Stores MetricCalculationResult[]
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Graph Storage
- `forecast_nodes`: Stores calculation nodes with kind and attributes
- `forecast_edges`: Stores connections between nodes
- Supports proper referential integrity and cascading deletes

## Performance Features

### Caching Strategy
- Node-level calculation caching with composite keys
- Monthly result caching for cross-node dependencies
- Efficient memory usage for large calculation graphs

### Data Optimization
- Lazy loading of variable data
- Efficient date range filtering
- Minimal data transformation overhead

## Node Configuration Features

### Enhanced Node Attributes

All node types now support enhanced configuration options for better user experience:

#### Variable Selection with Grouping
- Variable dropdowns automatically group variables by type (ACTUAL, BUDGET, INPUT, UNKNOWN)
- Provides better organization and easier selection in large variable datasets
- Maintains alphabetical ordering within each group

#### Node Labeling
- **DATA Nodes**: Custom names for better identification (`name` field)
- **CONSTANT Nodes**: Custom names alongside values (`name` field) 
- **METRIC Nodes**: Descriptive labels for calculation outputs (`label` field)

#### Persistence
- All node attributes are persisted in the JSONB `attributes` field
- Frontend Zustand store maintains real-time state
- Changes are saved to the database via the forecast graph API

## Usage Examples

### Service Integration
```typescript
// Inject the service
constructor(
  private readonly forecastCalculationService: ForecastCalculationService
) {}

// Trigger calculation
const result = await this.forecastCalculationService.calculateForecast(
  forecastId,
  userId
);

// Get latest results
const latestResult = await this.forecastCalculationService.getLatestCalculationResults(
  forecastId,
  userId
);
```

### Graph Structure Example
```
SEED (references metric) → OPERATOR (+) ← CONSTANT (100000)
         ↓
    METRIC (result)
```

This creates a calculation where:
1. SEED provides base value from another metric's historical/calculated data
2. CONSTANT adds 100,000 monthly
3. OPERATOR sums the inputs
4. METRIC stores the final result

## Testing

### Unit Tests
- Individual node type evaluation
- Error handling scenarios
- Cache behavior validation
- Date manipulation utilities

### Integration Tests
- End-to-end calculation flows
- Database persistence
- Error propagation
- Multi-metric calculations

## Monitoring & Debugging

### Logging
- Detailed calculation step logging
- Error context preservation
- Performance metrics tracking
- User action correlation

### Health Checks
- Calculation service availability
- Database connectivity
- Variable data accessibility
- Graph validation status

## Future Enhancements

### Planned Features
- Batch calculation processing
- Calculation result comparison
- Advanced caching strategies
- Real-time calculation updates

### Performance Improvements
- Parallel node evaluation
- Optimized data structures
- Advanced memory management
- Calculation result streaming 