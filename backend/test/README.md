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

The integration tests require a `.env` file in the `backend` directory with the following environment variables set:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key # For admin operations during test setup/teardown
SUPABASE_ANON_KEY=your_supabase_anon_key # For test user authentication
```
The Jest configuration (`jest-e2e.json`) uses `dotenv/config` to automatically load these variables.

### Test Setup and Cleanup

The `forecast.e2e-spec.ts` integration tests are designed to be self-contained:

1.  **Dynamic Setup**: Before the tests run, the suite dynamically creates:
    *   Two test users (e.g., "Alice" and "Charlie") with unique email addresses for each test run.
    *   A test organization (e.g., "OrgA").
    *   Alice is automatically made an admin member of OrgA.
    These entities are created using the Supabase admin client (via `SUPABASE_SERVICE_ROLE_KEY`).
2.  **RLS Testing**: Test users (Alice and Charlie) then authenticate to obtain JWTs, which are used for API requests to test Row Level Security policies against the dynamically created resources.
3.  **Comprehensive Cleanup**: After all tests in the suite complete, an `afterAll` hook ensures that:
    *   All forecasts created during the tests are deleted.
    *   The test organization's memberships are deleted.
    *   The test organization itself is deleted.
    *   The test users (Alice and Charlie) are deleted.
    This cleanup uses the Supabase admin client to ensure all test-generated data is removed, making the tests independent of pre-existing database state (beyond the schema itself).

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