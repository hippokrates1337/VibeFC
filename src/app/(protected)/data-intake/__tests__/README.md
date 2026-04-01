# Data Intake Tests

This directory contains unit and integration tests for the Data Intake module.

## Running Tests

```bash
# Run all tests
npm test

# Run tests for the Data Intake feature (path includes the route group)
npm test -- "src/app/(protected)/data-intake"

# Run tests in watch mode
npm run test:watch -- "src/app/(protected)/data-intake"

# Run tests with coverage
npm run test:coverage -- "src/app/(protected)/data-intake"
```

## Test Files

- **`data-intake-container.test.tsx`**: Main container—state, data fetching, API interactions, render prop
- **`page.test.tsx`**: Data Intake page renders the container
- **`import-modal.test.tsx`**: CSV import modal and variable preview
- **`delete-confirmation-modal.test.tsx`**: Deletion confirmation modal
- **`state-display.test.tsx`**: Loading, error, and empty state components
- **`api-status.test.tsx`**: API status notifications component
- **`api.integration.test.ts`**: Integration-style tests for variable API flows

Nested under `_components/__tests__/`:

- **`variable-list-row.test.tsx`**: Compact row—metadata, row click opens details, delete button
- **`variable-categories.test.ts`**: `groupVariablesByType`, labels, category order
- **`variable-details-modal.test.tsx`**: Details modal behavior

## Testing Strategy

- **Component Testing**: React Testing Library for behavior and user interactions
- **State Management**: Zustand store mocking for different application states
- **API Integration**: Mocked API calls where needed
- **Error Handling**: Invalid CSV, dates, types, and empty data
- **E2E**: See `tests/e2e/data-intake.spec.ts` (uses `data-testid="data-table"` and `data-testid="variable-item"`)
