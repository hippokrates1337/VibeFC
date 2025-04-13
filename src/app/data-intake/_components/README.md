# Data Intake Private Components

This directory contains components that are specifically used by the Data Intake feature and are not meant to be reused across the application.

## Components

### DataTable

The `DataTable` component displays uploaded variables in a table format with the following features:
- Fixed column headers for variable name and type
- Horizontal scrolling for time-series data
- Delete functionality for individual variables
- Properly formatted numbers in German locale
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

### UploadSection

The `UploadSection` component handles the UI for uploading CSV files. It:
- Shows a file input button styled with Tailwind CSS
- Displays loading state during upload
- Shows errors if file processing fails
- Provides clear user feedback about supported formats

## Utility Functions

This directory also includes utility functions in `utils.ts`:

### Date Utilities
- `parseDate`: Parses various date formats into Date objects
- `formatDate`: Formats Date objects into MM-yyyy strings for display

### Number Utilities
- `formatNumber`: Formats numeric values using German locale (comma as decimal separator)

### Validation Utilities
- `isValidVariableType`: Validates that a string is a valid variable type
- `validateHeaders`: Validates CSV headers for expected format

## Usage

These components are private to the Data Intake feature and should only be imported within the `data-intake` directory. They work alongside the `ImportModal` and `DeleteConfirmationModal` components to provide a complete data management workflow.

For reusable components used across the application, see the main `/src/components` directory. 