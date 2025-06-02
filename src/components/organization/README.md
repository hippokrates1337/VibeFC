# Organization Components (`src/components/organization/`)

This directory contains UI components for organization management and member administration.

## Components

### `OrganizationSelector.tsx`
- **Purpose**: Dropdown component for selecting the current organization
- **Features**:
  - Lists all organizations the user is a member of
  - Displays current selection with organization name
  - Integrates with organization store for state management
  - Responsive design with search functionality
- **Usage**: Used in the main navigation header for organization switching

### `CreateOrganizationModal.tsx`
- **Purpose**: Modal dialog for creating new organizations
- **Features**:
  - Form with organization name and description fields
  - Validation for required fields
  - Integration with organization creation API
  - Loading states and error handling
- **Usage**: Triggered from organization selector or management pages

### `OrganizationSettings.tsx`
- **Purpose**: Settings panel for organization configuration
- **Features**:
  - Edit organization name and description
  - Organization deletion with confirmation
  - Member management controls
  - Role-based access control for settings
- **Usage**: Used in organization management pages for admins

### `MembersList.tsx`
- **Purpose**: Table component displaying organization members
- **Features**:
  - Lists all members with their roles and status
  - Role modification controls (Admin, Editor, Viewer)
  - Member removal functionality
  - Invitation status tracking
  - Sorting and filtering capabilities
- **Usage**: Used in organization management for member oversight

### `InviteMemberForm.tsx`
- **Purpose**: Form component for inviting new members
- **Features**:
  - Email input with validation
  - Role selection dropdown
  - Bulk invitation support
  - Integration with invitation API
  - Success/error feedback
- **Usage**: Used within organization management for member invitations

## Role-Based Access Control

Components implement role-based rendering:
- **Admin**: Full access to all organization management features
- **Editor**: Limited access to content management
- **Viewer**: Read-only access to organization information

## State Management

Components integrate with:
- **Organization Store**: Current organization selection and data
- **User Store**: Current user information and permissions
- **API Services**: Backend integration for CRUD operations

## Styling

Components use:
- **shadcn/ui**: For consistent form controls, tables, and dialogs
- **Tailwind CSS**: For responsive layout and styling
- **Icons**: Lucide React icons for actions and status indicators

## API Integration

Components interact with:
- **Organization API**: CRUD operations for organizations
- **Member API**: Member management and invitations
- **Role API**: Role assignment and permission checking

## Usage Example

```typescript
import { OrganizationSelector } from '@/components/organization/OrganizationSelector';
import { MembersList } from '@/components/organization/MembersList';

// In a layout or page component
export default function OrganizationLayout() {
  return (
    <div className="layout">
      <header>
        <OrganizationSelector />
      </header>
      <main>
        <MembersList organizationId={currentOrg.id} />
      </main>
    </div>
  );
}
```

## Security

- Role-based component rendering
- Permission checking before API calls
- Input validation and sanitization
- Secure member invitation flow
- Audit logging for organization changes 