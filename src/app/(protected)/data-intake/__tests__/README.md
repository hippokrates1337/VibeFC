# Data Intake Tests

This directory contains unit and integration tests for the Data Intake module.

## Running Tests

```bash
# Run all tests
npm test

# Run tests for Data Intake module only
npm test -- src/app/data-intake

# Run tests in watch mode
npm run test:watch -- src/app/data-intake

# Run tests with coverage
npm run test:coverage -- src/app/data-intake
```

## Test Files

- **`data-intake-container.test.tsx`**: Tests the main container component that manages state, data fetching, and API interactions
- **`page.test.tsx`**: Tests the main Data Intake page component rendering
- **`import-modal.test.tsx`**: Tests the CSV import modal functionality and variable preview
- **`delete-confirmation-modal.test.tsx`**: Tests the variable deletion confirmation modal
- **`state-display.test.tsx`**: Tests loading, error, and empty state components
- **`api-hooks.test.ts`**: Tests custom hooks for API operations and CSV processing

## Testing Strategy

- **Component Testing**: React Testing Library for component behavior and user interactions
- **State Management**: Zustand store mocking for different application states
- **API Integration**: Mocked API calls to test data flow without backend dependency
- **Error Handling**: Various error scenarios and edge cases
- **User Workflows**: End-to-end user interactions within the module
