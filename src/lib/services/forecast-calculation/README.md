# Forecast Calculation Services

This directory contains the frontend forecast calculation components used for immediate UI validation.

## Architecture Overview

The frontend calculation services have been simplified to focus on immediate UI feedback, while the actual forecast calculations are handled by the backend for better performance and consistency.

### Core Component

#### Graph Converter (`graph-converter.ts`)
- **Purpose**: Converts forecast graphs into calculation trees and validates graph structure for immediate UI feedback
- **Key Features**:
  - Graph validation with detailed error reporting
  - Cycle detection
  - Node connection validation
  - Conversion to calculation trees for validation purposes
  - Dependency analysis for cross-tree references

## Validation Flow

1. **Immediate Validation**: Graph structure is validated client-side for instant UI feedback
2. **Backend Calculation**: Actual calculations are performed server-side via API
3. **Result Display**: Calculation results are fetched and displayed in the UI

## Node Type Support

### DATA Nodes
- Validate variable references and month offsets
- Check for proper data node configuration

### CONSTANT Nodes
- Validate numeric values
- Ensure constants are properly defined

### OPERATOR Nodes
- Validate arithmetic operations: +, -, *, /, ^
- Check input connections and ordering
- Ensure proper operator configuration

### METRIC Nodes
- Validate top-level calculation nodes
- Check metric configuration (budget/historical variables)
- Ensure proper metric setup

### SEED Nodes
- Validate references to other metrics
- Check for cross-tree dependencies
- Ensure proper metric chaining setup

## Usage

### Graph Validation for UI

```typescript
import { GraphConverter } from '@/lib/services/forecast-calculation/graph-converter';

// Validate graph structure for immediate UI feedback
const graphConverter = new GraphConverter();
const validation = graphConverter.validateGraph(nodes, edges);

if (!validation.isValid) {
  // Show validation errors in UI
  console.error('Graph validation errors:', validation.errors);
}

// Convert to trees for dependency analysis
const trees = graphConverter.convertToTrees(nodes, edges);
```

### Forecast Calculation

For actual forecast calculations, use the backend API:

```typescript
import { forecastCalculationApi } from '@/lib/api/forecast-calculation';

// Trigger calculation on backend
const results = await forecastCalculationApi.calculateForecast(forecastId);

// Get latest results
const latestResults = await forecastCalculationApi.getCalculationResults(forecastId);

// Get calculation history
const history = await forecastCalculationApi.getCalculationHistory(forecastId);
```

## Architecture Benefits

- **Single Source of Truth**: All calculations happen on the backend
- **Immediate UI Feedback**: Graph validation provides instant user feedback
- **Consistency**: No risk of frontend/backend calculation drift
- **Performance**: Backend handles heavy computational work
- **Scalability**: Calculations can be optimized and scaled server-side

## Error Handling

Graph validation includes comprehensive error handling with:
- Detailed validation messages
- Warning notifications for potential issues
- Clear error categorization
- User-friendly error descriptions 