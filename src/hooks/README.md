# Custom Hooks (`src/hooks/`)

This directory is reserved for reusable custom React hooks that provide shared functionality across the application.

**Current Status**: This directory is currently empty, following a distributed hook architecture where hooks are co-located with their related features or UI components.

## Overview

Custom hooks in this directory follow React best practices:
- **Naming Convention**: All hooks start with `use` prefix (e.g., `useToast`)
- **Reusability**: Hooks are designed to be used across multiple components
- **Single Responsibility**: Each hook has a focused, specific purpose
- **TypeScript**: Full type safety with proper interfaces and return types

## Available Hooks

Currently, this directory contains no global hooks. All custom hooks are either:
- **Co-located with features**: For feature-specific functionality
- **Part of UI components**: For component-related state management (e.g., `@/components/ui/use-toast`)
- **Store-based**: Using Zustand stores in `@/lib/store/`

### Toast Hook (Relocated)
The toast notification hook has been moved to `@/components/ui/use-toast.ts` to be co-located with the toast UI components for better organization.

**Usage**:
```typescript
import { useToast } from '@/components/ui/use-toast';

function MyComponent() {
  const { toast } = useToast();
  
  const showSuccess = () => {
    toast({
      title: "Success!",
      description: "Your action was completed successfully.",
      variant: "default"
    });
  };
  
  const showError = () => {
    toast({
      title: "Error",
      description: "Something went wrong.",
      variant: "destructive"
    });
  };
  
  return (
    <div>
      <button onClick={showSuccess}>Show Success</button>
      <button onClick={showError}>Show Error</button>
    </div>
  );
}
```

## Hook Architecture

This directory follows a distributed hook architecture:

### Global Hooks (Future)
- Reserved for truly cross-feature, reusable hooks
- Should have minimal dependencies
- Must be well-documented and tested

### Feature-Specific Hooks
- Co-located with their related components/features
- Contain business logic specific to that feature
- Easier to maintain and modify

### UI Component Hooks
- Co-located with UI components in `@/components/ui/`
- Handle component-specific state and interactions
- Example: `use-toast` for toast notifications

## Feature-Specific Hooks

Some hooks are co-located with their related features for better encapsulation:

### Data Intake Hooks (`src/app/(protected)/data-intake/_components/api-hooks.ts`)
- **`useVariableApi`**: Manages variable CRUD operations with backend API
- **`useCsvProcessor`**: Handles CSV file parsing and data processing
- **Purpose**: These hooks are specific to the data intake feature and contain business logic for variable management

### Store Hooks (`src/lib/store/`)
The application uses Zustand for state management with dedicated store hooks:

#### Forecast Store Hooks (`forecast-graph-store.ts`)
- **`useForecastGraphStore`**: Main store for forecast graph state
- **`useForecastNodes`**, **`useForecastEdges`**: Access graph elements
- **`useForecastMetadata`**, **`useIsForecastDirty`**: Forecast metadata and state
- **`useAddNode`**, **`useDeleteNode`**: Node manipulation actions
- **`useDuplicateNodeWithEdges`**: Advanced node operations

#### Variable Store Hooks (`variables.ts`)
- **`useVariableStore`**: Main store for variable data management
- **`useIsVariablesLoading`**, **`useVariableError`**: Loading and error states
- **`useFetchVariables`**: Data fetching actions
- **`useSetSelectedOrganizationId`**: Organization context management

#### Organization Store Hooks (`organization.ts`)
- **`useOrganizationStore`**: Organization selection and management

### Benefits of Co-location
- **Feature Encapsulation**: Keeps related code together
- **Reduced Coupling**: Avoids unnecessary dependencies between features
- **Easier Maintenance**: Changes to feature logic don't affect global hooks
- **Store Organization**: Zustand stores provide focused state management for specific domains

## Adding New Hooks

When creating new custom hooks:

1. **Determine Location**:
   - Use `src/hooks/` for truly reusable, cross-feature hooks (rare)
   - Use `src/components/ui/` for UI component-related hooks
   - Co-locate with features for feature-specific hooks (recommended)

2. **Follow Naming Conventions**:
   - Start with `use` prefix
   - Use descriptive names (e.g., `useApiData`, `useLocalStorage`)

3. **Include Proper Types**:
   ```typescript
   interface UseMyHookReturn {
     data: MyData | null;
     loading: boolean;
     error: string | null;
     refetch: () => void;
   }
   
   export function useMyHook(): UseMyHookReturn {
     // Implementation
   }
   ```

4. **Handle Side Effects**:
   - Use `useEffect` for cleanup
   - Implement proper dependency arrays
   - Handle component unmounting

5. **Document Usage**:
   - Include JSDoc comments
   - Provide usage examples
   - Document parameters and return values

## Best Practices

- **Separation of Concerns**: Keep hooks focused on a single responsibility
- **Error Handling**: Implement proper error boundaries and fallbacks
- **Performance**: Use `useCallback` and `useMemo` when appropriate
- **Testing**: Write unit tests for complex hook logic
- **Dependencies**: Minimize external dependencies and clearly document them

## Integration with UI Components

Hooks in this directory are designed to work seamlessly with:
- **shadcn/ui components**: Especially toast and notification components
- **Form components**: For validation and state management
- **Data fetching**: Integration with API services and state stores
- **Authentication**: User session and permission management 