import { PUT, POST } from '../route'; // Adjust the import path if necessary

// Mock next/server before any other imports or code
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      json: async () => body, // Return the body passed to NextResponse.json
      status: init?.status || 200,
      ok: (init?.status || 200) >= 200 && (init?.status || 200) < 300,
      headers: new Headers(init?.headers),
      // Add other properties if needed by tests
    })),
    redirect: jest.fn((url) => ({
        status: 307, // Typical redirect status
        headers: new Headers({ Location: url.toString() }),
        json: async () => ({}), // Dummy json method for redirects
    })),
  },
}));

// Mock the fetch function
global.fetch = jest.fn();

// Helper to create a mock Request-like object
const createMockRequest = (method: string, body?: any): Request => {
  const url = 'http://localhost/api/data-intake/variables';
  const request = {
    method: method,
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
    url: url,
    json: async () => (body ? JSON.parse(JSON.stringify(body)) : null),
    // Add other methods/properties if needed by handlers
  } as Request; // Cast to Request type for compatibility
  return request;
};

describe('API Route: /api/data-intake/variables', () => {
  beforeEach(() => {
    // Reset mocks before each test
    (fetch as jest.Mock).mockClear();
    // Set default successful fetch mock
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ message: 'Success' }),
      text: async () => JSON.stringify({ message: 'Success' }),
    });
    // Set process.env.BACKEND_URL
    process.env.BACKEND_URL = 'http://mock-backend:3001';
  });

  afterEach(() => {
    delete process.env.BACKEND_URL;
  });

  describe('PUT Handler', () => {
    it('should forward the PUT request to the backend and return the response', async () => {
      const mockRequestBody = {
        variables: [
          { id: 'uuid-1', name: 'Updated Revenue', type: 'ACTUAL', timeSeries: [] },
          { id: 'uuid-2', name: 'Updated Expenses', type: 'BUDGET', timeSeries: [] },
        ],
      };
      const mockBackendResponse = { updatedCount: 2 };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockBackendResponse,
        text: async () => JSON.stringify(mockBackendResponse),
      });

      const req = createMockRequest('PUT', mockRequestBody);
      const response = await PUT(req);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody).toEqual(mockBackendResponse);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        `${process.env.BACKEND_URL}/data-intake/variables`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockRequestBody),
        }
      );
    });

    it('should return 400 if the request body is missing the variables array', async () => {
      const req = createMockRequest('PUT', { someOtherData: 'value' });
      const response = await PUT(req);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.message).toContain('Request must include a non-empty variables array');
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should return 400 if the variables array is empty', async () => {
        const req = createMockRequest('PUT', { variables: [] });
        const response = await PUT(req);
        const responseBody = await response.json();

        expect(response.status).toBe(400);
        expect(responseBody.message).toContain('Request must include a non-empty variables array');
        expect(fetch).not.toHaveBeenCalled();
      });

    it('should return the backend error response if the fetch fails', async () => {
      const mockErrorResponse = { message: 'Backend validation failed' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockErrorResponse,
        text: async () => JSON.stringify(mockErrorResponse),
      });

      const req = createMockRequest('PUT', { variables: [{ id: '1' }] }); // Provide minimal valid body
      const response = await PUT(req);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody).toEqual(mockErrorResponse);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should return 502 if the backend connection fails', async () => {
      const connectionError = new Error('Failed to connect');
      (fetch as jest.Mock).mockRejectedValueOnce(connectionError);

      // Temporarily mock console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const req = createMockRequest('PUT', { variables: [{ id: '1' }] }); // Provide minimal valid body
      const response = await PUT(req);
      const responseBody = await response.json();

      // Restore console.error
      consoleErrorSpy.mockRestore();

      expect(response.status).toBe(502);
      expect(responseBody.message).toBe(connectionError.message);
      expect(responseBody.details).toContain('Could not connect to the backend server');
      expect(fetch).toHaveBeenCalledTimes(1);
    });

     it('should handle non-JSON backend responses gracefully on success', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => 'Update processed successfully', // Non-JSON text
        });

        // Temporarily mock console.error
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const req = createMockRequest('PUT', { variables: [{ id: '1' }] });
        const response = await PUT(req);
        const responseBody = await response.json();

        // Restore console.error
        consoleErrorSpy.mockRestore();

        expect(response.status).toBe(200);
        expect(responseBody).toEqual({ message: 'Update successful' });
        expect(fetch).toHaveBeenCalledTimes(1);
     });

     it('should handle non-JSON backend responses gracefully on failure', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 500,
            text: async () => 'Internal Server Error Text', // Non-JSON text
        });

        // Temporarily mock console.error
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const req = createMockRequest('PUT', { variables: [{ id: '1' }] });
        const response = await PUT(req);
        const responseBody = await response.json();

        // Restore console.error
        consoleErrorSpy.mockRestore();

        expect(response.status).toBe(500);
        expect(responseBody).toEqual({ message: 'Failed to parse backend error response' });
        expect(fetch).toHaveBeenCalledTimes(1);
     });


    // Add more tests for edge cases if necessary
  });
}); 