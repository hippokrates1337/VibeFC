import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { AuthProvider } from '../auth-provider';
import { supabase } from '@/lib/supabase';
import { useOrganizationStore } from '@/lib/store/organization';
import { useForecastGraphStore } from '@/lib/store/forecast-graph-store';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    from: jest.fn(),
  },
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock stores
jest.mock('@/lib/store/organization', () => ({
  useOrganizationStore: {
    getState: jest.fn(),
  },
}));

jest.mock('@/lib/store/variables', () => ({
  useVariableStore: {
    getState: jest.fn(() => ({
      fetchVariables: jest.fn(),
      clearVariables: jest.fn(),
    })),
  },
}));

jest.mock('@/lib/store/forecast-graph-store', () => ({
  useForecastGraphStore: {
    getState: jest.fn(),
  },
}));

describe('AuthProvider - Unsaved Changes Preservation', () => {
  const mockSession = {
    user: { id: 'test-user-id' },
    access_token: 'test-token',
    expires_in: 3600,
  };

  const mockOrgStore = {
    currentOrganization: { id: 'test-org-id', name: 'Test Org' },
    fetchOrganizationData: jest.fn(),
    clearOrganizationData: jest.fn(),
  };

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

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock store states
    (useOrganizationStore.getState as jest.Mock).mockReturnValue(mockOrgStore);
    (useForecastGraphStore.getState as jest.Mock).mockReturnValue(mockForecastStore);

    // Mock Supabase auth
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
    });

    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  it('should preserve unsaved changes when SIGNED_IN event occurs with existing data', async () => {
    const mockOnAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock;
    
    render(
      <AuthProvider>
        <div>Test Child</div>
      </AuthProvider>
    );

    // Wait for initial setup
    await waitFor(() => {
      expect(supabase.auth.getSession).toHaveBeenCalled();
    });

    // Simulate the auth state change callback being called
    const authStateChangeCallback = mockOnAuthStateChange.mock.calls[0][0];
    
    // Simulate SIGNED_IN event (like when browser window is restored)
    authStateChangeCallback('SIGNED_IN', mockSession);

    // Verify that resetStore was NOT called because we have unsaved changes
    expect(mockForecastStore.resetStore).not.toHaveBeenCalled();
    
    // Verify that organization data fetch was NOT triggered
    expect(mockOrgStore.fetchOrganizationData).not.toHaveBeenCalled();
  });

  it('should fetch fresh data when SIGNED_IN event occurs with no existing data', async () => {
    // Mock empty store state
    const emptyForecastStore = {
      ...mockForecastStore,
      forecastId: null,
      isDirty: false,
      nodes: [],
    };
    
    const emptyOrgStore = {
      ...mockOrgStore,
      currentOrganization: null,
    };

    (useOrganizationStore.getState as jest.Mock).mockReturnValue(emptyOrgStore);
    (useForecastGraphStore.getState as jest.Mock).mockReturnValue(emptyForecastStore);

    const mockOnAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock;
    
    render(
      <AuthProvider>
        <div>Test Child</div>
      </AuthProvider>
    );

    // Wait for initial setup
    await waitFor(() => {
      expect(supabase.auth.getSession).toHaveBeenCalled();
    });

    // Simulate the auth state change callback being called
    const authStateChangeCallback = mockOnAuthStateChange.mock.calls[0][0];
    
    // Simulate SIGNED_IN event with no existing data
    authStateChangeCallback('SIGNED_IN', mockSession);

    // Verify that organization data fetch WAS triggered because no existing data
    expect(emptyOrgStore.fetchOrganizationData).toHaveBeenCalledWith('test-user-id', 'test-token');
  });

  it('should clear all data on SIGNED_OUT event', async () => {
    const mockOnAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock;
    
    render(
      <AuthProvider>
        <div>Test Child</div>
      </AuthProvider>
    );

    // Wait for initial setup
    await waitFor(() => {
      expect(supabase.auth.getSession).toHaveBeenCalled();
    });

    // Simulate the auth state change callback being called
    const authStateChangeCallback = mockOnAuthStateChange.mock.calls[0][0];
    
    // Simulate SIGNED_OUT event
    authStateChangeCallback('SIGNED_OUT', null);

    // Verify that all stores were cleared
    expect(mockOrgStore.clearOrganizationData).toHaveBeenCalled();
    expect(mockForecastStore.resetStore).toHaveBeenCalled();
  });
}); 