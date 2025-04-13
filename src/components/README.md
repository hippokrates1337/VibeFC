# Components Directory

This directory contains all UI components used in the application.

## Structure

- `/ui`: Core UI components based on shadcn/ui (buttons, dialogs, etc.)
- `/data-intake`: Components specific to the data intake feature
- `/variables`: Components specific to variables management
- `/forecasts`: Components specific to forecasts management
- `/__tests__`: Test files for components

## Component Guidelines

1. Use PascalCase for component file names
2. Each component should have a clear, single responsibility
3. Prefer Server Components by default unless you need client-side interactivity
4. Mark Client Components with `'use client'` directive at the top
5. Use Tailwind CSS for styling
6. Follow accessibility best practices (semantic HTML, ARIA attributes, keyboard navigation)
7. Aim for 80%+ test coverage

## Adding New Components

When adding new components:
1. Determine if it belongs in `/ui` or a feature-specific directory
2. Use existing UI components when possible
3. Follow naming and structure conventions
4. Write tests for your component in the `/__tests__` directory 