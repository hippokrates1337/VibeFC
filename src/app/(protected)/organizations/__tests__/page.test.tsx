import React from 'react';
import { render, screen } from '@/test-utils';
import '@testing-library/jest-dom';
import OrganizationsPage from '../page';

// Mock child components
jest.mock('@/components/organization/OrganizationSettings', () => ({
  OrganizationSettings: () => <div data-testid="organization-settings">Organization Settings</div>
}));
jest.mock('@/components/organization/MembersList', () => ({
  MembersList: () => <div data-testid="members-list">Members List</div>
}));
jest.mock('@/components/organization/InviteMemberForm', () => ({
  InviteMemberForm: () => <div data-testid="invite-member-form">Invite Member Form</div>
}));

describe('OrganizationsPage', () => {
  test('renders the main heading and child components', () => {
    render(<OrganizationsPage />);

    // Check for the heading
    expect(screen.getByRole('heading', { name: /Organization Management/i })).toBeInTheDocument();

    // Check for mocked child components
    expect(screen.getByTestId('organization-settings')).toBeInTheDocument();
    expect(screen.getByTestId('members-list')).toBeInTheDocument();
    expect(screen.getByTestId('invite-member-form')).toBeInTheDocument();
  });
});
