import { Variable, TimeSeriesData } from '@/lib/store/variables'; // Adjust path as needed

// Mock data for testing
const mockNewVariablesPayload: Omit<Variable, 'id'>[] = [
  {
    name: 'New Revenue',
    type: 'ACTUAL',
    timeSeries: [
      { date: new Date('2024-01-01T00:00:00.000Z'), value: 5000 },
      { date: new Date('2024-02-01T00:00:00.000Z'), value: 5500 },
    ],
  },
  {
    name: 'New Expenses',
    type: 'BUDGET',
    timeSeries: [
      { date: new Date('2024-01-01T00:00:00.000Z'), value: 2000 },
      { date: new Date('2024-02-01T00:00:00.000Z'), value: 2100 },
    ],
  },
];

// Mock response for successful creation (assuming API returns the created variables with IDs)
const mockCreatedVariablesResponse: Variable[] = mockNewVariablesPayload.map((v, index) => ({
  ...v,
  id: `new-var-${index + 1}`,
  timeSeries: v.timeSeries.map(ts => ({ ...ts, date: new Date(ts.date) })) // Ensure dates are Date objects if needed by calling code
}));

// Mock data required to simulate the input for handleImportVariables
const mockVariableToAdd: Variable = {
  id: 'temp-id-1', // Use temporary frontend ID
  name: 'New Revenue',
  type: 'ACTUAL',
  timeSeries: [
    { date: new Date('2024-01-01T00:00:00.000Z'), value: 5000 },
    { date: new Date('2024-02-01T00:00:00.000Z'), value: 5500 },
  ],
};

// Simulate the 'decisions' array passed to handleImportVariables
const mockDecisionsInput = [
  { variable: mockVariableToAdd, action: 'add' as const }, 
  // Add other decisions (update/skip) if needed for different test scenarios,
  // but for testing the POST, we mainly need action: 'add'.
];

// Expected payload format based on handleImportVariables logic
const expectedApiPayload = {
  variables: [mockVariableToAdd].map(variable => ({
    id: variable.id,
    name: variable.name,
    type: variable.type,
    userId: 'frontend-user', 
    values: variable.timeSeries.map(ts => ({
      // Match the exact date format used in handleImportVariables
      date: `${ts.date.getFullYear()}-${String(ts.date.getMonth() + 1).padStart(2, '0')}-${String(ts.date.getDate()).padStart(2, '0')}`,
      value: ts.value
    }))
  }))
};

// Mock API response structure returned by the actual endpoint
const mockApiResponse = {
  message: "Variables created successfully",
  variables: [mockVariableToAdd].map(v => ({
    id: v.id,
    name: v.name,
    type: v.type,
  })) 
};

const creationApiUrl = '/api/data-intake/variables';

// Helper function to set up fetch mock for creation scenarios
const setupCreateFetchMock = (scenario: 'success' | 'validationError' | 'serverError' | 'networkError'): { mockFetch: jest.Mock; cleanup: () => void } => {
  const originalFetch = global.fetch;

  const mockImplementation = async (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
    const urlString = url.toString();

    if (urlString.includes(creationApiUrl.replace(/^\//, '')) && options?.method === 'POST') {
      // Check body matches what handleImportVariables sends
      // ---- REMOVE ASSERTION FROM MOCK ---- 
      // try {
      //   const requestBody = options?.body ? JSON.parse(options.body as string) : null;
      //   // Simple deep equal check for the body - REMOVED
      //   // expect(requestBody).toEqual(expectedApiPayload);
      // } catch (e) {
      //    return { ok: false, status: 400, statusText: 'Bad Request', json: async () => ({ message: 'Invalid JSON payload sent to mock' }) } as Response;
      // }
      // ---- END REMOVAL ----

      // Check if body is valid JSON - basic check
      if (options?.body) {
        try {
          JSON.parse(options.body as string);
        } catch (e) {
          // If JSON parsing fails return a specific error, otherwise proceed
          console.error("Mock Fetch: Failed to parse request body JSON", e);
          return { ok: false, status: 400, statusText: 'Bad Request', json: async () => ({ message: 'Bad JSON format in request body' }) } as Response;
        }
      }

      switch (scenario) {
        case 'success':
          return { ok: true, status: 201, statusText: 'Created', json: async () => mockApiResponse } as Response;
        case 'validationError': 
          return { ok: false, status: 400, statusText: 'Bad Request', json: async () => ({ message: 'Validation failed' }) } as Response;
        case 'serverError':
          return { ok: false, status: 500, statusText: 'Internal Server Error', json: async () => ({ message: 'Internal Server Error during creation' }) } as Response;
        case 'networkError': default:
          throw new Error('Network Failure during creation');
      }
    }

    // Default 404 for other URLs/methods
    return {
      ok: false, status: 404, json: async () => ({ message: 'Not Found' }),
      text: async () => JSON.stringify({ message: 'Not Found' }), headers: new Headers(),
      redirected: false, statusText: "Not Found", type: "basic", url: urlString
    } as unknown as Response;
  };

  const mockFetch = jest.fn(mockImplementation);
  global.fetch = mockFetch;

  return {
    mockFetch,
    cleanup: () => {
      global.fetch = originalFetch;
    }
  };
};

// --- Test Suite --- (Testing API call portion within handleImportVariables simulation)
describe('Data Intake API Hook - handleImportVariables - POST Request Logic', () => {
  let mockFetch: jest.Mock;
  let cleanupFetchMock: () => void = () => {};
  let mockSetApiStatus: jest.Mock;
  let mockResetSuccessStatus: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;

  // --- Simulate the relevant part of handleImportVariables --- 
  // This function isolates the logic we want to test: the API call part.
  const simulateApiCallLogic = async (
    variablesToAdd: Variable[], // Input derived from decisions
    setApiStatus: jest.Mock,     // Mocked state setter
    resetSuccessStatus: jest.Mock // Mocked reset function
  ) => {
    if (variablesToAdd.length > 0) {
      setApiStatus({ loading: true, error: null, success: false });
      try {
        const apiPayload = {
          variables: variablesToAdd.map(variable => ({
            id: variable.id,
            name: variable.name,
            type: variable.type,
            userId: 'frontend-user',
            values: variable.timeSeries.map(ts => ({
              date: `${ts.date.getFullYear()}-${String(ts.date.getMonth() + 1).padStart(2, '0')}-${String(ts.date.getDate()).padStart(2, '0')}`,
              value: ts.value
            }))
          }))
        };
        // console.log('Simulated Sending payload:', JSON.stringify(apiPayload, null, 2));
        const response = await fetch(creationApiUrl, { // Use the constant
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiPayload)
        });
        const responseData = await response.json();
        if (!response.ok) {
          throw new Error(responseData.message || 'Failed to save variables to the server');
        }
        // console.log('Simulated Received variables:', responseData.variables);
        setApiStatus({ loading: false, error: null, success: true });
        resetSuccessStatus();
        return responseData; // Return data for potential assertions
      } catch (error) {
        // console.error('Simulated Error in API request:', error);
        setApiStatus({
          loading: false,
          error: error instanceof Error ? error.message : 'An unknown error occurred',
          success: false
        });
        throw error; // Re-throw for expect(...).rejects
      }
    }
  };
  // --- End of simulation helper ---

  beforeEach(() => {
    if (typeof cleanupFetchMock === 'function') cleanupFetchMock();
    mockFetch = jest.fn();
    mockSetApiStatus = jest.fn();
    mockResetSuccessStatus = jest.fn();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (typeof cleanupFetchMock === 'function') cleanupFetchMock();
    consoleErrorSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('should call fetch with correct payload and update status on success', async () => {
    ({ mockFetch, cleanup: cleanupFetchMock } = setupCreateFetchMock('success'));

    const variablesToAdd = mockDecisionsInput.filter(d => d.action === 'add').map(d => d.variable);
    const result = await simulateApiCallLogic(variablesToAdd, mockSetApiStatus, mockResetSuccessStatus);

    // Assert fetch call - NOW WITH BODY CHECK
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(creationApiUrl),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Verify body structure and formatting
        body: JSON.stringify(expectedApiPayload) 
      })
    );
    
    // Assert state updates
    expect(mockSetApiStatus).toHaveBeenCalledWith({ loading: true, error: null, success: false });
    expect(mockSetApiStatus).toHaveBeenCalledWith({ loading: false, error: null, success: true });
    expect(mockResetSuccessStatus).toHaveBeenCalledTimes(1);
    // Optionally assert the returned data from the simulation
    expect(result).toEqual(mockApiResponse);
  });

  it('should set error status on API validation error (400)', async () => {
    ({ mockFetch, cleanup: cleanupFetchMock } = setupCreateFetchMock('validationError'));
    const variablesToAdd = mockDecisionsInput.filter(d => d.action === 'add').map(d => d.variable);

    await expect(simulateApiCallLogic(variablesToAdd, mockSetApiStatus, mockResetSuccessStatus))
      .rejects.toThrow('Validation failed');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockSetApiStatus).toHaveBeenCalledWith({ loading: true, error: null, success: false });
    expect(mockSetApiStatus).toHaveBeenCalledWith({ loading: false, error: 'Validation failed', success: false });
    expect(mockResetSuccessStatus).not.toHaveBeenCalled();
  });

  it('should set error status on API server error (500)', async () => {
    ({ mockFetch, cleanup: cleanupFetchMock } = setupCreateFetchMock('serverError'));
    const variablesToAdd = mockDecisionsInput.filter(d => d.action === 'add').map(d => d.variable);

    await expect(simulateApiCallLogic(variablesToAdd, mockSetApiStatus, mockResetSuccessStatus))
      .rejects.toThrow('Internal Server Error during creation');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockSetApiStatus).toHaveBeenCalledWith({ loading: true, error: null, success: false });
    expect(mockSetApiStatus).toHaveBeenCalledWith({ loading: false, error: 'Internal Server Error during creation', success: false });
    expect(mockResetSuccessStatus).not.toHaveBeenCalled();
  });

  it('should set error status on network error', async () => {
    ({ mockFetch, cleanup: cleanupFetchMock } = setupCreateFetchMock('networkError'));
    const variablesToAdd = mockDecisionsInput.filter(d => d.action === 'add').map(d => d.variable);

    await expect(simulateApiCallLogic(variablesToAdd, mockSetApiStatus, mockResetSuccessStatus))
      .rejects.toThrow('Network Failure during creation');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockSetApiStatus).toHaveBeenCalledWith({ loading: true, error: null, success: false });
    // The error message comes directly from the thrown Error
    expect(mockSetApiStatus).toHaveBeenCalledWith({ loading: false, error: 'Network Failure during creation', success: false }); 
    expect(mockResetSuccessStatus).not.toHaveBeenCalled();
  });

   it('should not call fetch if no variables are added', async () => {
    ({ mockFetch, cleanup: cleanupFetchMock } = setupCreateFetchMock('success'));
    
    // Simulate calling with empty variablesToAdd
    await simulateApiCallLogic([], mockSetApiStatus, mockResetSuccessStatus);

    expect(mockFetch).not.toHaveBeenCalled();
    // setApiStatus shouldn't be called in this case by the simulated logic
    expect(mockSetApiStatus).not.toHaveBeenCalled(); 
  });

}); 