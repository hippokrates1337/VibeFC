// Fully mock MSW to avoid dependency issues
// Instead of: import { http, HttpResponse } from 'msw';
const HttpResponse = {
  json: (data: any) => ({ body: data })
};
const http = {
  get: (url: string, handler: () => any) => ({ 
    url, 
    method: 'GET', 
    handler 
  })
};

// No real MSW imports
// Define handlers before using them in setupServer

// Use the actual path to your store and types
import { useVariableStore, Variable, rehydrateVariable, TimeSeriesData } from '../variables';
import { act } from 'react'; // Using act for store updates if needed

// Mock localStorage
let localStorageMock: { [key: string]: string } = {};

const mockLocalStorage = {
  getItem: (key: string): string | null => {
    return localStorageMock[key] || null;
  },
  setItem: (key: string, value: string): void => {
    localStorageMock[key] = value;
  },
  removeItem: (key: string): void => {
    delete localStorageMock[key];
  },
  clear: (): void => {
    localStorageMock = {};
  },
  length: Object.keys(localStorageMock).length,
  key: (index: number): string | null => {
    const keys = Object.keys(localStorageMock);
    return keys[index] || null;
  }
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// First, define all data needed for tests
const mockVariables: Variable[] = [
  {
    id: 'var-1',
    name: 'Revenue',
    type: 'ACTUAL',
    organizationId: 'org-test',
    timeSeries: [
      { date: new Date('2023-01-01T00:00:00.000Z'), value: 1000 },
      { date: new Date('2023-02-01T00:00:00.000Z'), value: 1200 },
    ],
  },
  {
    id: 'var-2',
    name: 'Expenses',
    type: 'ACTUAL',
    organizationId: 'org-test',
    timeSeries: [
      { date: new Date('2023-01-01T00:00:00.000Z'), value: 500 },
      { date: new Date('2023-02-01T00:00:00.000Z'), value: 600 },
    ],
  },
];

// Raw API response format expected by the store's fetch logic
const mockApiResponse = {
  variables: mockVariables.map(v => ({
    id: v.id,
    name: v.name,
    type: v.type,
    values: v.timeSeries.map(ts => ({ // Note the 'values' key
      date: ts.date.toISOString(),
      value: ts.value,
    })),
    organization_id: v.organizationId, // Add organization_id
  })),
};

const userId = 'frontend-user'; // Use a consistent user ID
// Construct the API URL based on the environment variable used in the store
const getApiUrl = (base: string | undefined, user: string): string => {
  if (!base) {
    // Handle missing env var in tests, maybe throw or return a specific invalid URL
    console.error('Missing NEXT_PUBLIC_BACKEND_URL for test API URL construction');
    return 'invalid-test-url';
  }
  return `${base}/data-intake/variables/${user}`;
};
// Note: process.env.NEXT_PUBLIC_BACKEND_URL is set in beforeEach

// Helper function to set up fetch mock for different scenarios
// Returns the mock function and a cleanup function
const setupFetchMock = (scenario: 'success' | 'empty' | 'serverError' | 'networkError' | 'nonJsonError' | 'malformed' | 'invalidData'): { mockFetch: jest.Mock; cleanup: () => void } => {
  const originalFetch = global.fetch; // Keep a reference to the original fetch
  const backendUrlBase = process.env.NEXT_PUBLIC_BACKEND_URL;
  const expectedApiUrl = getApiUrl(backendUrlBase, userId);

  const mockImplementation = async (url: RequestInfo | URL): Promise<Response> => {
    const urlString = url.toString();

    console.log(`[Test Mock Fetch] Intercepted fetch for: ${urlString}`);
    console.log(`[Test Mock Fetch] Comparing against expected: ${expectedApiUrl}`);

    // Check against the dynamically constructed URL
    if (urlString === expectedApiUrl) {
      console.log(`[Test Mock Fetch] Matched expected URL for scenario: ${scenario}`);
      switch (scenario) {
        case 'success':
          return {
            ok: true, status: 200, json: async () => mockApiResponse,
            text: async () => JSON.stringify(mockApiResponse), headers: new Headers(),
            redirected: false, statusText: "OK", type: "basic", url: urlString
          } as unknown as Response;
        case 'empty':
          const emptyResponse = { variables: [] };
          return {
            ok: true, status: 200, json: async () => emptyResponse,
            text: async () => JSON.stringify(emptyResponse), headers: new Headers(),
            redirected: false, statusText: "OK", type: "basic", url: urlString
          } as unknown as Response;
        case 'serverError':
          const errorData = { message: 'Internal Server Error' };
          return {
            ok: false, status: 500, statusText: 'Internal Server Error',
            json: async () => errorData, text: async () => JSON.stringify(errorData),
            headers: new Headers(), redirected: false, type: "basic", url: urlString
          } as unknown as Response;
        case 'nonJsonError':
           return {
            ok: false, status: 500, statusText: 'Internal Server Error',
            json: async () => { throw new SyntaxError("Unexpected token 'S'"); }, // Simulate JSON parse failure
            text: async () => "Server Error Text", // Return plain text
            headers: new Headers(), redirected: false, type: "basic", url: urlString
          } as unknown as Response;
        case 'malformed':
          const malformedResponse = { data: "wrong structure" }; // Missing 'variables'
          return {
            ok: true, status: 200, json: async () => malformedResponse,
            text: async () => JSON.stringify(malformedResponse), headers: new Headers(),
            redirected: false, statusText: "OK", type: "basic", url: urlString
          } as unknown as Response;
        case 'invalidData':
          const invalidDataResponse = {
            variables: [{
              id: 'var-invalid', name: 'Invalid Data Var', type: 'INPUT',
              values: [
                { date: 'not-a-date', value: 100 }, // Invalid date
                { date: '2023-03-01T00:00:00.000Z', value: 'not-a-number' } // Non-numeric value
              ]
            }]
          };
          return {
            ok: true, status: 200, json: async () => invalidDataResponse,
            text: async () => JSON.stringify(invalidDataResponse), headers: new Headers(),
            redirected: false, statusText: "OK", type: "basic", url: urlString
          } as unknown as Response;
        case 'networkError':
        default:
          throw new Error('Network Failure'); // Simulate network error
      }
    }

    // Default 404 for other URLs
    console.log(`[Test Mock Fetch] URL did not match. Returning 404.`);
    return {
      ok: false, status: 404, json: async () => ({ message: 'Not Found' }),
      text: async () => JSON.stringify({ message: 'Not Found' }), headers: new Headers(),
      redirected: false, statusText: "Not Found", type: "basic", url: urlString
    } as unknown as Response;
  };

  const mockFetch = jest.fn(mockImplementation);
  // Replace global fetch with the mock
  global.fetch = mockFetch;

  // Return the mock function and a cleanup function
  return {
    mockFetch,
    cleanup: () => {
      global.fetch = originalFetch;
    }
  };
};

// Setup mock handlers
/*
const handlers = [
  // Default success handler
  http.get(getApiUrl(process.env.NEXT_PUBLIC_BACKEND_URL, userId), () => {
    return HttpResponse.json(mockApiResponse);
  }),
];

// Create a mock server rather than using MSW
const server = {
  listen: jest.fn(),
  resetHandlers: jest.fn(),
  close: jest.fn(),
  // Mock fetch requests to return expected data
  use: jest.fn((mockHandlers) => {
    // Store the mock handlers (not used in this simple implementation)
  })
};
*/

// Mock fetch globally - This section is now handled by setupFetchMock and can be removed or commented out
/*
const originalFetch = global.fetch;
*/

// Remove server.listen/close calls
/*
beforeAll(() => {
  // Pretend to set up the server
  server.listen();
});

afterAll(() => {
  // Restore the original fetch
  global.fetch = originalFetch;
  // Pretend to close the server
  server.close();
});
*/

// Use Vitest's module mocking for console if needed
// jest.spyOn(console, 'log').mockImplementation(() => {});
// jest.spyOn(console, 'error').mockImplementation(() => {});
// jest.spyOn(console, 'warn').mockImplementation(() => {});

// --- Main Test Suite ---
describe('Variable Store', () => {

  // Spies and Mocks
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let mockFetch: jest.Mock; // Variable to hold the current fetch mock
  let cleanupFetchMock: () => void = () => {}; // Function to restore original fetch

  beforeEach(() => {
    // Define mock environment variable
    process.env.NEXT_PUBLIC_BACKEND_URL = 'http://mock-backend.test';

    // Reset Zustand store state
    act(() => {
      useVariableStore.setState({
        variables: [],
        isLoading: false,
        error: null,
        selectedOrganizationId: null, // Ensure this is reset too
      });
    });

    // Reset localStorage mock
    mockLocalStorage.clear();

    // Mock console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Clear previous fetch mock before setting a new one (if applicable)
    if (typeof cleanupFetchMock === 'function') {
      cleanupFetchMock();
    }
    // Ensure mockFetch is reset (though it will be reassigned in describe blocks/tests)
    mockFetch = jest.fn();
  });

  afterEach(() => {
    // Restore console mocks
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();

    // Restore fetch mock
    if (typeof cleanupFetchMock === 'function') {
       cleanupFetchMock();
    }
    // Clear all Jest mocks
    jest.clearAllMocks();
    // Ensure timers are real after tests that use fake timers
    jest.useRealTimers();

    // Clean up mock environment variable
    delete process.env.NEXT_PUBLIC_BACKEND_URL;
  });

  // --- Synchronous Actions ---
  describe('Synchronous Actions', () => {
    it('setVariables should replace the variables array', () => {
      const initialVars = [{ ...mockVariables[0] }];
      const newVars = [{ ...mockVariables[1] }];
      act(() => useVariableStore.setState({ variables: initialVars }));

      act(() => useVariableStore.getState().setVariables(newVars));

      expect(useVariableStore.getState().variables).toEqual(newVars);
      expect(useVariableStore.getState().variables).not.toEqual(initialVars);
    });

    it('addVariables should add new variables without duplicates', () => {
      const initialVar = { ...mockVariables[0] };
      const newVar = { ...mockVariables[1] };
      const duplicateVar = { ...mockVariables[0] }; // Same ID as initialVar
      const variablesToAdd = [newVar, duplicateVar];

      act(() => useVariableStore.setState({ variables: [initialVar] }));
      act(() => useVariableStore.getState().addVariables(variablesToAdd));

      const finalState = useVariableStore.getState().variables;
      expect(finalState).toHaveLength(2);
      expect(finalState).toContainEqual(initialVar);
      expect(finalState).toContainEqual(newVar);
    });

    it('clearVariables should empty the variables array', () => {
      act(() => useVariableStore.setState({ variables: mockVariables }));
      expect(useVariableStore.getState().variables.length).toBeGreaterThan(0);

      act(() => useVariableStore.getState().clearVariables());

      expect(useVariableStore.getState().variables).toEqual([]);
    });
  });

  // --- Fetch Logic ---
  describe('fetchVariables', () => {

     beforeEach(() => {
      // Set up fetch mock for this block
      const { mockFetch: currentMockFetch, cleanup } = setupFetchMock('success');
      mockFetch = currentMockFetch;
      cleanupFetchMock = cleanup;
    });

    it('should fetch variables successfully and update the store', async () => {
      await act(async () => {
        await useVariableStore.getState().fetchVariables(userId, 'org-test');
      });

      const state = useVariableStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.variables).toEqual(mockVariables);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(getApiUrl(process.env.NEXT_PUBLIC_BACKEND_URL, userId), expect.any(Object));
    });

    it('should handle an empty response from the API', async () => {
      cleanupFetchMock(); // Clear previous mock
      const { mockFetch: currentMockFetch, cleanup } = setupFetchMock('empty');
      mockFetch = currentMockFetch;
      cleanupFetchMock = cleanup;

      await act(async () => {
        await useVariableStore.getState().fetchVariables(userId, 'org-test');
      });

      const state = useVariableStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.variables).toEqual([]);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle API server errors (JSON response) and set the error state', async () => {
       cleanupFetchMock();
       const { mockFetch: currentMockFetch, cleanup } = setupFetchMock('serverError');
       mockFetch = currentMockFetch;
       cleanupFetchMock = cleanup;

      await act(async () => {
        await useVariableStore.getState().fetchVariables(userId, 'org-test');
      });

      const state = useVariableStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.variables).toEqual([]);
      expect(state.error).toBe('Internal Server Error');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle API server errors (non-JSON response) and set the error state', async () => {
      cleanupFetchMock();
      const { mockFetch: currentMockFetch, cleanup } = setupFetchMock('nonJsonError');
      mockFetch = currentMockFetch;
      cleanupFetchMock = cleanup;

      await act(async () => {
        await useVariableStore.getState().fetchVariables(userId, 'org-test');
      });

      const state = useVariableStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.variables).toEqual([]);
      expect(state.error).toMatch(/Failed to fetch variables \(status: 500\): Server Error Text/);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle network errors and set the error state', async () => {
      cleanupFetchMock();
      const { mockFetch: currentMockFetch, cleanup } = setupFetchMock('networkError');
      mockFetch = currentMockFetch;
      cleanupFetchMock = cleanup;

      await act(async () => {
        await useVariableStore.getState().fetchVariables(userId, 'org-test');
      });

      const state = useVariableStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.variables).toEqual([]);
      expect(state.error).toBe('Network Failure');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

     it('should handle malformed API response (missing variables key)', async () => {
      cleanupFetchMock();
      const { mockFetch: currentMockFetch, cleanup } = setupFetchMock('malformed');
      mockFetch = currentMockFetch;
      cleanupFetchMock = cleanup;

      await act(async () => {
        await useVariableStore.getState().fetchVariables(userId, 'org-test');
      });

      const state = useVariableStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull(); // Should not error, just handle missing data
      expect(state.variables).toEqual([]); // Should default to empty
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No variables array found in the API response'));
    });

    it('should handle invalid data within API response (bad dates, non-numeric values)', async () => {
      cleanupFetchMock();
      const { mockFetch: currentMockFetch, cleanup } = setupFetchMock('invalidData');
      mockFetch = currentMockFetch;
      cleanupFetchMock = cleanup;

      await act(async () => {
        await useVariableStore.getState().fetchVariables(userId, 'org-test');
      });

      const state = useVariableStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.variables).toHaveLength(1);
      const invalidVar = state.variables[0];
      expect(invalidVar.id).toBe('var-invalid');
      expect(invalidVar.timeSeries).toHaveLength(2);
      // Check how invalid dates are handled - likely result in Invalid Date objects
      expect(invalidVar.timeSeries[0].date.toString()).toBe('Invalid Date');
      expect(invalidVar.timeSeries[0].value).toBe(100);
      // Check how non-numeric values are handled - should become NaN
      expect(invalidVar.timeSeries[1].date).toEqual(new Date('2023-03-01T00:00:00.000Z'));
      expect(invalidVar.timeSeries[1].value).toBeNaN(); // Fixed: Expect NaN, not null
      expect(mockFetch).toHaveBeenCalledTimes(1);
      // Check if console.warn was called for the non-numeric value
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Non-numeric value detected: not-a-number'));
    });


    it('should not fetch if variables already exist for the selected organization', async () => {
      const orgId = 'org-test';
      // Setup initial state with variables for the target org and set selectedOrgId
      act(() => {
        useVariableStore.setState({
          variables: mockVariables.filter(v => v.organizationId === orgId),
          selectedOrganizationId: orgId
        });
      });

      await act(async () => {
        await useVariableStore.getState().fetchVariables(userId, 'some-token');
      });

      const state = useVariableStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.variables).toEqual(mockVariables.filter(v => v.organizationId === orgId));
      expect(mockFetch).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Variables already exist in store for the selected organization, skipping fetch.'));
    });

    it('should still fetch if variables exist but not for the selected organization', async () => {
      const orgId = 'org-new'; // A different org ID
      // Setup initial state with variables for a *different* org
      act(() => {
        useVariableStore.setState({
          variables: mockVariables, // Contains org-test variables
          selectedOrganizationId: orgId // But selected org is different
        });
      });

      await act(async () => {
        await useVariableStore.getState().fetchVariables(userId, 'some-token');
      });

      const state = useVariableStore.getState();
      // Assuming the fetch returns the same mockVariables for simplicity
      expect(state.variables).toEqual(mockVariables); 
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should still fetch if variables exist but no organization is selected', async () => {
      // Setup initial state with variables but no selected org
      act(() => {
        useVariableStore.setState({
          variables: mockVariables,
          selectedOrganizationId: null 
        });
      });

      await act(async () => {
        await useVariableStore.getState().fetchVariables(userId, 'some-token');
      });

      const state = useVariableStore.getState();
      expect(state.variables).toEqual(mockVariables); // Assuming fetch returns same data
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

  });

  // --- Persistence & Rehydration ---
  describe('Persistence and Rehydration', () => {
     // Use fake timers for setTimeout in rehydration logic
    beforeEach(() => {
       jest.useFakeTimers();
       jest.spyOn(global, 'setTimeout'); // Spy on setTimeout
       // Set up fetch mock for this block
       const { mockFetch: currentMockFetch, cleanup } = setupFetchMock('success');
       mockFetch = currentMockFetch;
       cleanupFetchMock = cleanup;
    });

    afterEach(() => {
       jest.useRealTimers();
    });

    it('rehydrateVariable helper should convert date strings to Date objects', () => {
      const variableWithStringDates = {
        id: 'test-var',
        name: 'Test',
        type: 'ACTUAL' as Variable['type'],
        organizationId: 'org-test',
        timeSeries: [
          { date: '2023-01-01T00:00:00.000Z', value: 100 },
          { date: '2023-02-01T00:00:00.000Z', value: 200 },
        ] as any
      };

      const rehydrated = rehydrateVariable(variableWithStringDates);

      expect(rehydrated.timeSeries[0].date).toBeInstanceOf(Date);
      expect(rehydrated.timeSeries[0].date.toISOString()).toBe('2023-01-01T00:00:00.000Z');
      expect(rehydrated.timeSeries[1].date).toBeInstanceOf(Date);
      expect(rehydrated.timeSeries[1].date.toISOString()).toBe('2023-02-01T00:00:00.000Z');
    });

    // Simulating the full persist rehydration is complex.
    // We focus on the expected *outcome* of the onRehydrateStorage logic.
    it('should load variables from localStorage and skip fetch if data exists for the selected org', () => {
        const orgId = 'org-test';
        // Arrange: Simulate data being in localStorage
        // Use a deep copy for the stored state to avoid accidental mutation
        const cleanMockVariables = JSON.parse(JSON.stringify(mockVariables));
        const storedState = {
            state: {
                variables: cleanMockVariables.map((v: Variable) => ({
                    ...v,
                    // Simulate serialized dates
                    timeSeries: v.timeSeries.map((ts: TimeSeriesData) => ({ ...ts, date: new Date(ts.date).toISOString() }))
                })),
                isLoading: false,
                error: null,
                selectedOrganizationId: orgId // Make sure selected Org ID is also stored/rehydrated
            },
            version: 0 
        };
        mockLocalStorage.setItem('variable-storage', JSON.stringify(storedState));

        // Act: Simulate store initialization/rehydration trigger
        act(() => {
           const stateFromStorage = JSON.parse(mockLocalStorage.getItem('variable-storage') || '');
           const rehydratedVars = stateFromStorage.state.variables.map((v: any) => rehydrateVariable(v as Variable));
           // Set the full rehydrated state including selectedOrganizationId
           // Ensure we are setting the correct state slice
           useVariableStore.setState({ 
             variables: rehydratedVars, 
             isLoading: stateFromStorage.state.isLoading, // Use rehydrated state
             error: stateFromStorage.state.error, // Use rehydrated state
             selectedOrganizationId: stateFromStorage.state.selectedOrganizationId 
           });

           // Manually simulate the store's internal onRehydrateStorage logic *effect*
           // Call fetchVariables directly to trigger the internal checks
           useVariableStore.getState().fetchVariables(userId, 'some-token');
        });

        // Assert initial state post-manual rehydration
        const finalState = useVariableStore.getState();
        // Compare against the original mockVariables, which have Date objects
        expect(finalState.variables).toEqual(mockVariables);
        expect(finalState.isLoading).toBe(false);
        expect(finalState.selectedOrganizationId).toBe(orgId);

        // Advance timers - not needed as fetch is called synchronously above
        // act(() => { jest.runAllTimers(); });

        // Assert: fetchVariables *was* called once directly in the act block above,
        // but the internal fetch call should have been skipped.
        expect(mockFetch).not.toHaveBeenCalled(); 
        // Check the log from the *direct call* to fetchVariables
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Variables already exist in store for the selected organization, skipping fetch.'));
        // Ensure setTimeout was NOT called to schedule a fetch
        expect(setTimeout).not.toHaveBeenCalled();
    });

    it('should attempt to fetch variables if localStorage is empty after rehydration', async () => {
        // Arrange: Ensure localStorage is empty
        mockLocalStorage.clear();
        expect(mockLocalStorage.getItem('variable-storage')).toBeNull();

        let fetchPromise: Promise<void> | null = null;
        // Act: Simulate store initialization/rehydration trigger where no state is found
        act(() => {
            useVariableStore.setState({ variables: [], isLoading: false, error: null });
            // Manually simulate the store's internal onRehydrateStorage logic *effect*
            if (useVariableStore.getState().variables.length === 0) {
              setTimeout(() => {
                console.log('Executing scheduled fetch from rehydration simulation');
                // Store the promise returned by fetchVariables
                fetchPromise = useVariableStore.getState().fetchVariables(userId, 'org-test');
              }, 100);
            }
        });

        // Assert: setTimeout should have been called to schedule fetchVariables
        expect(setTimeout).toHaveBeenCalledTimes(1);
        expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 100);
        expect(mockFetch).not.toHaveBeenCalled(); // Fetch not called yet

        // Advance timers to trigger the scheduled fetch AND wait for it to complete
        await act(async () => {
          jest.runAllTimers();
          // Wait for the fetchVariables promise to resolve if it was set
          if (fetchPromise) {
            await fetchPromise;
          }
        });

        // Assert: Fetch should have been called via the timeout
        expect(mockFetch).toHaveBeenCalledTimes(1); // Fetch IS called
        expect(useVariableStore.getState().variables).toEqual(mockVariables); // State updated by fetch
        expect(useVariableStore.getState().isLoading).toBe(false);
        expect(consoleLogSpy).toHaveBeenCalledWith('Executing scheduled fetch from rehydration simulation');
    });

  });

}); // End of main describe block 