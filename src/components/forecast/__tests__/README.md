# Forecast Component Tests

This directory contains tests for the forecast editor components using Jest and React Testing Library.

## Test Coverage

### Custom Node Components
- **`DataNode.test.tsx`**: Tests data node rendering and variable display
- **`ConstantNode.test.tsx`**: Tests constant value node rendering
- **`OperatorNode.test.tsx`**: Tests mathematical operation node rendering
- **`MetricNode.test.tsx`**: Tests metric node rendering and variable integration
- **`SeedNode.test.tsx`**: Tests seed node rendering and source display

### Canvas Component
- **`ForecastCanvas.test.tsx`**: Tests the main React Flow canvas integration
  - Node and edge data passing to React Flow
  - Event handling for graph interactions
  - Custom node type registration
  - Canvas controls and background rendering

## Testing Strategy

- **Mocking**: React Flow and Zustand store dependencies are mocked for isolated testing
- **User-Centric**: Tests focus on component behavior and rendering from user perspective
- **Props Validation**: Ensures components handle missing or incomplete data gracefully
- **Integration**: Verifies proper integration between components and state management

## Running Tests

```bash
# Run forecast component tests
npm test -- src/components/forecast

# Run with coverage
npm run test:coverage -- src/components/forecast
``` 