# Integration Tests for Forecast Module

This directory contains both mock-based E2E tests (`app.e2e-spec.ts`) and real integration tests with Supabase (`forecast.e2e-spec.ts`) for the backend API.

## Mock-based E2E Tests

The `app.e2e-spec.ts` file contains tests that use mocked Supabase services. These tests verify the request-response cycle and basic API plumbing, but don't test actual database interactions.

## Real Integration Tests

The `forecast.e2e-spec.ts` file contains integration tests that interact with a real Supabase database. These tests provide significantly better coverage of:

1. Real database interactions and constraints
2. Input validation (DTO validation)
3. Error handling with real error cases (e.g., foreign key violations)
4. Authorization rules
5. Concurrent operations

### Running the Integration Tests

To run all E2E tests (including the integration tests):

```
npm run test:e2e
```

This will run both the mock-based `app.e2e-spec.ts` and the real integration tests in `forecast.e2e-spec.ts`.

To run just the forecast integration tests:

```
npm run test:e2e -- forecast.e2e-spec.ts
```

### Environment Setup

The integration tests require the following environment variables to be set:

```
SUPABASE_URL=https://rfjcfypsaixxenafuxky.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmamNmeXBzYWl4eGVuYWZ1eGt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4NjE0MTgsImV4cCI6MjA1OTQzNzQxOH0.cnobscjeKf-5RgaZQFBJ9GdzOh9fi9HotO9AyKQUupU
```

However, the tests are also set up to configure these environment variables automatically if they're not already set.

### Test Cleanup

The integration tests include cleanup logic that:

1. Removes all test data after each test run
2. Uses fixed test user and organization IDs to make cleanup easier
3. Tracks all created resources for proper cleanup even if tests fail

### Notes for Production

In a real production environment, you would:

1. Use a dedicated test database instead of your development database
2. Implement real JWT authentication tests rather than using a middleware mock
3. Consider using a database transaction for each test to automatically roll back changes

## The Value of Integration Tests

These integration tests significantly improve the test coverage of the application by testing:

1. Real database schema constraints and foreign key relationships
2. Actual SQL/Supabase client interactions
3. Concurrent operations and race conditions
4. Business logic with real data flow

By combining the mock-based E2E tests (which are faster and more isolated) with these real integration tests, you get comprehensive test coverage of your API's functionality. 