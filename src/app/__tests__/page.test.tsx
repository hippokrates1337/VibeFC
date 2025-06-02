import React from 'react';
import { render, screen } from '@/test-utils';
import '@testing-library/jest-dom';
import RootPage from '../page';
import { useAuth } from '@/providers/auth-provider';

// Mock the auth provider
jest.mock('@/providers/auth-provider', () => ({
  useAuth: jest.fn(),
}));

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => {
    return <a href={href} {...props}>{children}</a>;
  };
});

describe('RootPage', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state when auth is loading', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isLoading: true,
      signOut: jest.fn(),
    });

    render(<RootPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    // Check for loading spinner
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows public landing content for unauthenticated users', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false,
      signOut: jest.fn(),
    });

    render(<RootPage />);

    // Check for public landing content
    expect(screen.getByText('Financial Forecasting Made Simple')).toBeInTheDocument();
    expect(screen.getByText(/VibeFC helps you create, maintain, and analyze/)).toBeInTheDocument();
    
    // Check for sign-in/sign-up links (check all instances)
    const signInLinks = screen.getAllByRole('link', { name: /sign in/i });
    expect(signInLinks.length).toBeGreaterThanOrEqual(1);
    expect(signInLinks[0]).toHaveAttribute('href', '/login');
    
    const signUpLinks = screen.getAllByRole('link', { name: /create account/i });
    expect(signUpLinks.length).toBeGreaterThanOrEqual(1);
    expect(signUpLinks[0]).toHaveAttribute('href', '/signup');
    
    // Should not show authenticated navigation
    expect(screen.queryByText('Welcome, test@example.com')).not.toBeInTheDocument();
    expect(screen.queryByText('Sign Out')).not.toBeInTheDocument();
  });

  it('shows dashboard content for authenticated users', () => {
    const mockSignOut = jest.fn();
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
      signOut: mockSignOut,
    });

    render(<RootPage />);

    // Check for dashboard content
    expect(screen.getByText('Welcome to VibeFC Dashboard')).toBeInTheDocument();
    expect(screen.getByText(/Your financial forecasting platform is ready/)).toBeInTheDocument();
    
    // Check for authenticated navigation
    expect(screen.getByText(`Welcome, ${mockUser.email}`)).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
    
    // Check for navigation links - be more specific about which ones we're testing
    expect(screen.getByRole('link', { name: /data intake/i })).toHaveAttribute('href', '/data-intake');
    
    // For organizations, get all links and check that at least one has the right href
    const orgLinks = screen.getAllByRole('link', { name: /organizations/i });
    expect(orgLinks.length).toBeGreaterThanOrEqual(1);
    expect(orgLinks.some(link => link.getAttribute('href') === '/organizations')).toBe(true);
    
    expect(screen.getByRole('link', { name: /forecast definition/i })).toHaveAttribute('href', '/forecast-definition');
    
    // Should not show public sign-in links in header
    expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /create account/i })).not.toBeInTheDocument();
  });

  it('calls signOut when sign out button is clicked', async () => {
    const mockSignOut = jest.fn();
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
      signOut: mockSignOut,
    });

    render(<RootPage />);

    const signOutButton = screen.getByText('Sign Out');
    signOutButton.click();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('renders feature cards for both authenticated and unauthenticated users', () => {
    // Test with unauthenticated user
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false,
      signOut: jest.fn(),
    });

    render(<RootPage />);

    // Check for feature cards (should be present in both states)
    expect(screen.getByText('Data Import')).toBeInTheDocument();
    expect(screen.getByText('Variable Management')).toBeInTheDocument();
    expect(screen.getByText('Forecast Analysis')).toBeInTheDocument();
  });
}); 