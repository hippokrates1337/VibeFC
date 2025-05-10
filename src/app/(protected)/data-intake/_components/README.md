# Data Intake Private Components

This directory contains components that are specifically used by the Data Intake feature and are not meant to be reused across the application.

## Components

### `DataIntakeContainer` (`data-intake-container.tsx`)
Manages the overall state for the data intake feature, including data fetching, API interactions via custom hooks, and modal states. It provides data and handlers to its children (typically `page.tsx`) using a render prop pattern.

### `VariableCard` (`variable-card.tsx`)
Displays a summary of a single financial variable in a card format. It shows the variable's name, type, time series range, and number of data points. Provides actions to view details (opening `VariableDetailsModal`) or delete the variable.

### `VariableDetailsModal` (`variable-details-modal.tsx`)
A modal dialog for viewing and comprehensively editing the details of a variable. Allows users to modify the variable's name, type, and individual time-series data points.

### `UploadSection` (`upload-section.tsx`)
Handles the UI for uploading CSV files. It:
- Shows a file input button styled with Tailwind CSS
- Displays loading state during upload
- Shows errors if file processing fails
- Provides clear user feedback about supported formats
- Uses a drag-and-drop interface for better UX
- Implements responsive design for various screen sizes

### `StateDisplay` (`state-display.tsx`)
Provides components for rendering various UI states within the data intake feature, such as `LoadingState`, `ErrorState`, and `EmptyState`.

### `DataStatus` (`data-status.tsx`)
A component used to display status notifications for API operations, indicating success or failure of actions like saving or deleting data.

## Custom Hooks

These hooks encapsulate specific logic related to API interactions and data processing.

### `useVariableApi` (from `api-hooks.ts`)
This hook manages all backend API interactions for variables. It handles creating (importing), updating (name, type, time-series values), and deleting variables. It also manages API loading, success, and error states.

### `useCsvProcessor` (from `api-hooks.ts`)
Responsible for client-side CSV file processing. It parses the uploaded CSV file, validates its structure and content, and prepares the data for the import modal or for direct addition via the API.

## Utility Functions (`utils.ts`)

This file contains various helper functions used within the data intake components:

- **Date Utilities**:
  - `parseDate`: Parses various date string formats (e.g., ISO, `dd.MM.yyyy`, `MM/yyyy`) into JavaScript `Date` objects.
  - `formatDate`: Formats `Date` objects into a consistent `MM-yyyy` string for display.
- **Number Utilities**:
  - `formatNumber`: Formats numeric values using the English locale (e.g., `1,234.5`).
- **Validation Utilities**:
  - `isValidVariableType`: Validates if a string is one of the recognized variable types (ACTUAL, BUDGET, INPUT, UNKNOWN).
  - `validateHeaders`: Checks if the headers of a CSV file conform to the expected structure (Variable, Type, Date columns).

## Testing

Unit tests for `DataIntakeContainer` can be found in `../__tests__/data-intake-container.test.tsx`. Unit tests for other components like `VariableCard` and `VariableDetailsModal` are located within a nested `__tests__` directory inside `src/app/(protected)/data-intake/_components/`.
The tests utilize Jest and React Testing Library.

### Mocking Strategy
- **Hooks:** Individual hooks (e.g., `useVariableStore` selectors, `useAuth`, custom hooks like `useVariableApi`, `useCsvProcessor`) are mocked using `jest.mock`. Type casting (`as unknown as jest.Mock`) is applied to the imported hook variables *after* the `jest.mock` call to satisfy TypeScript when dealing with complex hook signatures (like those from Zustand).
- **Components:** Child components (`UploadSection`, etc.) and UI library components (`Alert`) are mocked to isolate the container's logic.
- **State Scenarios:** Different states (loading, error, empty, data present) are simulated by overriding the default mock implementations of the relevant hooks within specific `test` blocks.

## Usage

These components are private to the Data Intake feature and should only be imported within the `data-intake` directory. They work alongside the `ImportModal` and `DeleteConfirmationModal` components (located in the parent `data-intake` directory) to provide a complete data management workflow.

For reusable components used across the application, see the main `/src/components` directory. 