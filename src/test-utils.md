# Test Utilities Documentation

## Overview

This project uses custom test utilities that wrap React Testing Library with error boundary support to prevent test failures caused by unhandled component errors.

## Files

- `src/test-utils.tsx` - Custom render functions with error boundary support
- `update-test-imports.ps1` - PowerShell script to update test imports
- `update-test-imports.js` - Node.js script to update test imports

## Usage

### In Test Files

Instead of importing from `@testing-library/react`, import from `@/test-utils`:

```typescript
// ❌ Old way (causes test failures with unhandled errors)
import { render, screen } from '@testing-library/react';

// ✅ New way (handles errors gracefully)
import { render, screen } from '@/test-utils';
```

### Available Functions

- `render` - Default render function with ErrorBoundaryProvider wrapper
- `renderWithoutErrorBoundary` - Raw React Testing Library render (for testing error boundaries themselves)
- All other React Testing Library exports are re-exported

### Error Boundary Provider Test

The error boundary provider test uses `renderWithoutErrorBoundary` to avoid wrapping the error boundary in itself:

```typescript
import { renderWithoutErrorBoundary as render, screen } from '@/test-utils';
```

## Migration Scripts

### PowerShell Script

```powershell
.\update-test-imports.ps1
```

### Node.js Script

```bash
node update-test-imports.js
```

Both scripts will:
1. Find all test files that import from `@testing-library/react`
2. Skip files already using `@/test-utils`
3. Skip the error boundary provider test
4. Update import statements to use `@/test-utils`

## Benefits

1. **Error Resilience**: Components that throw errors during tests are caught by the error boundary
2. **Consistent Testing**: All tests use the same provider setup
3. **Graceful Failures**: Instead of crashing tests, errors are handled gracefully
4. **Production-like Environment**: Tests run in an environment similar to production with error boundaries

## Architecture

```
Test Component
    ↓
ErrorBoundaryProvider (catches errors)
    ↓
Your Component (can throw errors safely)
```

The ErrorBoundaryProvider catches any errors thrown by components during testing and displays a fallback UI instead of crashing the test. 