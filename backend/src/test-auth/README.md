# Test Auth Module (`backend/src/test-auth`)

## Overview
This module provides a test endpoint for inspecting authenticated user details and headers, useful for debugging authentication setups during development and testing.

## Structure

- **`test-auth.module.ts`**: Defines the NestJS module for the test authentication endpoint.
- **`test-auth.controller.ts`**: Implements the test endpoint logic.

## API Endpoints

### Test Authentication
- **Endpoint**: `GET /test-auth`
- **Auth**: Not explicitly protected (depends on global guards)
- **Purpose**: Returns the current user object and authorization header for debugging
- **Response**: 
  ```json
  {
    "user": {
      // User object populated by authentication middleware/guards
    },
    "authHeader": "Bearer <token>"
  }
  ```

## Usage
This endpoint is primarily used for:
- Debugging JWT authentication flows
- Verifying that authentication guards are working correctly
- Inspecting the user object structure populated by authentication middleware
- Testing authorization header parsing

## Security Note
This endpoint exposes authentication details and should only be used in development/testing environments. Consider removing or securing this endpoint in production deployments. 