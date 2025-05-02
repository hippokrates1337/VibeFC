# Data Intake Tests

This directory contains unit tests for the Data Intake section of the application. The tests were created to ensure that the core functionality works correctly, especially when integrating with the backend.

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
 PASS  src/app/data-intake/__tests__/page.test.tsx
  DataIntake Page
    ✓ displays loading state when isLoading is true (23 ms)
    ✓ displays error state when there is an error (5 ms)
    ✓ displays empty state when there are no variables (5 ms)
    ✓ displays data table when variables exist (7 ms)
    ✓ displays success notification when API operation succeeds (5 ms)
    ✓ displays error notification when API operation fails (5 ms)
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

## Tests Implemented

The following tests have been implemented for the Data Intake page component:

1. **Loading State Test**:
   - Verifies that a loading indicator is shown while data is being fetched

2. **Error State Test**:
   - Verifies that error messages are properly displayed when the API encounters issues

3. **Empty State Test**:
   - Ensures the empty state UI is correctly shown when no variables exist

4. **Successful Data Rendering Test**:
   - Tests that variables are correctly displayed in the data table

5. **API Success Notification Test**:
   - Verifies that success notifications appear after successful API operations

6. **API Error Notification Test**:
   - Ensures that error notifications display when API operations fail
