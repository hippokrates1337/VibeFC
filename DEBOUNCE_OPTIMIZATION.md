# Debounce Optimization for Node Configuration Panel

## Problem

The `NodeConfigPanel` component was calling `updateNodeData` on every keystroke when editing node properties, particularly noticeable when editing the MetricNode's label field. This caused:

1. **Performance Issues**: Store updates on every character typed
2. **Excessive Logging**: Console spam with update messages
3. **Unnecessary Persistence**: LocalStorage writes on every keystroke
4. **Potential Re-renders**: Connected components re-rendering frequently

## Console Output Before Fix
```
[ForecastGraphStore] updateNodeData called for nodeId: 3e1e5ded-d97d-4a08-846d-2dadd226b29f with updates: {label: 'F'}
[ForecastGraphStore] updateNodeData called for nodeId: 3e1e5ded-d97d-4a08-846d-2dadd226b29f with updates: {label: 'FI'}
[ForecastGraphStore] updateNodeData called for nodeId: 3e1e5ded-d97d-4a08-846d-2dadd226b29f with updates: {label: 'FIn'}
[ForecastGraphStore] updateNodeData called for nodeId: 3e1e5ded-d97d-4a08-846d-2dadd226b29f with updates: {label: 'FIna'}
[ForecastGraphStore] updateNodeData called for nodeId: 3e1e5ded-d97d-4a08-846d-2dadd226b29f with updates: {label: 'FInal'}
```

## Solution

Implemented a **debounced input system** with the following features:

### 1. Custom Debounce Hook
```typescript
const useDebouncedUpdate = (callback: (value: any) => void, delay: number = 300) => {
  // Debounces store updates by 300ms
}
```

### 2. Local State for Immediate UI Feedback
```typescript
const [localFormData, setLocalFormData] = useState<Record<string, any>>({});
```

### 3. Dual Update Strategy
```typescript
const handleInputChange = (field: string, value: any) => {
  // 1. Update local state immediately (responsive UI)
  const newData = { ...localFormData, [field]: value };
  setLocalFormData(newData);
  
  // 2. Debounce store update (performance)
  debouncedUpdate({ [field]: value });
};
```

### 4. React Rules of Hooks Compliance
**Critical Fix**: Moved all hooks before the early return statement to comply with React's Rules of Hooks:

```typescript
// ❌ BEFORE (Hooks violation)
if (!selectedNode) return null;
const [localFormData, setLocalFormData] = useState({});

// ✅ AFTER (Compliant)
const [localFormData, setLocalFormData] = useState({});
if (!selectedNode) return null;
```

## Issues Encountered & Fixed

### React Rules of Hooks Violation
The initial implementation caused a critical React error:
```
Error: Rendered fewer hooks than expected. This may be caused by an accidental early return statement.
```

**Root Cause**: Hooks were called after an early return statement, violating React's Rules of Hooks.

**Solution**: Moved all hooks (`useState`, `useEffect`, `useDebouncedUpdate`) to the top of the component, before any conditional returns.

## Benefits

1. **Responsive UI**: Input fields update immediately via local state
2. **Optimized Store Updates**: Store only updates after 300ms of inactivity
3. **Reduced Console Spam**: Logging only occurs on actual store updates
4. **Better Performance**: Fewer re-renders and localStorage writes
5. **Maintained Functionality**: All existing features work exactly the same
6. **React Compliance**: Follows React's Rules of Hooks correctly

## Console Output After Fix
```
[ForecastGraphStore] updateNodeData called for nodeId: 3e1e5ded-d97d-4a08-846d-2dadd226b29f with updates: {label: 'Final'}
```

## Implementation Details

- **Debounce Delay**: 300ms (configurable)
- **Affected Components**: All input fields in NodeConfigPanel
- **Node Types**: DATA, CONSTANT, OPERATOR, METRIC, SEED
- **Cleanup**: Proper timeout cleanup on component unmount
- **Testing**: Comprehensive test suite to verify debounce behavior
- **React Compliance**: All hooks called unconditionally at component top level

## Files Modified

- `src/components/forecast/node-config-panel.tsx` - Main implementation + Rules of Hooks fix
- `src/components/forecast/__tests__/node-config-panel.test.tsx` - Test coverage

## Usage

The optimization is transparent to users. The UI remains as responsive as before, but with significantly better performance characteristics and no React errors.

## Testing

Run the test suite to verify the debounce functionality:

```bash
npm test -- node-config-panel.test.tsx
```

The tests verify:
- Debounce prevents excessive store calls
- UI remains responsive with immediate local updates
- Final value is correctly persisted to store
- Multiple rapid changes are handled correctly
- No React Rules of Hooks violations 