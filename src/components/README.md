# Components Directory

This directory contains all UI components used in the application.

## Structure

- `/ui`: Core UI components based on shadcn/ui (buttons, dialogs, etc.) (See `ui/README.md`)
- `/forecast`: Components specific to the forecast definition feature (See `forecast/README.md`)
- `/auth`: Components for user authentication (login, signup) (See `auth/README.md`)
- `/organization`: Components for organization management and member administration (See `organization/README.md`)
- `/__tests__`: Test files for components (See `__tests__/README.md`)

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

## Feature-Specific Components

### Forecast Components
The `forecast/` directory contains all components related to the graphical forecast definition feature. See `forecast/README.md` for detailed documentation.

### Authentication Components  
The `auth/` directory contains components for user authentication flows. See `auth/README.md` for detailed documentation.

### Organization Components
The `organization/` directory contains components for organization management and member administration. See `organization/README.md` for detailed documentation.

### UI Components
The `ui/` directory contains reusable UI components based on shadcn/ui, including the `use-toast` hook for global toast management. See `ui/README.md` for detailed documentation.

## Note on Feature-Specific Components

Some feature-specific components are co-located with their pages in the app directory:
- **Data Intake Components**: Located in `src/app/(protected)/data-intake/_components/` for better feature encapsulation
- **Variable Components**: Part of the data intake feature components 