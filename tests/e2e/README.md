# E2E Test Setup Guide

## Overview
This directory contains End-to-End (E2E) tests for the VibeFC application using Playwright. These tests require proper environment setup and test user configuration.

## Prerequisites

1. **Supabase Project**: You need a working Supabase project with authentication enabled
2. **Test User**: A test user must exist in your Supabase Auth table
3. **Environment Variables**: Proper configuration of Supabase credentials

## Environment Setup

### Required Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anonymous-key-here

# Test User Credentials (Required for E2E tests)
TEST_USER_EMAIL=testuser@example.com
TEST_USER_PASSWORD=your-secure-test-password

# Optional: Service Role Key (for automatic test user creation)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Optional: Backend URL (if using custom backend)
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### How to Get Supabase Credentials

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings** > **API**
4. Copy the following:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API Keys** > **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Project API Keys** > **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (optional)

## Test User Setup

### Option 1: Manual User Creation (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** > **Users**
3. Click **"Add user"**
4. Create a user with:
   - **Email**: The value you set in `TEST_USER_EMAIL`
   - **Password**: The value you set in `TEST_USER_PASSWORD`
   - **Auto Confirm User**: ✅ (checked)
5. Make sure the user status is "Confirmed"

### Option 2: Automatic User Creation (Advanced)

If you provide the `SUPABASE_SERVICE_ROLE_KEY`, the tests will attempt to create the test user automatically. This requires:

1. Service role key with admin privileges
2. RLS policies that allow service role access
3. Proper error handling in case user already exists

## Running the Tests

### Basic Test Execution

```bash
# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test data-intake.spec.ts

# Run tests in headed mode (with browser visible)
npx playwright test --headed

# Run tests with debug output
npx playwright test --debug
```

### Test-Specific Environment Variables

You can also override environment variables for specific test runs:

```bash
# Windows (PowerShell)
$env:TEST_USER_EMAIL="custom@test.com"; $env:TEST_USER_PASSWORD="custompass"; npx playwright test

# Windows (Command Prompt)
set TEST_USER_EMAIL=custom@test.com && set TEST_USER_PASSWORD=custompass && npx playwright test

# Linux/Mac
TEST_USER_EMAIL=custom@test.com TEST_USER_PASSWORD=custompass npx playwright test
```

## Troubleshooting

### Common Issues and Solutions

#### 1. "Authentication failed: Test user credentials are invalid"

**Cause**: The test user doesn't exist or has wrong password
**Solution**: 
- Verify the user exists in Supabase Auth > Users
- Check the email and password match your environment variables
- Ensure the user status is "Confirmed"

#### 2. "Missing Supabase environment variables"

**Cause**: `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` not set
**Solution**: 
- Create/update your `.env.local` file
- Verify the Supabase URL and anon key are correct
- Restart your development server after adding environment variables

#### 3. "Authentication timeout: Still on login page"

**Cause**: Authentication process is taking too long or failing silently
**Solution**:
- Check browser console for JavaScript errors
- Verify Supabase service is accessible
- Check if your Supabase project is paused/inactive
- Increase test timeout if needed

#### 4. "Could not retrieve actual user ID after login"

**Cause**: Authentication succeeded but user session not properly stored
**Solution**:
- Check if localStorage is working in the test browser
- Verify auth provider is properly configured
- Check for JavaScript errors in the application

### Debug Mode

Run tests with additional debugging:

```bash
# Enable verbose logging
DEBUG=pw:api npx playwright test

# Generate test report
npx playwright test --reporter=html

# Record test execution
npx playwright test --trace on
```

### Screenshots and Artifacts

Failed tests automatically generate screenshots in the following locations:
- `debug-invalid-credentials.png` - When login credentials are wrong
- `debug-login-error.png` - When login encounters an error
- `debug-stuck-on-login.png` - When login process hangs
- `debug-auth-timeout.png` - When authentication times out

## Test Architecture

### Test Structure

The E2E tests use the following pattern:

1. **Environment Validation**: Check required variables and credentials
2. **Test User Setup**: Ensure test user exists or create it
3. **Authentication Flow**: Login with test credentials
4. **Data Mocking**: Mock API responses for consistent testing
5. **Feature Testing**: Test actual application functionality
6. **Cleanup**: Clear test data and sign out

### Mocking Strategy

Tests mock external API calls to ensure:
- Consistent test data across runs
- Independence from backend service availability
- Faster test execution
- Predictable test outcomes

Mocked endpoints include:
- Supabase organization queries
- Backend variable API calls
- Forecast data endpoints

## Best Practices

1. **Environment Isolation**: Use dedicated test users and organizations
2. **Data Cleanup**: Tests should not leave persistent data
3. **Credential Security**: Never commit real credentials to version control
4. **Test Independence**: Each test should work in isolation
5. **Error Handling**: Provide clear error messages for test failures

## Contributing

When adding new E2E tests:

1. Follow the existing test structure and patterns
2. Add proper error handling and debugging information
3. Mock external dependencies consistently
4. Update this documentation if adding new setup requirements
5. Test your changes in a clean environment

## Support

If you encounter issues not covered in this guide:

1. Check the test output for specific error messages
2. Review the generated screenshots for visual debugging
3. Verify your environment setup matches the requirements
4. Check the Playwright documentation for advanced debugging techniques 