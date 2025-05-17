# Store Directory

This directory contains Zustand state management stores for the application.

## Stores

- [`variables.ts`](#variable-store-variablests): Manages variable data, time series, and persistence.
- [`organization.ts`](#organization-store-organizationts): Manages organization data and selection.
- [`forecast-graph-store.ts`](#forecast-graph-store-forecast-graph-storets): Manages forecast graph data for the visual editor.

# Variable Store (`variables.ts`)

This module defines a Zustand store for managing variable data within the application. It handles fetching, storing, and persisting variables, including their time series data.

## Purpose

The `useVariableStore` provides a centralized location for managing application variables, which can represent actuals, budgets, or user inputs over time. It includes functionality for:

- Fetching variable data from a backend API.
- Storing variables in memory.
- Persisting variables to `localStorage` for offline access and session continuity.
- Handling loading states and errors during data fetching.
- Selecting and filtering variables based on the currently selected organization.

## Data Structure

The core data structure managed by this store is the `Variable`:

```typescript
interface TimeSeriesData {
  date: Date;
  value: number | null;
}

interface Variable {
  id: string;
  name: string;
  type: 'ACTUAL' | 'BUDGET' | 'INPUT' | 'UNKNOWN';
  timeSeries: TimeSeriesData[];
  organizationId: string;
}
```

- `id`: Unique identifier for the variable.
- `name`: User-friendly name of the variable.
- `type`: Categorization of the variable.
- `timeSeries`: An array of data points, each containing a `date` and a `value`.
- `organizationId`: Identifier for the organization this variable belongs to.

## State

The store maintains the following state:

- `variables`: An array of `Variable` objects.
- `isLoading`: A boolean indicating if variables are currently being fetched.
- `error`: A string containing an error message if fetching failed, otherwise `null`.
- `selectedOrganizationId`: The ID of the currently selected organization, used for filtering or context, or `null` if none is selected.

## Actions

The store exposes the following actions:

- `setVariables(variables: Variable[])`: Replaces the entire list of variables.
- `addVariables(variables: Variable[])`: Adds new variables to the existing list, preventing duplicates based on `id`.
- `clearVariables()`: Removes all variables from the store.
- `fetchVariables(userId: string, token: string)`: Asynchronously fetches variables for a given user from the backend API, updates the state, and handles loading/error states. Requires `NEXT_PUBLIC_BACKEND_URL` environment variable to be set.
- `setSelectedOrganizationId(organizationId: string | null)`: Updates the `selectedOrganizationId` state.

## Persistence and Rehydration

- **Persistence**: The store uses the `persist` middleware to save its state (excluding `isLoading` and `error`) to `localStorage` under the key `variable-storage`.
- **Rehydration**: When the application loads, the store attempts to rehydrate its state from `localStorage`.
  - The `onRehydrateStorage` function ensures that `Date` objects within the `timeSeries` data are correctly reconstructed from their string representations stored in `localStorage` using the `rehydrateVariable` helper function.

## Usage

Import the hooks to interact with the store in your components:

```typescript
import {
  useVariableStore,
  useSetSelectedOrganizationId,
  useIsVariablesLoading,
  useFetchVariables,
  useVariableError
} from '@/lib/store/variables';

// Access the entire state or specific parts
const variables = useVariableStore((state) => state.variables);
const selectedOrgId = useVariableStore((state) => state.selectedOrganizationId);

// Access specific actions or state slices via dedicated hooks
const setSelectedOrgId = useSetSelectedOrganizationId();
const isLoading = useIsVariablesLoading();
const fetchVariables = useFetchVariables();
const error = useVariableError();

// Example: Fetching variables
useEffect(() => {
  if (userId && token) {
    fetchVariables(userId, token);
  }
}, [userId, token, fetchVariables]);

// Example: Setting selected organization
const handleOrgChange = (newOrgId: string | null) => {
  setSelectedOrgId(newOrgId);
};
```

## Backend Interaction

The `fetchVariables` action interacts with the backend API endpoint specified by the `NEXT_PUBLIC_BACKEND_URL` environment variable at `/data-intake/variables/{userId}`. It requires a valid authentication `token`. 

The `fetchVariables` action includes checks to prevent redundant fetches:
- It will not run if a fetch is already in progress (`isLoading` is true).
- It will not run if variables for the currently `selectedOrganizationId` already exist in the store. 

# Forecast Graph Store (`forecast-graph-store.ts`)

This module defines a Zustand store for managing forecast graph data within the visual editor. It handles the state of nodes, edges, and metadata for forecasts.

## Purpose

The `useForecastGraphStore` provides a centralized location for managing forecast graph data, which includes nodes, edges, and forecast metadata. It includes functionality for:

- Loading forecast data into the editor.
- Managing the state of nodes and edges for React Flow rendering.
- Tracking modifications and dirty state.
- Persisting forecast graph data to `localStorage` for session continuity.
- Supporting node selection for configuration panels.

## Data Structure

The core data structures managed by this store are:

```typescript
// Node types
type ForecastNodeKind = 'DATA' | 'CONSTANT' | 'OPERATOR' | 'METRIC' | 'SEED';

// Node with React Flow compatibility
interface ForecastNodeClient extends Node {
  type: ForecastNodeKind;
  data: DataNodeAttributes | ConstantNodeAttributes | OperatorNodeAttributes | MetricNodeAttributes | SeedNodeAttributes;
}

// Edge with React Flow compatibility
interface ForecastEdgeClient extends Edge {}
```

Each node type has specific attributes stored in its `data` property:

- **DATA Node**: Connects to a variable with an offset (`{ variableId: string; offsetMonths: number }`)
- **CONSTANT Node**: Represents a fixed value (`{ value: number }`)
- **OPERATOR Node**: Performs math operations (`{ op: '+' | '-' | '*' | '/' | '^'; inputOrder?: string[] }`)
- **METRIC Node**: Computes values based on historical data and budget targets (`{ label: string; budgetVariableId: string; historicalVariableId: string }`)
- **SEED Node**: Used to initialize forecast calculation (`{ sourceMetricId: string }`)

## State

The store maintains the following state:

- `forecastId`: ID of the loaded forecast.
- `forecastName`: Name of the forecast.
- `forecastStartDate`: Start date of the forecast period.
- `forecastEndDate`: End date of the forecast period.
- `nodes`: Array of `ForecastNodeClient` objects.
- `edges`: Array of `ForecastEdgeClient` objects.
- `isDirty`: Flag indicating unsaved changes.
- `selectedNodeId`: ID of the currently selected node for editing.
- `isLoading`: Flag indicating loading state.
- `error`: Error message or null.

## Actions

The store exposes the following key actions:

- `loadForecast`: Loads a complete forecast into the store.
- `setForecastMetadata`: Updates forecast metadata (name, dates).
- `addNode`: Adds a new node with appropriate defaults.
- `updateNodeData`: Updates a node's attributes.
- `updateNodePosition`: Updates a node's position.
- `deleteNode`: Removes a node and its connected edges.
- `addEdge`: Adds a connection between nodes.
- `deleteEdge`: Removes a connection.
- `onNodesChange`: Handles React Flow node changes.
- `onEdgesChange`: Handles React Flow edge changes.
- `setDirty`: Sets the dirty state.
- `resetStore`: Resets the store to initial state.
- `setSelectedNodeId`: Sets the selected node for editing.
- `setLoading` and `setError`: Manage loading and error states.

## Persistence

The store uses the `persist` middleware to save forecast data to `localStorage` under the key `forecast-graph-storage`. The following state is persisted:

- `forecastId`, `forecastName`
- `forecastStartDate`, `forecastEndDate`
- `nodes`, `edges`

Runtime state (`isDirty`, `selectedNodeId`, `isLoading`, `error`) is excluded from persistence.

## Usage

Import the hooks to interact with the store in your components:

```typescript
import {
  useForecastGraphStore,
  useForecastNodes,
  useForecastEdges,
  useAddNode,
  useUpdateNodeData,
  useDeleteNode,
  // ... other hooks
} from '@/lib/store/forecast-graph-store';

// Access the entire state
const store = useForecastGraphStore();

// Access specific parts with dedicated selectors
const nodes = useForecastNodes();
const edges = useForecastEdges();
const selectedNode = useSelectedNode();

// Access actions with dedicated hooks
const addNode = useAddNode();
const updateNodeData = useUpdateNodeData();
const deleteNode = useDeleteNode();

// Example: Adding a new constant node
const handleAddConstantNode = () => {
  addNode({
    type: 'CONSTANT',
    data: { value: 100 },
    position: { x: 250, y: 250 }
  });
};

// Example: Updating a node's data
const handleUpdateValue = (nodeId: string, value: number) => {
  updateNodeData(nodeId, { value });
};
```

## Integration with React Flow

This store is designed to work seamlessly with React Flow. The node and edge structures are compatible with React Flow's expected formats, and the store includes actions like `onNodesChange` and `onEdgesChange` that can be directly connected to React Flow's corresponding event handlers. 