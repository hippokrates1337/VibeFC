# Data Intake Private Components

This directory contains components that are specifically used by the Data Intake feature and are not meant to be reused across the application.

## Components

### `DataIntakeContainer` (`data-intake-container.tsx`)
Manages the overall state for the data intake feature, including data fetching, API interactions via custom hooks, and modal states. It provides data and handlers to its children (typically `page.tsx`) using a render prop pattern.

### `VariableListRow` (`variable-list-row.tsx`)
Displays one financial variable as a **compact row** (not a large card): name, type, time-series range, and data-point count on a secondary line; a delete control (clicks do not open the modal). Clicking the row opens `VariableDetailsModal`. Uses `data-testid="variable-item"` for tests and E2E.

### `variable-categories.ts`
Pure helpers for the main page layout: `VARIABLE_CATEGORY_ORDER` (Actual → Budget → Input → Other), `getVariableCategoryLabel()` for `<h2>` section titles, and `groupVariablesByType()` which buckets variables by `Variable['type']` and sorts by name within each bucket.

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
This hook manages all backend API interactions for variables. It handles:

- **Creating (importing)**: Sends new variables to backend via `POST /api/data-intake/variables` → backend
- **Updating via import**: When users select "update existing" during CSV import, sends variable updates to backend via `PUT /api/data-intake/variables` → backend
- **Updating individual variables**: Direct variable editing through the details modal via `PUT /api/data-intake/variables` → backend
- **Deleting**: Removes variables via `DELETE /api/data-intake/variables` → backend

**Architecture**: The hook calls Next.js API routes (not backend directly) to avoid CORS issues and ensure proper authentication handling. All requests flow through the API proxy layer.

The hook ensures both frontend Zustand store and backend database remain synchronized for all operations. It also manages API loading, success, and error states.

### `useCsvProcessor` (from `api-hooks.ts`)
Responsible for client-side CSV file processing. It parses the uploaded CSV file, validates its structure and content, and prepares the data for the import modal or for direct addition via the API.

## CSV import (`csv-import.ts`)

`parseVariablesCsv(text, options)` reads a variables CSV (columns `Variable`, `Type`, then one per month) into
`{month: 'YYYY-MM', value}` points without any `Date` objects. Quoted cells, `,`/`;`/tab delimiters and many month
header formats are supported (`2026-01`, `31.01.2026`, `01/2026`, `Jan 2026`, `März 2026`, ...). Each file uses one
number format (`1,234.56` or `1.234,56`) and one date order for slash dates; both are detected from the whole file,
and `ambiguous` tells the import dialog to ask. Cells that don't fit are reported as errors, never guessed.
`month-values.ts` holds the display and input helpers (month labels, locale-aware number input).

## Testing

Unit tests for `DataIntakeContainer` live in `../__tests__/data-intake-container.test.tsx`. Component and helper tests in this folder include `variable-list-row.test.tsx`, `variable-categories.test.ts`, and `variable-details-modal.test.tsx` under `__tests__/`.
The tests utilize Jest and React Testing Library.

### Mocking Strategy
- **Hooks:** Individual hooks (e.g., `useVariableStore` selectors, `useAuth`, custom hooks like `useVariableApi`, `useCsvProcessor`) are mocked using `jest.mock`. Type casting (`as unknown as jest.Mock`) is applied to the imported hook variables *after* the `jest.mock` call to satisfy TypeScript when dealing with complex hook signatures (like those from Zustand).
- **Components:** Child components (`UploadSection`, etc.) and UI library components (`Alert`) are mocked to isolate the container's logic.
- **State Scenarios:** Different states (loading, error, empty, data present) are simulated by overriding the default mock implementations of the relevant hooks within specific `test` blocks.

## Usage

These components are private to the Data Intake feature and should only be imported within the `data-intake` directory. They work alongside the `ImportModal` and `DeleteConfirmationModal` components (located in the parent `data-intake` directory) to provide a complete data management workflow.

For reusable components used across the application, see the main `/src/components` directory. 