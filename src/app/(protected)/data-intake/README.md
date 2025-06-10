# Data Intake (`src/app/(protected)/data-intake/`)

This directory contains the Data Intake module for importing and managing financial data in the VibeFC platform.

**Authorization:** Access to this section requires user authentication. This is enforced by `src/middleware.ts`.

## Features

### CSV Import

- **Flexible File Format**: Import CSV files with either comma (,) or semicolon (;) delimiters
- **Column Requirements**:
  - `Variable` column: Contains the name of the financial variable
  - `Type` column: Specifies the type of the variable (ACTUAL, BUDGET, or INPUT)
  - Date columns: Multiple date columns containing values for different time periods

### Date Format Support

The module automatically detects and parses various date formats:
- ISO format: `yyyy-MM-dd`
- German format: `dd.MM.yyyy`
- US format: `MM/dd/yyyy`
- UK format: `dd/MM/yyyy`
- Alternative ISO format: `yyyy.MM.dd`
- Short formats: `MM.yyyy`, `MM/yyyy`, `yyyy-MM`

#### Date Normalization

The module normalizes dates to prevent duplicates:
- All dates are normalized to the first day of the month
- This ensures that different dates within the same month are treated as a single column in the data table
- Data is displayed by month (MM-yyyy) in the table view

### Number Format Support

Values in the CSV can be in either:
- German format: Using comma as decimal separator (e.g., `1.234,56`)
- English format: Using dot as decimal separator (e.g., `1,234.56`)

### Variable Types

The module supports four types of variables:
- **ACTUAL**: Historical/actual financial data
- **BUDGET**: Budget/planned financial data
- **INPUT**: User input data for forecasting
- **UNKNOWN**: For backward compatibility or data migration scenarios

### Import Management

When importing data, users can:
- **Add as New**: Add imported variables as new entries (creates new variables in backend database)
- **Update Existing**: Update existing variables with new time series data (updates existing variables in backend database via PUT API)
- **Skip**: Ignore variables from the import (no backend action taken)

All import actions maintain synchronization between the frontend Zustand store and the backend database.

## User Interface

### Main Page

The main data intake page consists of:
- File upload area for selecting CSV files (with drag-and-drop support)
- Card-based view displaying imported variables using `VariableCard` components
- Import button to initiate the CSV import process
- Delete functionality for individual variables (accessible via variable cards and details modal)

### Import Modal

The import modal allows users to:
- Preview variables being imported
- Choose an action for each variable (add, update, or skip)
- Select which existing variable to update when choosing the "update" action
- Apply the selected actions to complete the import

### Delete Confirmation Modal

The delete confirmation modal provides a safety check before removing variables:
- Displays the name of the variable to be deleted
- Requires explicit confirmation before deletion
- Prevents accidental data loss

### Variable Details Modal

The variable details modal allows users to:
- View and edit the variable's name
- View and edit the variable's type (ACTUAL, BUDGET, INPUT, UNKNOWN)
- View and edit individual time series data points (date and value)
- Save changes or cancel editing

## Implementation Details

### Data Storage and API Integration

- **Local State**: Zustand store (`@/lib/store/variables.ts`) manages application state with localStorage persistence
- **Backend Sync**: Fetches organization-specific variables from backend API when needed
- **CRUD Operations**: Full create, read, update, delete operations via Next.js API routes
- **Authentication**: All API calls use JWT token authentication
- **Organization Scoping**: All data is scoped to the selected organization

### File Processing

The CSV processing logic:
1. Detects the delimiter (comma or semicolon) automatically
2. Identifies variable name and type columns
3. Parses date columns and their corresponding values
4. Creates variable objects with time series data
5. Presents data in the import modal for user confirmation

### Date Handling

The date handling logic:
1. Parses dates in various formats during CSV import
2. Normalizes dates to the first day of each month to prevent duplicates
3. Groups time series data by month for display in the table
4. Sorts dates chronologically for consistent display

## Component Structure

The Data Intake module is organized as follows:

- **`page.tsx`**: Client component that renders the main container and variable cards
- **`import-modal.tsx`**: Modal for reviewing and confirming data imports
- **`delete-confirmation-modal.tsx`**: Modal for confirming variable deletion
- **`_components/`**: Directory containing private components used only within this module
  - `data-intake-container.tsx`: Main container component managing state and API interactions
  - `variable-card.tsx`: Displays a summary of a single variable in card format
  - `variable-details-modal.tsx`: Modal for viewing and editing variable details
  - `api-hooks.ts`: Custom hooks for API operations and CSV processing
  - `data-status.tsx`: Component for displaying API operation status notifications
  - `state-display.tsx`: Components for handling loading, error, and empty states
  - `upload-section.tsx`: Component for handling file uploads
  - `utils.ts`: Utility functions for date parsing, formatting, and validation

## Usage Example

1. Prepare a CSV file with the following structure:
   ```
   Variable;Type;01.01.2023;01.02.2023;01.03.2023
   Revenue;ACTUAL;10000,50;12000,75;13500,25
   Expenses;ACTUAL;7500,00;8000,50;8200,75
   Forecast;BUDGET;11000,00;12500,00;14000,00
   ```

2. Upload the file using the file upload area
3. Review the variables in the import modal
4. Choose to add new variables or update existing ones
5. Apply the changes to complete the import
6. View the imported data in the variable cards
7. Click on a variable card to view or edit its details

## Error Handling

The module handles various error scenarios:
- Invalid CSV format detection
- Unsupported date formats
- Invalid variable types
- Number parsing errors
- Empty files or invalid data

## Related Components

- **Variable Store**: Manages the state of all variables (`/src/lib/store/variables.ts`)
- **Organization Store**: Manages the currently selected organization (`/src/lib/store/organization.ts`)
- **API Layer**: Next.js API routes for backend communication (`/src/app/api/data-intake/`) 