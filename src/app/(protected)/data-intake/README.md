# Data Intake (`src/app/data-intake/`)

This directory contains the routes and potentially components related to the data intake feature.

**Authorization:** Access to this section requires the user to be authenticated. This is enforced by the `src/middleware.ts`.

*(Add more details about the specific functionality within this section as it's developed)*

# Data Intake Module

The Data Intake module provides functionality for importing and managing financial data in the VibeFC platform. This module allows users to upload CSV files containing time series data, preview the data before import, and manage how new data is integrated with existing data.

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

The module supports three types of variables:
- **ACTUAL**: Historical/actual financial data
- **BUDGET**: Budget/planned financial data
- **INPUT**: User input data for forecasting
- **UNKNOWN**: For backward compatibility or data migration scenarios

### Import Management

When importing data, users can:
- **Add as New**: Add imported variables as new entries
- **Update Existing**: Update existing variables with new time series data
- **Skip**: Ignore variables from the import

## User Interface

### Main Page

The main data intake page consists of:
- File upload area for selecting CSV files (with drag-and-drop support)
- Table view showing currently imported variables with their time series data, including inline editing for names, types, and values.
- Import button to initiate the CSV import process
- Delete functionality for individual variables

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

## Implementation Details

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

### Data Storage

Imported variables are primarily managed in the application state using Zustand:
- Variables are persisted in the browser\'s localStorage for immediate user feedback and offline access.
- Date objects are properly rehydrated when loading from storage.
- Each variable has a unique ID generated using `crypto.randomUUID()`.

### API Integration

- **Saving New Variables**: When variables are added via the import modal (action: \'add\'), they are sent to the backend via a `POST` request to `/api/data-intake/variables`. This allows for server-side storage and processing.
- **Updates/Deletions**: Currently, variable updates (type/name/value changes) and deletions performed directly in the table are only reflected in the local Zustand store and localStorage. API integration for these actions is pending.

## Component Structure

The Data Intake module is organized as follows:
- `page.tsx`: Client component that renders the main container
- `import-modal.tsx`: Modal for reviewing and confirming data imports
- `delete-confirmation-modal.tsx`: Modal for confirming variable deletion
- `_components/`: Directory containing private components used only within this module
  - `data-intake-container.tsx`: Main container component with the overall state management and layout
  - `api-hooks.ts`: Custom hooks for API operations and CSV processing
  - `data-status.tsx`: Component for displaying API operation status notifications
  - `state-display.tsx`: Components for handling loading, error, and empty states
  - `data-table.tsx`: Table component for displaying variables and their time series data
  - `upload-section.tsx`: Component for handling file uploads
  - `utils.ts`: Utility functions for date parsing, formatting, and validation
  - `table.module.css`: CSS module for table styling

## Usage Example

1. Prepare a CSV file with the following structure:
   ```
   Variable;Type;01.01.2023;01.02.2023;01.03.2023
   Revenue;ACTUAL;10000,50;12000,75;13500,25
   Expenses;ACTUAL;7500,00;8000,50;8200,75
   Forecast;BUDGET;11000,00;12500,00;14000,00
   ```

2. Upload the file using the file upload area

3. Review the variables in the import modal:
   - Choose to add new variables or update existing ones
   - Select matching variables for updates

4. Apply the changes to complete the import

5. View the imported data in the data table

## Error Handling

The module handles various error scenarios:
- Invalid CSV format detection
- Unsupported date formats
- Invalid variable types
- Number parsing errors
- Empty files or invalid data

## Related Components

- **Variable Store**: Manages the state of all variables (`/src/lib/store/variables.ts`)
- **Variables Page**: Displays an overview of all imported variables (`/src/app/variables/page.tsx`)

## Future Enhancements

Planned improvements to the Data Intake module:
- Support for more file formats (Excel, JSON)
- Bulk editing of variable properties
- Data validation rules
- Direct database integration (currently using localStorage)
- Advanced data visualization options
- Search and filtering capabilities for the data table 