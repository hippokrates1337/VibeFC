# Authentication Components (`src/components/auth/`)

This directory contains UI components for user authentication and account management.

## Components

### `LoginForm.tsx`
- **Purpose**: User sign-in form component
- **Features**:
  - Email and password input fields
  - Form validation with error handling
  - Integration with Supabase authentication
  - Loading states during authentication
  - Automatic redirect to root (`/`) after successful login
  - Responsive design with Tailwind CSS
- **Usage**: Used in `/login` page for user authentication
- **Props**: Uses `useAuth` hook for authentication and `useRouter` for navigation

### `SignUpForm.tsx`
- **Purpose**: User registration form component
- **Features**:
  - Email and password input fields with confirmation
  - Form validation (password strength, email format)
  - Integration with Supabase user registration
  - Loading states and error feedback
  - Terms of service and privacy policy acceptance
- **Usage**: Used in `/signup` page for new user registration
- **Props**: Typically receives callback functions for success/error handling

## Authentication Flow

These components integrate with:
- **Supabase Auth**: Backend authentication service
- **Form Validation**: Client-side validation for user input
- **Error Handling**: User-friendly error messages
- **Redirect Logic**: Navigation to root (`/`) after successful authentication

## Routing Integration

- **Login Success**: Redirects to `/` where users see their dashboard
- **Middleware Protection**: Authenticated users accessing `/login` or `/signup` are redirected to `/`
- **Unified Experience**: All authentication flows lead to the root page for consistency

## Styling

Components use:
- **shadcn/ui**: For consistent form controls and buttons
- **Tailwind CSS**: For responsive layout and styling
- **Form Components**: Input, Button, Card components from `/ui`

## Security Features

- Password strength validation
- Email format validation
- CSRF protection through Supabase
- Secure session management
- Input sanitization

## Usage Example

```typescript
import { LoginForm } from '@/components/auth/LoginForm';
import { SignUpForm } from '@/components/auth/SignUpForm';

// In a page component
export default function LoginPage() {
  return (
    <div className="container">
      <LoginForm />
    </div>
  );
}
```

## Integration

These components work with:
- **Middleware**: Authentication state checking and route protection
- **Providers**: Auth context and session management (`AuthProvider`)
- **API Routes**: Backend authentication endpoints
- **Protected Routes**: Conditional rendering based on auth state 