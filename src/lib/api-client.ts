import { Organization, OrganizationMember } from '@/lib/supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Define response types
interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    statusCode?: number;
  };
}

// Helper function to get token from cookie
function getAuthToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'sb-access-token') {
      return value;
    }
  }
  return undefined;
}

// Helper function for API requests with auth token
async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    
    const token = getAuthToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error: {
          message: data.message || 'An error occurred',
          statusCode: response.status,
        },
      };
    }

    return { data };
  } catch (error: any) {
    return {
      error: {
        message: error.message || 'Network error',
      },
    };
  }
}

// Organization API Endpoints
export const organizationApi = {
  // Get all organizations for the current user
  getOrganizations: async (): Promise<ApiResponse<Organization[]>> => {
    return fetchWithAuth<Organization[]>('/organizations', {
      method: 'GET',
    });
  },

  // Get a specific organization
  getOrganization: async (orgId: string): Promise<ApiResponse<Organization>> => {
    return fetchWithAuth<Organization>(`/organizations/${orgId}`, {
      method: 'GET',
    });
  },

  // Create a new organization
  createOrganization: async (name: string): Promise<ApiResponse<Organization>> => {
    return fetchWithAuth<Organization>('/organizations', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  // Update an organization
  updateOrganization: async (orgId: string, name: string): Promise<ApiResponse<Organization>> => {
    return fetchWithAuth<Organization>(`/organizations/${orgId}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  },

  // Delete an organization
  deleteOrganization: async (orgId: string): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/organizations/${orgId}`, {
      method: 'DELETE',
    });
  },

  // Get members of an organization
  getMembers: async (orgId: string): Promise<ApiResponse<OrganizationMember[]>> => {
    return fetchWithAuth<OrganizationMember[]>(`/organizations/${orgId}/members`, {
      method: 'GET',
    });
  },

  // Add a member to an organization
  addMember: async (orgId: string, email: string, role: string): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/organizations/${orgId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });
  },

  // Update a member's role
  updateMemberRole: async (orgId: string, userId: string, role: string): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/organizations/${orgId}/members/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },

  // Remove a member from an organization
  removeMember: async (orgId: string, userId: string): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/organizations/${orgId}/members/${userId}`, {
      method: 'DELETE',
    });
  },
}; 