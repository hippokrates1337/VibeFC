# Custom Hooks (`src/hooks/`)

This directory follows a **distributed hook architecture** where hooks are co-located with their related features or components for better encapsulation.

**Current Status**: This directory is intentionally empty. All custom hooks are organized as follows:

## Hook Organization

### UI Component Hooks
**Location**: `@/components/ui/`
- **`use-toast`**: Global toast notification management

```typescript
import { useToast } from '@/components/ui/use-toast';

const { toast } = useToast();
toast({ title: "Success!", description: "Action completed." });
```

### Store Hooks
**Location**: `@/lib/store/`

#### Forecast Store (`forecast-graph-store.ts`)
Complete forecast graph state management with 30+ specialized hooks:
- **Data Access**: `useForecastNodes`, `useForecastEdges`, `useForecastMetadata`
- **State**: `useIsForecastDirty`, `useIsForecastLoading`, `useSelectedNode`
- **Actions**: `useAddNode`, `useDeleteNode`, `useDuplicateNodeWithEdges`
- **Validation**: `useGraphValidation`, `useValidateGraph`
- **Calculation**: `useCalculationResults`, `useCalculateForecast`

#### Variable Store (`variables.ts`)
Variable data management:
- **`useVariableStore`**: Main store access
- **`useFetchVariables`**: Data fetching
- **`useIsVariablesLoading`**, **`useVariableError`**: Loading states
- **`useSetSelectedOrganizationId`**: Organization context

#### Organization Store (`organization.ts`)
- **`useOrganizationStore`**: Organization selection and management

### Feature-Specific Hooks
**Location**: Co-located with features

#### Data Intake (`src/app/(protected)/data-intake/_components/api-hooks.ts`)
- **`useVariableApi`**: Variable CRUD operations with backend
- **`useCsvProcessor`**: CSV file parsing and validation

## Architecture Benefits

### Co-location Strategy
- **Feature Encapsulation**: Related hooks stay with their features
- **Reduced Coupling**: Avoids global dependencies
- **Easier Maintenance**: Changes don't affect unrelated code
- **Better Organization**: Clear ownership and responsibility

### Store-Based Hooks
- **Focused State Management**: Domain-specific Zustand stores
- **Type Safety**: Full TypeScript support with selectors
- **Performance**: Granular subscriptions with `useShallow`
- **Developer Experience**: Intuitive hook naming and exports

## Adding New Hooks

### Placement Guidelines
1. **Global UI hooks** → `@/components/ui/`
2. **Feature-specific hooks** → Co-locate with feature components
3. **Store hooks** → `@/lib/store/` with related store
4. **Truly global hooks** → `@/hooks/` (rare, consider alternatives first)

### Naming Convention
- Start with `use` prefix
- Be descriptive: `useFetchVariables`, `useCalculationResults`
- Group related hooks: `useIsLoading`, `useIsFetching`, `useError`

## Integration Points

### Authentication
```typescript
import { useAuth } from '@/providers/auth-provider';
const { user, signOut } = useAuth();
```

### Organizations
```typescript
import { useOrganizationStore } from '@/lib/store/organization';
const currentOrg = useOrganizationStore(state => state.currentOrganization);
```

### Variables
```typescript
import { useVariableStore, useFetchVariables } from '@/lib/store/variables';
const variables = useVariableStore(state => state.variables);
const fetchVariables = useFetchVariables();
```

### Toast Notifications
```typescript
import { useToast } from '@/components/ui/use-toast';
const { toast } = useToast();
``` 