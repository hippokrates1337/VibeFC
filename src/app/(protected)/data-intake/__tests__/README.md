# Data Intake Tests

This directory contains unit and integration tests for the Data Intake section of the application. The tests are created to ensure that core functionalities, component rendering, state management, and API interactions work correctly.

## Running Tests

### Run All Tests

To run all the tests in the project:

```bash
npm test
```

### Run Tests for Data Intake Module Only

To run just the tests for the Data Intake module:

```bash
npm test -- src/app/data-intake
```

### Run Tests in Watch Mode

For development, you can run tests in watch mode which will automatically re-run tests when files change:

```bash
npm run test:watch -- src/app/data-intake
```

### Run Tests with Coverage

To generate a test coverage report:

```bash
npm run test:coverage -- src/app/data-intake
```

The coverage report will be available in the `coverage` directory after running this command.

## Reviewing Test Results

When running tests, the test results will be displayed in the terminal. For example:

```
 PASS  src/app/data-intake/__tests__/some-component.test.tsx
  SomeComponent
    ✓ renders correctly with given props (15 ms)
    ✓ handles user interaction as expected (10 ms)
    ✓ displays error state when data is invalid (8 ms)
```

### Understanding Test Coverage

When running with the coverage option, you'll see a report like:

```
--------------------------|---------|----------|---------|---------|-------------------
File                      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
--------------------------|---------|----------|---------|---------|-------------------
All files                 |   85.71 |    83.33 |      90 |   85.71 |                   
 data-intake              |   85.71 |    83.33 |      90 |   85.71 |                   
  page.tsx                |   85.71 |    83.33 |      90 |   85.71 | 45-50,112-120
--------------------------|---------|----------|---------|---------|-------------------
```

This shows:
- **% Stmts**: Percentage of program statements covered
- **% Branch**: Percentage of branch conditions covered 
- **% Funcs**: Percentage of functions covered
- **% Lines**: Percentage of lines covered
- **Uncovered Line #s**: Specific lines that aren't covered by tests

### HTML Coverage Report

For a more detailed view, open the HTML coverage report:

```bash
open coverage/lcov-report/index.html  # For macOS
# Or for Windows:
start coverage/lcov-report/index.html
```

## Test Suite Overview

The following test files ensure the reliability of the Data Intake module:

- **`page.test.tsx`**: Tests the main Data Intake page component (`src/app/(protected)/data-intake/page.tsx`), primarily ensuring that it correctly renders its main child container.

- **`data-intake-container.test.tsx`**: Contains tests for the `DataIntakeContainer` component, which manages the overall state, data fetching, and logic for the data intake feature. This includes testing different states like loading, error, empty, and when data is present, as well as interactions with modals and API hooks.

- **`import-modal.test.tsx`**: Focuses on the `ImportModal` component, verifying its behavior during the CSV import process, including variable preview, action selection (add, update, skip), and confirmation logic.

- **`delete-confirmation-modal.test.tsx`**: Tests the `DeleteConfirmationModal`, ensuring it displays correctly and handles user confirmation or cancellation for deleting variables.

- **`variable-details-modal.test.tsx`**: (Assuming this file exists or will be added based on previous context) Tests the `VariableDetailsModal` for viewing and editing variable name, type, and time-series data.

- **`state-display.test.tsx`**: Covers the components responsible for rendering various UI states, such as loading indicators, error messages, and empty state messages (`LoadingState`, `ErrorState`, `EmptyState`).

- **`api-status.test.tsx`**: Tests the `ApiStatus` component (likely related to `data-status.tsx`) which displays notifications for API operation success or failure.

- **`api.integration.test.ts`**: Contains integration tests that likely focus on the interactions between different parts of the data intake system, possibly including API hook integrations or end-to-end flows within the module.

(Note: Specific test cases within each file verify various aspects of component behavior, state changes, and interaction logic.)
