# Forecast Calculation System

This directory contains the comprehensive forecast calculation system for VibeFC, providing graph-based financial forecasting with multi-period support.

## Overview

The forecast calculation system processes user-defined forecast graphs to produce time-series financial projections. It supports complex calculation workflows through interconnected nodes and provides robust error handling with user-friendly messaging.

## Architecture

### Core Components

1. **ForecastCalculationService** (`services/forecast-calculation.service.ts`)
   - Main orchestration service for forecast calculations
   - Handles data fetching, validation, and result storage
   - Integrates with calculation engine and provides error handling

2. **CalculationEngine** (`services/calculation-engine/calculation-engine.ts`)
   - Main interface to the calculation system
   - Routes requests to appropriate implementation (legacy/new)
   - Maintains backward compatibility

3. **CalculationEngineCore** (`services/calculation-engine/calculation-engine-core.ts`)
   - New refactored calculation engine implementation
   - Single unified calculation method replacing legacy complexity
   - Uses strategy pattern for node evaluation

4. **VariableDataService** (`services/calculation-engine/variable-data-service.ts`)
   - Handles variable data retrieval and time-series operations
   - Provides data access layer for calculation engine
   - Manages UTC date normalization for consistency

## Node Types & Evaluation Rules

### DATA Nodes
- **Purpose**: Reference variables for time-series data
- **Attributes**: 
  - `variableId`: UUID of the variable to reference
  - `offsetMonths`: Number of months to offset (can be negative)
  - `name`: User-defined label for identification
- **Evaluation Rules**:
  - **Historical**: Only uses ACTUAL or UNKNOWN variable types
  - **Forecast**: Only uses INPUT or UNKNOWN variable types
  - **Budget**: Only uses BUDGET variable types
- **Date Handling**: Target date calculated as `baseDate + offsetMonths`
- **Caching**: Results cached by (nodeId, month, calculationType)

### CONSTANT Nodes
- **Purpose**: Provide fixed numeric values
- **Attributes**:
  - `value`: Numeric constant value
  - `name`: User-defined label for identification
- **Evaluation Rules**:
  - Returns same value regardless of month or calculation type
  - Must be finite number (not NaN or Infinity)
- **Validation**: Value must be a valid finite number

### OPERATOR Nodes
- **Purpose**: Perform mathematical operations on child values
- **Attributes**:
  - `op`: Operator type ('+', '-', '*', '/', '^')
  - `inputOrder`: Array defining order of child evaluation
- **Evaluation Rules**:
  - **Addition (+)**: Sum of all child values
  - **Subtraction (-)**: First value minus subsequent values (unary minus if single child)
  - **Multiplication (*)**: Product of all child values
  - **Division (/)**: Sequential division (reciprocal if single child)
  - **Power (^)**: Requires exactly 2 operands, first raised to power of second
  - **Null Propagation**: If any child returns null, result is null
  - **Division by Zero**: Returns null for division by zero
- **Child Order**: Uses `inputOrder` if specified, otherwise natural order

### METRIC Nodes
- **Purpose**: Root nodes that define calculation outputs
- **Attributes**:
  - `label`: Descriptive name for the metric
  - `useCalculated`: Boolean controlling value source for historical and budget calculations only
  - `budgetVariableId`: Variable for budget calculations (when useCalculated=false)
  - `historicalVariableId`: Variable for historical calculations (when useCalculated=false)
- **Evaluation Rules**:
  - **Forecast**: ALWAYS calculated from child nodes (ignores useCalculated flag and variable IDs)
  - **Historical**: 
    - If `useCalculated=true`: Uses calculated value from child nodes
    - If `useCalculated=false`: Uses `historicalVariableId` variable only
  - **Budget**:
    - If `useCalculated=true`: Uses calculated value from child nodes
    - If `useCalculated=false`: Uses `budgetVariableId` variable only
- **Enhanced Debugging**: Detailed logging for forecast calculation paths and child node evaluation
- **Requirements**: Must have exactly one child node for calculations
- **Graceful Degradation**: Missing variables result in null values (not errors)

### SEED Nodes
- **Purpose**: Provide time-series dependencies between calculations
- **Attributes**:
  - `sourceMetricId`: ID of the metric to reference
- **Evaluation Rules**:
  - **First Month Behavior**: Uses historical data from source metric's historical variable (t-1)
    - Looks up previous month's value from the `historicalVariableId` of the source metric
    - Only uses historical data, no fallback to forecast or budget values
    - Falls back to calculated historical value if direct variable access fails
  - **Subsequent Months**: Uses previous month's calculated result from source metric
    - Accesses `context.nodeResults` to find the source metric's previous month value
    - Gets value based on current calculation type (historical, forecast, or budget)
    - Source metric must be calculated before SEED nodes due to dependency ordering
  - **Dependency Ordering**: SEED nodes require source metrics to be calculated first
    - Tree processor ensures proper dependency ordering in calculation sequence
    - Previous month's values are available through the extended caching system
- **Temporal Logic**: Enables complex month-over-month relationships with historical anchoring
- **Result Storage**: Node attributes (including `sourceMetricId`) are preserved in calculation results for debugging and analysis

## Calculation Flow

### 1. Request Processing
```
API Request → Validation → Data Fetching → Graph Conversion → Calculation → Result Storage
```

### 2. Period Management
- **MM-YYYY Format**: All periods use MM-YYYY string format (e.g., "03-2025")
- **Forecast Period**: User-defined start/end months for forecasting
- **Actual Period**: Historical data period for comparison
- **Month Generation**: Automatic generation of month arrays for iteration

### 3. Tree Processing
- **Dependency Ordering**: Trees processed in dependency order to resolve SEED references
- **Node Calculation**: Each node calculated for all months and calculation types
- **Caching Strategy**: Results cached at node level to prevent recalculation

### 4. Monthly Iteration
- Processes each month sequentially within periods
- Maintains calculation context across months for SEED dependencies
- Stores results for each combination of (node, month, calculationType)

## Variable Data Rules

### Variable Types & Usage
- **ACTUAL**: Historical/actual financial data, only used in historical calculations
- **BUDGET**: Budget/planned financial data, only used in budget calculations
- **INPUT**: User-provided values for forecasting, only used in forecast calculations
- **UNKNOWN**: Legacy type, used in both historical and forecast calculations

### Data Filtering
- **Date Normalization**: All dates normalized to first of month in UTC
- **Exact Matching**: Variables matched by exact year/month comparison
- **Offset Handling**: Month offsets calculated before variable lookup
- **Missing Data**: Returns null for missing variable values (graceful degradation)

## Calculation Types

### Historical Calculations
- **Period**: Uses actual period months
- **Data Sources**: Only ACTUAL/UNKNOWN variables
- **Purpose**: Calculate metrics using historical data

### Forecast Calculations  
- **Period**: Uses forecast period months
- **Data Sources**: Only INPUT/UNKNOWN variables
- **Purpose**: Project future values based on forecast models

### Budget Calculations
- **Period**: Uses forecast period months  
- **Data Sources**: Only BUDGET variables
- **Purpose**: Compare against planned/budgeted values

## Error Handling

### Validation System
- **Request Validation**: Validates calculation requests before processing
- **Graph Validation**: Ensures valid graph structure and node connectivity
- **Node Validation**: Validates individual node attributes and requirements
- **Data Integrity**: Checks for orphaned references and missing data

### Error Categories
- **Validation Errors**: Invalid graph structure or node configuration
- **Calculation Errors**: Runtime errors during computation (division by zero, etc.)
- **Data Errors**: Missing variables or data points
- **System Errors**: Database or service failures

### Graceful Degradation
- **Missing Variables**: Generate warnings but continue calculation
- **Null Values**: Propagate null values through calculations without failure
- **Partial Results**: Return partial results when some nodes succeed

## Performance Features

### Caching Strategy
- **Node-Level Caching**: Cache results by (nodeId, month, calculationType)
- **Context Persistence**: Maintain results across tree processing
- **Cache Clearing**: Automatic cache clearing between calculations

### Optimization Techniques
- **Dependency Ordering**: Process trees in dependency order to minimize recalculation
- **Lazy Evaluation**: Only calculate required months and types
- **Connection Pooling**: Optimized database connections via SupabaseOptimizedService
- **Bulk Operations**: Efficient bulk save operations for large graphs

## API Endpoints

### Calculation Operations
- `POST /forecasts/:id/calculate` - Trigger forecast calculation (legacy)
- `POST /forecasts/:id/calculate-with-periods` - Unified calculation with period support
- `GET /forecasts/:id/calculation-results` - Get latest calculation results
- `GET /forecasts/:id/calculation-results/history` - Get calculation history

### Period Management
- `PATCH /forecasts/:id/periods` - Update forecast period fields (MM-YYYY format)

### Performance Operations
- `POST /forecasts/:id/bulk-save` - High-performance bulk save for forecast graphs

## Database Schema

### Calculation Results Storage
```sql
CREATE TABLE forecast_calculation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_id UUID NOT NULL REFERENCES forecasts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  results JSONB NOT NULL, -- Stores complete calculation results
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Graph Storage
- `forecast_nodes`: Stores calculation nodes with kind and attributes
- `forecast_edges`: Stores connections between nodes
- Supports proper referential integrity and cascading deletes

## Testing

### Unit Tests
- Individual node strategy testing
- Error handling scenario validation
- Cache behavior verification
- Date manipulation utilities

### Integration Tests
- End-to-end calculation flows
- Database persistence testing
- Error propagation verification
- Multi-metric calculation validation

## Usage Examples

### Service Integration
```typescript
// Inject the service
constructor(
  private readonly forecastCalculationService: ForecastCalculationService
) {}

// Trigger unified calculation
const calculationRequest = {
  calculationTypes: ['forecast', 'budget'],
  includeIntermediateNodes: true
};

const result = await this.forecastCalculationService.calculateForecastWithPeriods(
  forecastId,
  userId,
  request,
  calculationRequest
);
```

### Graph Structure Example
```
DATA (Variable A) → OPERATOR (+) ← CONSTANT (100000)
                         ↓
SEED (Previous Month) → OPERATOR (*) ← CONSTANT (1.05)
                         ↓
                    METRIC (Revenue Growth)
```

This creates a calculation where:
1. DATA node fetches variable value
2. CONSTANT adds 100,000 base amount
3. SEED provides previous month's result
4. Second OPERATOR applies 5% growth rate
5. METRIC stores the final revenue projection

## Monitoring & Health Checks

### Logging
- Detailed calculation step logging with context
- Error context preservation for debugging
- Performance metrics tracking
- Cache hit/miss statistics

### Health Endpoints
- Calculation service availability checks
- Database connectivity validation
- Variable data accessibility verification