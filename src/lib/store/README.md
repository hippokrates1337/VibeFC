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