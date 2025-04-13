# Lib Directory

This directory contains utility functions, helpers, and shared logic used throughout the application.

## Structure

- `/store`: State management using Zustand
- `/utils.ts`: Common utility functions
- `/__tests__`: Test files for lib modules

## Guidelines

1. Keep utility functions small and focused on a single task
2. Use TypeScript for all utility functions with proper type definitions
3. Avoid side effects in utility functions
4. Document complex utilities with JSDoc comments
5. Maintain test coverage for all utility functions

## Adding New Utilities

When adding new utilities:
1. Consider if it belongs in an existing file or needs a new one
2. Avoid duplicating functionality that might exist in libraries or elsewhere in the codebase
3. Write tests for your utilities in the `/__tests__` directory
4. Export utilities as named exports
5. Use descriptive function names that explain what the utility does 