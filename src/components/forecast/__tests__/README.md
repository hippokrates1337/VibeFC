# Forecast Component Tests

This directory contains tests for the forecast editor components, specifically the custom React Flow nodes and the main canvas. These tests follow the project's testing guidelines.

## Test Coverage

The tests cover:

1.  **Custom Node Components**:
    *   `DataNode.test.tsx`: Tests for the Data node.
    *   `ConstantNode.test.tsx`: Tests for the Constant node.
    *   `OperatorNode.test.tsx`: Tests for the Operator node.
    *   `MetricNode.test.tsx`: Tests for the Metric node.
    *   `SeedNode.test.tsx`: Tests for the Seed node.

    Each custom node test verifies:
    *   Correct rendering of node-specific data attributes (e.g., variable ID, operator type, metric label).
    *   Proper handling and display of default values when data props are incomplete or missing.
    *   Accurate rendering and positioning of React Flow `Handle` components (source and target connection points).

2.  **Canvas Component**:
    *   `ForecastCanvas.test.tsx`: Tests for the main `ForecastCanvas` that hosts the React Flow graph.

    The canvas tests verify:
    *   Proper integration with the (mocked) React Flow library.
    *   Correct passing of nodes and edges data from the (mocked) Zustand store to React Flow.
    *   Event handling: Ensures that callbacks for node changes, edge changes, and new connections correctly trigger the corresponding actions in the Zustand store.
    *   Registration of all custom node types (`DataNode`, `ConstantNode`, etc.) with React Flow.
    *   Rendering of auxiliary React Flow components like `Controls` and `Background`.

## Testing Approach

These tests utilize:
*   Jest as the test runner and for mocking.
*   React Testing Library for rendering components and asserting their behavior in a user-centric way.
*   Mocks for `reactflow` and the `useForecastGraphStore` (Zustand) to isolate components and control dependencies.

The tests focus on ensuring that:
*   Node components display the correct information based on their props.
*   Nodes correctly expose connection points (handles).
*   The canvas component correctly integrates with the graph store and React Flow, responding appropriately to events. 