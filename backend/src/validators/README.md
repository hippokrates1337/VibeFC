# Validators Module (`backend/src/validators`)

## Overview
This module contains custom `class-validator` decorators for specific validation needs across the application.

## Structure

- **`date-range.validator.ts`**: Custom decorator for validating date ranges between two properties.

## Custom Validators

### ValidateDateRange
A custom validation decorator that ensures one date property is greater than or equal to another date property.

**Usage:**
```typescript
class DateRangeDto {
  startDate: string;
  
  @ValidateDateRange('startDate', {
    message: 'End date must be greater than or equal to start date'
  })
  endDate: string;
}
```

**Parameters:**
- `property`: The name of the property to compare against
- `validationOptions`: Optional validation options including custom error messages

**Validation Logic:**
- Converts both values to Date objects
- Returns `true` if the decorated property's date is greater than or equal to the compared property's date
- Returns `false` otherwise

## Purpose
These validators provide reusable validation logic that can be applied across multiple DTOs and modules, ensuring consistent date range validation throughout the application. 