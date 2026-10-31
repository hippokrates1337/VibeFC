import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test-utils';
import '@testing-library/jest-dom';
import { LoginForm } from '../LoginForm';
import { useAuth } from '@/providers/auth-provider';
import { useRouter } from 'next/navigation';

// Mock the auth provider
jest.mock('@/providers/auth-provider', () => ({
  useAuth: jest.fn(),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => {
    return <a href={href} {...props}>{children}</a>;
  };
});

describe('LoginForm', () => {
  const mockSignIn = jest.fn();
  const mockPush = jest.fn();
  const mockReplace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    (useAuth as jest.Mock).mockReturnValue({
      signIn: mockSignIn,
      session: null,
      isLoading: false,
    });
    
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });
    window.history.replaceState(null, '', '/login');
  });

  it('goes back to returnTo after signing in', async () => {
    mockSignIn.mockResolvedValue({ error: null });
    window.history.replaceState(null, '', '/login?returnTo=%2Fforecast-display');

    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/forecast-display'));
  });

  it('ignores a returnTo that points to another site', async () => {
    mockSignIn.mockResolvedValue({ error: null });
    window.history.replaceState(null, '', '/login?returnTo=%2F%2Fevil.example');

    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
  });

  it('leaves the login page by itself when a session exists (e.g. after a token refresh)', () => {
    (useAuth as jest.Mock).mockReturnValue({ signIn: mockSignIn, session: { access_token: 't' }, isLoading: false });
    window.history.replaceState(null, '', '/login?returnTo=%2Fdata-intake');

    render(<LoginForm />);

    expect(mockReplace).toHaveBeenCalledWith('/data-intake');
  });

  it('renders login form with email and password fields', () => {
    render(<LoginForm />);

    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows validation error for empty fields', async () => {
    render(<LoginForm />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email and password are required')).toBeInTheDocument();
    });

    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('calls signIn with email and password on form submission', async () => {
    mockSignIn.mockResolvedValue({ error: null });

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('redirects to root on successful login', async () => {
    mockSignIn.mockResolvedValue({ error: null });

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('shows error message on failed login', async () => {
    const errorMessage = 'Invalid login credentials';
    mockSignIn.mockResolvedValue({ error: { message: errorMessage } });

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows loading state during login', async () => {
    // Mock a delayed sign in
    mockSignIn.mockImplementation(() => new Promise(resolve => 
      setTimeout(() => resolve({ error: null }), 100)
    ));

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    // Check loading state
    expect(screen.getByText('Signing in...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    // Wait for completion
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('contains link to signup page', () => {
    render(<LoginForm />);

    const signupLink = screen.getByRole('link', { name: /sign up/i });
    expect(signupLink).toHaveAttribute('href', '/signup');
  });

  it('contains link to forgot password page', () => {
    render(<LoginForm />);

    const forgotPasswordLink = screen.getByRole('link', { name: /forgot password/i });
    expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password');
  });
}); 