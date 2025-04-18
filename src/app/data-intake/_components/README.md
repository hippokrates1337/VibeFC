# Data Intake Private Components

This directory contains components that are specifically used by the Data Intake feature and are not meant to be reused across the application.

## Components

### DataTable

The `DataTable` component displays uploaded variables in a table format with the following features:
- Fixed column headers for variable name and type
- Horizontal scrolling for time-series data
- Delete functionality for individual variables
- Properly formatted numbers in English locale (dot as decimal separator)
- Zebra striping for better readability

#### Date Handling
- Works with normalized dates (first day of each month) to prevent duplicate columns
- Displays dates in MM-yyyy format for consistency
- Matches time series entries with displayed dates using timestamp comparison
- Handles empty values gracefully by displaying an empty cell

#### UI Features
- Sticky first and second columns for better navigation during horizontal scrolling
- Dynamic column width adjustment based on content
- Responsive design with scrollable container
- Custom CSS styling via table.module.css

### UploadSection

The `UploadSection` component handles the UI for uploading CSV files. It:
- Shows a file input button styled with Tailwind CSS
- Displays loading state during upload
- Shows errors if file processing fails
- Provides clear user feedback about supported formats
- Uses a drag-and-drop interface for better UX

## Utility Functions

This directory also includes utility functions in `utils.ts`:

### Date Utilities
- `parseDate`: Parses various date formats into Date objects
- `formatDate`: Formats Date objects into MM-yyyy strings for display

### Number Utilities
- `formatNumber`: Formats numeric values using English locale (dot as decimal separator)

### Validation Utilities
- `isValidVariableType`: Validates that a string is a valid variable type (ACTUAL, BUDGET, INPUT, UNKNOWN)
- `validateHeaders`: Validates CSV headers for expected format

## CSS Modules

### table.module.css
- Contains custom CSS classes for the DataTable component
- Implements sticky columns using CSS position properties
- Provides zebra striping with alternating row colors
- Handles horizontal scrolling without losing header and first columns
- Implements responsive design for various screen sizes

## Usage

These components are private to the Data Intake feature and should only be imported within the `data-intake` directory. They work alongside the `ImportModal` and `DeleteConfirmationModal` components to provide a complete data management workflow.

For reusable components used across the application, see the main `/src/components` directory. 