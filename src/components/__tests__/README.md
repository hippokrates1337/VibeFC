# Component Tests

This directory contains tests for shared UI components, following the project's testing guidelines.

## Current Test Coverage

The tests currently cover:

1.  **Button Component (`button.test.tsx`)**
    *   Verifies correct rendering of button text.
    *   Checks for appropriate class application based on `variant` props (e.g., `destructive`).
    *   Checks for appropriate class application based on `size` props (e.g., `sm`).

## Testing Approach

These tests utilize:
- Jest as the test runner.
- React Testing Library for component rendering and interaction assertions.

The tests focus on ensuring components render correctly based on their props and are accessible. 