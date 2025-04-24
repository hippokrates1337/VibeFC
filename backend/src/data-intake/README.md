# Data Intake Module

## Overview
The Data Intake Module is responsible for managing time-series variables in the application. It provides a complete set of CRUD operations for variable entities, allowing users to create, read, update, and delete variables with time-series data points.

## Key Features
- Create multiple variables in a single request
- Retrieve variables by user ID
- Update existing variables (name, type, or values)
- Delete variables by ID
- Normalize and validate time-series data

## Architecture

### Module Structure
- `data-intake.module.ts` - NestJS module definition
- `data-intake.controller.ts` - REST API endpoints
- `data-intake.service.ts` - Business logic implementation
- `data-intake.d.ts` - TypeScript type declarations
- `dto/` - Data Transfer Objects
  - `variable.dto.ts` - Core variable definitions
  - `add-variables.dto.ts` - DTO for creating variables
  - `update-variables.dto.ts` - DTO for updating variables
  - `delete-variables.dto.ts` - DTO for deleting variables

### Dependencies
- `SupabaseModule` - Used for database operations

## API Endpoints

### Create - Add Variables
- **Endpoint**: `POST /data-intake/variables`
- **Payload**: `AddVariablesDto` containing an array of variables to add
- **Response**: Added variables with count and success message

### Read - Get Variables by User
- **Endpoint**: `GET /data-intake/variables/:userId`
- **Parameters**: `userId` in path
- **Response**: List of variables belonging to the specified user

### Update - Modify Variables
- **Endpoint**: `PUT /data-intake/variables`
- **Payload**: `UpdateVariablesDto` containing an array of variables to update
- **Response**: Updated variables with count and success message

### Delete - Remove Variables
- **Endpoint**: `DELETE /data-intake/variables`
- **Payload**: `DeleteVariablesDto` containing array of variable IDs to delete
- **Response**: Delete confirmation with count

## Data Models

### Variable Types
```typescript
enum VariableType {
  ACTUAL = 'ACTUAL',
  BUDGET = 'BUDGET',
  INPUT = 'INPUT',
  UNKNOWN = 'UNKNOWN'
}
```

### Time Series Point
```typescript
class TimeSeriesPoint {
  date: string;
  value: number | null;
}
```

### Variable Entity
```typescript
interface VariableEntity {
  id: string;
  name: string;
  type: VariableType;
  values: TimeSeriesPoint[];
  user_id: string;
  created_at: string;
  updated_at: string;
}
```

## Error Handling
- The module implements comprehensive error handling using NestJS `HttpException`
- Each endpoint has try/catch blocks for robust error management
- Errors are logged using NestJS Logger service
- API responses include appropriate HTTP status codes and error messages

## Data Validation
- Input validation using class-validator decorators
- Time-series data normalization
- Type checking for variable types

## Implementation Details
- Variables are stored in Supabase using the `variables` table
- Each variable contains an array of time-series data points
- Time-series data is validated and normalized before storage
- The module supports client-generated UUIDs for variable entities 