import React from 'react';
import { render, waitFor, renderWithoutErrorBoundary } from '@/test-utils';
import { AuthProvider } from '../auth-provider';
import type { Session } from '@supabase/supabase-js';

// Mock Supabase completely before importing anything else
jest.mock('@/lib/supabase', () => {
  const mockAuthSubscription = { 
    unsubscribe: jest.fn(),
    id: 'test-subscription-id',
    callback: jest.fn(),
  };
  const mockGetSession = jest.fn();
  const mockOnAuthStateChange = jest.fn();
  const mockSignInWithPassword = jest.fn();
  const mockSignUp = jest.fn();
  const mockSignOut = jest.fn();
  const mockSupabaseFrom = jest.fn();

  return {
    supabase: {
      auth: {
        getSession: mockGetSession,
        onAuthStateChange: mockOnAuthStateChange,
        signInWithPassword: mockSignInWithPassword,
        signUp: mockSignUp,
        signOut: mockSignOut,
      },
      from: mockSupabaseFrom,
    },
  };
});

// Import after mocking
import { supabase } from '@/lib/supabase';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock document.cookie
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: '',
  configurable: true,
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
    href: 'http://localhost:3000',
    reload: jest.fn(),
  },
  writable: true,
  configurable: true,
});

// Mock organization store
jest.mock('@/lib/store/organization', () => {
  const mockOrgStore = {
    currentOrganization: { id: 'test-org-id', name: 'Test Org' },
    organizations: [{ id: 'test-org-id', name: 'Test Org' }],
    isLoading: false,
    fetchOrganizationData: jest.fn(),
    clearOrganizationData: jest.fn(),
  };

  const mockUseOrganizationStore = jest.fn() as jest.MockedFunction<any> & {
    getState: jest.MockedFunction<() => typeof mockOrgStore>;
  };

  return {
    useOrganizationStore: mockUseOrganizationStore,
  };
});

// Mock variable store
const mockVariableStore = {
  fetchVariables: jest.fn(),
  clearVariables: jest.fn(),
};

jest.mock('@/lib/store/variables', () => ({
  useVariableStore: {
    getState: jest.fn(() => mockVariableStore),
  },
}));

// Mock forecast graph store
const mockForecastStore = {
  forecastId: 'test-forecast-id',
  isDirty: true,
  nodes: [{ id: 'node-1', type: 'CONSTANT' }],
  organizationId: 'test-org-id',
  loadOrganizationForecasts: jest.fn(),
  resetStore: jest.fn(),
  setLoading: jest.fn(),
  setError: jest.fn(),
};

jest.mock('@/lib/store/forecast-graph-store', () => ({
  useForecastGraphStore: {
    getState: jest.fn(() => mockForecastStore),
  },
}));

// Import mocked stores after mocking
import { useOrganizationStore } from '@/lib/store/organization';

describe('AuthProvider - Unsaved Changes Preservation', () => {
  const mockSession: Session = {
    user: { 
      id: 'test-user-id',
      email: 'test@example.com',
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: {},
      user_metadata: {},
      created_at: '2024-01-01T00:00:00Z',
    },
    access_token: 'test-token',
    refresh_token: 'test-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  };

  // Get references to the mocked functions
  const mockGetSession = supabase.auth.getSession as jest.MockedFunction<typeof supabase.auth.getSession>;
  const mockOnAuthStateChange = supabase.auth.onAuthStateChange as jest.MockedFunction<typeof supabase.auth.onAuthStateChange>;
  const mockSupabaseFrom = supabase.from as jest.MockedFunction<typeof supabase.from>;
  const mockUseOrganizationStore = useOrganizationStore as jest.MockedFunction<typeof useOrganizationStore> & {
    getState: jest.MockedFunction<() => any>;
  };

  // Create mock store objects that can be modified in tests
  const createMockOrgStore = () => ({
    currentOrganization: { id: 'test-org-id', name: 'Test Org' },
    organizations: [{ id: 'test-org-id', name: 'Test Org' }],
    isLoading: false,
    fetchOrganizationData: jest.fn(),
    clearOrganizationData: jest.fn(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock document.cookie
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
      configurable: true,
    });
    
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'http://localhost:3000',
        href: 'http://localhost:3000',
        reload: jest.fn(),
      },
      writable: true,
      configurable: true,
    });

    // Setup Supabase mocks
    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    mockOnAuthStateChange.mockReturnValue({
      data: { 
        subscription: { 
          unsubscribe: jest.fn(),
          id: 'test-subscription-id',
          callback: jest.fn(),
        } 
      },
    });

    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    } as any);

    // Setup organization store mock with default state
    const mockOrgStore = createMockOrgStore();
    mockUseOrganizationStore.mockImplementation((selector?: any) => {
      if (typeof selector === 'function') {
        return selector(mockOrgStore);
      }
      return mockOrgStore;
    });

    // Add getState method to organization store mock
    (mockUseOrganizationStore as any).getState = jest.fn(() => mockOrgStore);
  });

  it('should preserve unsaved changes when SIGNED_IN event occurs with existing data', async () => {
    // Ensure the organization store shows existing data from the beginning
    const existingOrgStore = {
      currentOrganization: { id: 'test-org-id', name: 'Test Org' },
      organizations: [{ id: 'test-org-id', name: 'Test Org' }], // This is key - non-empty array
      isLoading: false,
      fetchOrganizationData: jest.fn(),
      clearOrganizationData: jest.fn(),
    };

    // Setup the organization store to return existing data
    mockUseOrganizationStore.mockImplementation((selector?: any) => {
      if (typeof selector === 'function') {
        return selector(existingOrgStore);
      }
      return existingOrgStore;
    });

    // Update getState to return existing data
    (mockUseOrganizationStore as any).getState = jest.fn(() => existingOrgStore);

    const TestComponent = () => (
      <AuthProvider>
        <div data-testid="test-child">Test Child</div>
      </AuthProvider>
    );

    const { getByTestId } = renderWithoutErrorBoundary(<TestComponent />);

    // Wait for initial setup - this should NOT trigger fetchOrganizationData 
    // because we have existing data
    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalled();
    });

    // Verify component rendered successfully
    expect(getByTestId('test-child')).toBeInTheDocument();

    // Clear any calls that might have happened during initial render
    existingOrgStore.fetchOrganizationData.mockClear();

    // Now simulate the auth state change callback being called
    const authStateChangeCallback = mockOnAuthStateChange.mock.calls[0][0];
    
    // Simulate SIGNED_IN event (like when browser window is restored)
    authStateChangeCallback('SIGNED_IN', mockSession);

    // Give time for any async operations
    await waitFor(() => {
      // Since we have existing organizations (length > 0), 
      // fetchOrganizationData should NOT be called
      expect(existingOrgStore.fetchOrganizationData).not.toHaveBeenCalled();
    });
    
    // Verify that resetStore was NOT called because we have unsaved changes
    expect(mockForecastStore.resetStore).not.toHaveBeenCalled();
  });

  it('should fetch fresh data when SIGNED_IN event occurs with no existing data', async () => {
    // Mock empty store state
    const emptyOrgStore = {
      currentOrganization: null,
      organizations: [],
      isLoading: false,
      fetchOrganizationData: jest.fn(),
      clearOrganizationData: jest.fn(),
    };

    // Update mocks to return empty state
    mockUseOrganizationStore.mockImplementation((selector?: any) => {
      if (typeof selector === 'function') {
        return selector(emptyOrgStore);
      }
      return emptyOrgStore;
    });

    (mockUseOrganizationStore as any).getState = jest.fn(() => emptyOrgStore);

    const TestComponent = () => (
      <AuthProvider>
        <div data-testid="test-child">Test Child</div>
      </AuthProvider>
    );

    const { getByTestId } = renderWithoutErrorBoundary(<TestComponent />);

    // Wait for initial setup
    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalled();
    });

    // Verify component rendered successfully
    expect(getByTestId('test-child')).toBeInTheDocument();

    // Simulate the auth state change callback being called
    const authStateChangeCallback = mockOnAuthStateChange.mock.calls[0][0];
    
    // Simulate SIGNED_IN event with no existing data
    authStateChangeCallback('SIGNED_IN', mockSession);

    // Verify that organization data fetch WAS triggered because no existing data
    expect(emptyOrgStore.fetchOrganizationData).toHaveBeenCalledWith('test-user-id', 'test-token');
  });

  it('should clear all data on SIGNED_OUT event', async () => {
    const TestComponent = () => (
      <AuthProvider>
        <div data-testid="test-child">Test Child</div>
      </AuthProvider>
    );

    const { getByTestId } = renderWithoutErrorBoundary(<TestComponent />);

    // Wait for initial setup
    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalled();
    });

    // Verify component rendered successfully
    expect(getByTestId('test-child')).toBeInTheDocument();

    // Simulate the auth state change callback being called
    const authStateChangeCallback = mockOnAuthStateChange.mock.calls[0][0];
    
    // Simulate SIGNED_OUT event
    authStateChangeCallback('SIGNED_OUT', null);

    // Get the current mock org store to check function calls
    const currentOrgStore = (mockUseOrganizationStore as any).getState();

    // Verify that all stores were cleared
    expect(currentOrgStore.clearOrganizationData).toHaveBeenCalled();
    expect(mockForecastStore.resetStore).toHaveBeenCalled();
  });
}); 