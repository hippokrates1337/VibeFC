# Providers Directory

This directory contains React context providers that manage global application state and functionality. These providers wrap the application to provide authentication, theming, and modal management capabilities.

## Structure

- `auth-provider.tsx` - Authentication and session management provider
- `theme-provider.tsx` - Theme management provider using next-themes
- `modal-provider.tsx` - Modal rendering provider with portal support
- `error-boundary-provider.tsx` - Error boundary for graceful error handling
- `__tests__/` - Test files for provider components

## Providers Overview

### Authentication Provider (`auth-provider.tsx`)

The `AuthProvider` is the core authentication provider that manages user sessions, authentication state, and coordinates data fetching across the application.

#### Features

- **Session Management**: Handles Supabase authentication sessions and state changes
- **Cookie Management**: Stores authentication tokens in HTTP-only cookies
- **Data Coordination**: Orchestrates data fetching for organizations, variables, and forecasts
- **Unsaved Changes Protection**: Preserves unsaved forecast data during session changes
- **Automatic Data Clearing**: Clears application data on sign out or session expiry

#### Context Interface

```typescript
interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signUp: (email: string, password: string) => Promise<{ error: any | null; confirmationSent?: boolean }>;
  signOut: () => Promise<void>;
}
```

#### Usage

```typescript
import { AuthProvider, useAuth } from '@/providers/auth-provider';

// Wrap your app
function App() {
  return (
    <AuthProvider>
      <YourAppContent />
    </AuthProvider>
  );
}

// Use in components
function MyComponent() {
  const { user, session, isLoading, signIn, signUp, signOut } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      {user ? (
        <button onClick={signOut}>Sign Out</button>
      ) : (
        <button onClick={() => signIn(email, password)}>Sign In</button>
      )}
    </div>
  );
}
```

#### Key Behaviors

- **Smart Data Fetching**: Only fetches data when necessary, preserving unsaved changes
- **Organization Switching**: Automatically loads forecasts when switching organizations
- **Session Persistence**: Maintains authentication state across browser sessions
- **Error Handling**: Comprehensive error handling for authentication failures
- **Store Integration**: Coordinates with Zustand stores for organization, variables, and forecasts

### Theme Provider (`theme-provider.tsx`)

A lightweight wrapper around `next-themes` that provides theme management capabilities.

#### Features

- **Theme Switching**: Support for light, dark, and system themes
- **SSR Safe**: Prevents hydration mismatches with theme switching
- **Customizable**: Configurable theme attributes and default themes

#### Props

```typescript
interface ThemeProviderProps {
  children: React.ReactNode;
  attribute?: "class" | "data-theme";
  defaultTheme?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}
```

#### Usage

```typescript
import { ThemeProvider } from '@/providers/theme-provider';

function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <YourAppContent />
    </ThemeProvider>
  );
}
```

### Modal Provider (`modal-provider.tsx`)

Provides modal rendering capabilities for the application.

#### Features

- **Modal Portal**: Creates a portal root for modal rendering
- **Z-Index Management**: Ensures modals render above other content
- **Pointer Events**: Manages pointer events for modal interactions
- **Clean Architecture**: Focused solely on modal functionality without theme conflicts

#### Structure

- **Relative Container**: Wraps content in a relative positioned container
- **Modal Root**: Creates a fixed portal container for modals at `#modal-root`
- **Z-Index**: Uses `z-[100]` to ensure modals appear above other content
- **Pointer Events**: Uses `pointer-events-none` to allow interaction with underlying content when no modal is active

#### Usage

```typescript
import { ModalProvider } from '@/providers/modal-provider';

function App() {
  return (
    <ModalProvider>
      <YourAppContent />
    </ModalProvider>
  );
}

// Using the modal root in components
import { createPortal } from 'react-dom';

function MyModal({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) {
  if (!isOpen) return null;
  
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;
  
  return createPortal(
    <div className="fixed inset-0 z-50 pointer-events-auto">
      <div className="fixed inset-0 bg-black/50" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
          {children}
        </div>
      </div>
    </div>,
    modalRoot
  );
}
```

### Error Boundary Provider (`error-boundary-provider.tsx`)

Provides error boundary functionality to catch and handle JavaScript errors in the component tree.

#### Features

- **Error Catching**: Catches JavaScript errors anywhere in the child component tree
- **Graceful Fallback**: Displays a user-friendly error message instead of a blank screen
- **Error Logging**: Logs errors to the console (can be extended to external services)
- **Recovery Option**: Provides a refresh button to recover from errors
- **Customizable Fallback**: Allows custom fallback UI to be provided

#### Props

```typescript
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}
```

#### Usage

```typescript
import { ErrorBoundaryProvider } from '@/providers/error-boundary-provider';

// Basic usage with default fallback
function App() {
  return (
    <ErrorBoundaryProvider>
      <YourAppContent />
    </ErrorBoundaryProvider>
  );
}

// With custom fallback UI
function AppWithCustomError() {
  return (
    <ErrorBoundaryProvider
      fallback={
        <div className="error-page">
          <h1>Oops! Something went wrong</h1>
          <p>Please contact support if this continues.</p>
        </div>
      }
    >
      <YourAppContent />
    </ErrorBoundaryProvider>
  );
}
```

#### Default Fallback UI

The error boundary includes a styled fallback UI with:
- **Warning icon** with red styling
- **Clear error message** explaining what happened
- **Refresh button** to attempt recovery
- **Responsive design** that works on all screen sizes
- **Tailwind CSS styling** consistent with the application theme

## Provider Composition

Providers should be composed in the following order for optimal functionality:

```typescript
import { ErrorBoundaryProvider } from '@/providers/error-boundary-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { ModalProvider } from '@/providers/modal-provider';

function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <ErrorBoundaryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <ModalProvider>
                {children}
              </ModalProvider>
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundaryProvider>
      </body>
    </html>
  );
}
```

This composition ensures:
- **Error boundary** catches any errors in the provider tree or child components
- **Theme context** is available to all child components
- **Authentication state** is managed globally
- **Modal portal** is available for any component that needs to render modals
- **Clean separation** of concerns with each provider having a single responsibility
- **Graceful error handling** prevents the entire app from crashing

## Testing

The providers directory includes comprehensive tests:

- `auth-provider-preservation.test.tsx` - Tests for unsaved changes preservation during authentication state changes
- `error-boundary-provider.test.tsx` - Tests for error boundary functionality and fallback UI rendering

## Best Practices

1. **Provider Order**: Follow the recommended composition order with ErrorBoundary as the outermost provider
2. **Error Handling**: Always wrap your provider tree with ErrorBoundaryProvider for graceful error recovery
3. **Single Responsibility**: Each provider focuses on one concern (auth, theme, modals, errors)
4. **Performance**: Providers use React context, so minimize unnecessary re-renders by splitting contexts when possible
5. **Testing**: Mock providers in tests to isolate component behavior
6. **Type Safety**: Always use the provided TypeScript interfaces for type safety
7. **Modal Usage**: Use the modal portal (`#modal-root`) with React's `createPortal` for modal rendering
8. **Theme Consistency**: Ensure all components that need theme context are wrapped within ThemeProvider

## Dependencies

- **React**: Core React functionality including class components for error boundaries
- **Supabase**: Authentication and database integration
- **next-themes**: Theme management
- **Next.js**: Navigation and routing
- **Zustand**: State management integration
- **Tailwind CSS**: Styling for error boundary fallback UI

## Security Considerations

- **Token Storage**: Authentication tokens are stored in HTTP-only cookies
- **Session Validation**: Sessions are validated on every auth state change
- **Data Clearing**: Sensitive data is automatically cleared on sign out
- **CSRF Protection**: Uses SameSite cookie attributes for CSRF protection 