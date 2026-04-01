# TypeScript Types Documentation

This directory contains TypeScript type definitions for the VibeFC application, providing comprehensive type safety across all forecast and historical calculation workflows.

## Structure

- **`forecast.ts`** - Complete forecast and historical calculation type definitions
- **`react-day-picker.d.ts`** - Date picker component type extensions
- **`testing-library.d.ts`** - Testing library type extensions

## Core Type Categories

### Basic Calculation Types

#### `MonthlyForecastValue`
Base interface for monthly calculation values containing forecast, budget, and historical data.

```typescript
interface MonthlyForecastValue {
  readonly date: Date;
  readonly forecast: number | null;
  readonly budget: number | null;
  readonly historical: number | null;
}
```

#### `MonthlyNodeValue`
Extended monthly values including calculated values for non-metric nodes.

```typescript
interface MonthlyNodeValue extends MonthlyForecastValue {
  readonly calculated: number | null;
}
```

### Calculation Result Types

#### `ForecastCalculationResult`
Standard forecast calculation results for metrics.

#### `ExtendedForecastCalculationResult`
Enhanced results including all node types (metrics, operators, data, etc.).

#### `NodeCalculationResult`
Individual node calculation results with type information and monthly values.

### Historical Calculation Types

#### `HistoricalCalculationRequest`
API request structure for historical calculations.

```typescript
interface HistoricalCalculationRequest {
  readonly actualStartDate: string; // ISO date string (YYYY-MM-DD)
  readonly actualEndDate: string; // ISO date string (YYYY-MM-DD)
}
```

#### `HistoricalCalculationResult`
Extended result type specifically for historical calculations, including period metadata.

```typescript
interface HistoricalCalculationResult extends ExtendedForecastCalculationResult {
  readonly calculationType: 'historical';
  readonly actualPeriodStart: Date;
  readonly actualPeriodEnd: Date;
  readonly forecastPeriodStart: Date | null;
  readonly forecastPeriodEnd: Date | null;
}
```

### Period Management Types

#### `ActualPeriod`
Defines an actual period with start and end dates.

```typescript
interface ActualPeriod {
  readonly startDate: string; // ISO date string (YYYY-MM-DD)
  readonly endDate: string; // ISO date string (YYYY-MM-DD)
}
```

#### `ActualPeriodValidation`
Validation result for actual period configurations.

```typescript
interface ActualPeriodValidation {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly conflictsWithForecastPeriod: boolean;
  readonly suggestedPeriod?: ActualPeriod;
}
```

#### `PeriodConfiguration`
Complete period configuration including forecast and actual periods.

### State Management Types

#### `HistoricalCalculationState`
Comprehensive state management for historical calculations in components.

```typescript
interface HistoricalCalculationState {
  readonly isCalculating: boolean;
  readonly results: HistoricalCalculationResult | null;
  readonly error: string | null;
  readonly lastCalculatedAt: Date | null;
  readonly actualPeriod: ActualPeriod | null;
}
```

### Workflow Coordination Types

#### `MixedCalculationWorkflow`
Coordinates forecast and historical calculations for combined display.

```typescript
interface MixedCalculationWorkflow {
  readonly forecastCalculation: ExtendedForecastCalculationResult | null;
  readonly historicalCalculation: HistoricalCalculationResult | null;
  readonly mergedResults: MergedTimeSeriesData[];
  readonly totalPeriodStart: Date;
  readonly totalPeriodEnd: Date;
  readonly actualPeriodDefined: boolean;
  readonly forecastPeriodDefined: boolean;
}
```

### Display and Visualization Types

#### `MergedTimeSeriesValue`
Combined historical and forecast data for display components.

```typescript
interface MergedTimeSeriesValue {
  readonly date: Date;
  readonly forecast: number | null;
  readonly budget: number | null;
  readonly historical: number | null;
  readonly calculated: number | null;
  readonly isPeriodActual: boolean;
  readonly formattedForecast: string;
  readonly formattedBudget: string;
  readonly formattedHistorical: string;
  readonly formattedCalculated: string;
}
```

#### `MergedTimeSeriesData`
Complete merged time series data for a node including period metadata.

#### `NodeVisualizationValue`
Individual node values formatted for visualization components.

### Metadata and Tracking Types

#### `HistoricalCalculationMetadata`
Detailed metadata for historical calculation tracking and performance monitoring.

```typescript
interface HistoricalCalculationMetadata {
  readonly calculationId: string;
  readonly forecastId: string;
  readonly calculationType: 'historical';
  readonly requestedAt: Date;
  readonly completedAt: Date;
  readonly actualPeriod: ActualPeriod;
  readonly nodeCount: number;
  readonly metricCount: number;
  readonly calculationDurationMs: number;
}
```

## Usage Examples

### Historical Calculation API
```typescript
import type { HistoricalCalculationRequest } from '@/types/forecast';

const request: HistoricalCalculationRequest = {
  actualStartDate: '2024-01-01',
  actualEndDate: '2024-06-30'
};

const result = await forecastCalculationApi.calculateHistoricalValues(
  forecastId,
  request
);
```

### Period Validation
```typescript
import type { ActualPeriod, ActualPeriodValidation } from '@/types/forecast';

const actualPeriod: ActualPeriod = {
  startDate: '2024-01-01',
  endDate: '2024-06-30'
};

const validation: ActualPeriodValidation = validateActualPeriod(
  actualPeriod,
  forecastPeriod
);
```

### State Management
```typescript
import type { HistoricalCalculationState } from '@/types/forecast';

const [historicalState, setHistoricalState] = useState<HistoricalCalculationState>({
  isCalculating: false,
  results: null,
  error: null,
  lastCalculatedAt: null,
  actualPeriod: null
});
```

## Type Safety Features

- **Readonly Properties**: All interfaces use readonly modifiers to prevent accidental mutations
- **Null Safety**: Explicit null types for optional values with proper handling
- **Date Handling**: Consistent Date objects for internal use, ISO strings for API communication
- **Extending Interfaces**: Hierarchical type structure that extends base types safely
- **Generic Support**: Flexible types that work with various forecast node types

## Backward Compatibility

All new historical calculation types extend existing forecast calculation types, ensuring:
- No breaking changes to existing code
- Gradual adoption of new type features
- Full compatibility with existing API responses
- Seamless integration with current state management patterns

This comprehensive type system provides complete type safety across the entire forecast display workflow while maintaining flexibility for future enhancements. 