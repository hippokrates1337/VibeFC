# Forecast Calculation Services

This directory contains the core forecast calculation engine implementation for VibeFC.

## Architecture Overview

The forecast calculation system is built with a modular architecture consisting of four main components:

### 1. Graph Converter (`graph-converter.ts`)
- **Purpose**: Converts forecast graphs into calculation trees and validates graph structure
- **Key Features**:
  - Graph validation with detailed error reporting
  - Cycle detection
  - Node connection validation
  - Conversion to calculation trees for execution

### 2. Variable Data Service (`variable-data-service.ts`)
- **Purpose**: Provides access to variable data during calculations
- **Key Features**:
  - Month-based data retrieval
  - Offset calculations for historical data
  - Date normalization to first of month

### 3. Calculation Engine (`calculation-engine.ts`)
- **Purpose**: Core calculation execution engine
- **Key Features**:
  - Tree-based calculation execution
  - Support for all node types (DATA, CONSTANT, OPERATOR, METRIC, SEED)
  - Caching for performance optimization
  - Monthly calculation iteration

### 4. Forecast Service (`forecast-service.ts`)
- **Purpose**: Main orchestration service that coordinates the entire calculation process
- **Key Features**:
  - End-to-end calculation workflow
  - Error handling and logging
  - Integration with graph store

## Calculation Flow

1. **Validation**: Graph structure is validated for cycles, connections, and business rules
2. **Conversion**: Valid graphs are converted into calculation trees
3. **Execution**: Trees are executed month-by-month to generate forecast values
4. **Results**: Calculation results are returned with forecast, budget, and historical values

## Node Type Support

### DATA Nodes
- Retrieve variable values with optional month offsets
- Support for historical data lookups

### CONSTANT Nodes
- Return fixed numeric values
- Used for static parameters in calculations

### OPERATOR Nodes
- Support arithmetic operations: +, -, *, /, ^
- Handle multiple inputs with proper ordering
- Division by zero protection

### METRIC Nodes
- Top-level calculation nodes that define forecast outputs
- Support both calculated and variable-based values
- Generate forecast, budget, and historical series

### SEED Nodes
- Reference previous month's results from other metrics
- Enable time-series dependencies
- Support for metric chaining

## Usage

```typescript
import { forecastService } from '@/lib/services/forecast-calculation';

// Validate a graph
const validation = await forecastService.validateGraph(nodes, edges);

// Calculate forecast
const results = await forecastService.calculateForecast(
  forecastId,
  nodes,
  edges,
  startDate,
  endDate,
  variables
);
```

## Error Handling

All services include comprehensive error handling with:
- Detailed error messages
- Logging for debugging
- Graceful failure modes
- Validation before execution

## Performance Considerations

- **Caching**: Results are cached to avoid redundant calculations
- **Tree Structure**: Efficient tree traversal for complex graphs
- **Memory Management**: Careful handling of large datasets
- **Async Operations**: Non-blocking calculation execution 