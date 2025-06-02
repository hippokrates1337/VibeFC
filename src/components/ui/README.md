# UI Components (`src/components/ui/`)

This directory contains reusable UI components based on shadcn/ui, providing a consistent design system across the application.

## Overview

These components are built using:
- **Radix UI**: Unstyled, accessible components as the foundation
- **Tailwind CSS**: Utility-first CSS framework for styling
- **shadcn/ui**: Component library providing pre-styled, customizable components
- **TypeScript**: Full type safety and IntelliSense support

## Available Components

### Form Controls
- **`button.tsx`**: Versatile button component with multiple variants and sizes
- **`input.tsx`**: Text input component with consistent styling
- **`select.tsx`**: Dropdown select component with search and multi-select capabilities
- **`date-picker.tsx`**: Date selection component with calendar integration
- **`calendar.tsx`**: Calendar component for date selection

### Layout & Structure
- **`card.tsx`**: Container component for grouping related content
- **`sheet.tsx`**: Slide-out panel component for forms and additional content
- **`scroll-area.tsx`**: Custom scrollable area with styled scrollbars
- **`table.tsx`**: Data table components with sorting and styling

### Feedback & Interaction
- **`dialog.tsx`**: Modal dialog component for important interactions
- **`alert-dialog.tsx`**: Confirmation dialog for destructive actions
- **`alert.tsx`**: Alert component for displaying important messages
- **`popover.tsx`**: Floating content component for tooltips and menus
- **`toast.tsx`**: Toast notification component for user feedback
- **`toaster.tsx`**: Toast container and management
- **`use-toast.ts`**: Custom hook for managing toast notifications globally

## Usage

Import components directly from the ui directory:

```typescript
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
```

### Toast Hook Usage

The `use-toast` hook provides global toast notification management:

```typescript
import { useToast } from '@/components/ui/use-toast';

function MyComponent() {
  const { toast } = useToast();
  
  const handleSuccess = () => {
    toast({
      title: "Success!",
      description: "Your action was completed successfully.",
    });
  };
  
  const handleError = () => {
    toast({
      title: "Error",
      description: "Something went wrong.",
      variant: "destructive",
    });
  };
  
  return (
    <div>
      <Button onClick={handleSuccess}>Success Toast</Button>
      <Button onClick={handleError} variant="destructive">Error Toast</Button>
    </div>
  );
}
```

**Toast Features:**
- Global state management with reducer pattern
- Support for multiple toast variants (default, destructive)
- Automatic dismissal with configurable timeout
- Toast queuing and limiting (max 5 toasts)
- Programmatic control (add, update, dismiss, remove)

## Customization

Components can be customized through:
- **Variant props**: Different visual styles (e.g., `variant="destructive"`)
- **Size props**: Different component sizes (e.g., `size="sm"`)
- **Tailwind classes**: Additional styling via `className` prop
- **Theme configuration**: Global styling through `tailwind.config.ts`

## Accessibility

All components follow accessibility best practices:
- Semantic HTML elements
- ARIA attributes and roles
- Keyboard navigation support
- Screen reader compatibility
- Focus management

## Adding New Components

When adding new UI components:
1. Follow the shadcn/ui installation process
2. Maintain consistent naming conventions
3. Include proper TypeScript interfaces
4. Add accessibility features
5. Document component props and usage 