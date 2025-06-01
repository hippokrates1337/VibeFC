# Forecast Node Components

This directory contains custom React Flow node components for each forecast node kind:

- `DataNode.tsx` - Displays variable data with custom name and offset. Shows variable names from the variable store instead of IDs.
- `ConstantNode.tsx` - Displays constant numeric values.
- `OperatorNode.tsx` - Displays mathematical operations (+, -, *, /, ^).
- `MetricNode.tsx` - Displays budget and historical metrics. Shows variable names from the variable store instead of IDs.
- `SeedNode.tsx` - Displays source metrics for seeding forecasts.

Each node is styled with Tailwind CSS and shadcn/ui, and receives props from React Flow. Node components display key attributes and support user interaction as required by the forecast editor.

## Variable Display

Both `DataNode` and `MetricNode` integrate with the `useVariableStore` to display human-readable variable names instead of variable IDs. If a variable is not found in the store, the component falls back to displaying the ID. 