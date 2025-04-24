# Data Intake Testing Plan

This document outlines the missing unit tests for the Data Intake section of the application.

## Component Tests

### Page Component Tests - DONE
- Test initial loading state
- Test error state handling
- Test empty state rendering
- Test successful data rendering

### Data Table Component Tests - DONE
- Test proper rendering of variables and their time series data
- Test sorting functionality
- Test variable name editing
- Test variable value editing
- Test delete button triggering confirmation modal

### Import Modal Tests - DONE
- Test CSV import preview functionality
- Test handling of different variable actions (add/update/skip)
- Test confirmation of import

### Delete Confirmation Modal Tests - DONE
- Test modal rendering with correct variable name
- Test cancel functionality
- Test confirm functionality

## API Integration Tests

### Variable Fetching - DONE
- Test successful fetching of variables
- Test handling of empty response
- Test error handling

### Variable Creation - DONE
- Test successful creation of variables via CSV import
- Test validation of CSV data
- Test error handling during creation

### Variable Update
- Test successful update of variable name
- Test successful update of variable time series data
- Test error handling during update

### Variable Deletion
- Test successful deletion of a variable
- Test error handling during deletion

## Store Tests

### Variable Store Tests
- Test initialization
- Test setting variables
- Test adding variables
- Test clearing variables
- Test fetching variables (mocked API)
- Test persistence and rehydration

## Utility Function Tests

### CSV Processing Tests
- Test parsing of dates from different formats
- Test validation of variable types
- Test handling of numeric values in different formats (e.g., with dot or comma as decimal separator)

## End-to-End Tests

- Test the complete flow: from uploading a CSV to seeing data in the table
- Test editing and saving a variable
- Test deleting a variable and seeing it removed from the UI

## Testing Strategy

1. **Isolated Component Tests**: Use Jest and React Testing Library to test individual components in isolation with mocked dependencies.

2. **Integration Tests**: Test the integration between components and services, focusing on the interaction between different parts of the system.

3. **Mock API Responses**: Use MSW (Mock Service Worker) to intercept and mock API requests for consistent and deterministic testing.

4. **Snapshot Testing**: For UI components when appropriate, to detect unexpected UI changes.

5. **Accessibility Testing**: Include tests to ensure components are accessible.

## Implementation Plan

Test files should be structured in a `__tests__` directory adjacent to the files being tested, following the project's test structure standards. For component tests, focus on user interactions rather than implementation details.

Example folder structure:
```
src/app/data-intake/
├── __tests__/
│   ├── page.test.tsx
│   ├── import-modal.test.tsx
│   ├── delete-confirmation-modal.test.tsx
│   └── _components/
│       ├── data-table.test.tsx
│       ├── upload-section.test.tsx
│       └── utils.test.ts
└── [component files]
```

Priority should be given to testing the core business logic and user flows, particularly around data manipulation and API interactions. 