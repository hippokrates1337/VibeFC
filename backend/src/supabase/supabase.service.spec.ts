import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from './supabase.service';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Logger, UnauthorizedException, INestApplication } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

// Define the interface inline for the test file or import if shared
interface RequestWithUser extends Request {
  user?: {
    userId: string;
    organizationId?: string;
    [key: string]: any;
  };
  headers: {
    authorization?: string;
    [key: string]: any; // Ensure other headers can exist
  };
}


// Mock the Supabase client
const mockSupabaseClientInstance = {
  // Add mocks for any methods you might call on the client in actual usage tests later
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  // ... other methods
};

// Mock the createClient function itself
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClientInstance),
}));

// Mock Logger methods (optional, can be useful)
Logger.prototype.log = jest.fn();
Logger.prototype.error = jest.fn();
Logger.prototype.warn = jest.fn();
Logger.prototype.debug = jest.fn();


describe('SupabaseService', () => {
  let service: SupabaseService;
  let configService: ConfigService;
  let mockRequest: Partial<RequestWithUser>; // Use Partial for easier mocking

  const mockSupabaseUrl = 'http://test-url.com';
  const mockSupabaseAnonKey = 'test-anon-key';
  const mockJwt = 'mock-jwt-token';

  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Set test environment by default for most tests
    process.env.IS_TEST_ENVIRONMENT = 'true';

    // Default mock request - customize in specific tests if needed
    mockRequest = {
      headers: {
        authorization: `Bearer ${mockJwt}`,
      },
      user: { userId: 'test-user-123', organizationId: 'test-org-456' }
      // Add other request properties if your service uses them
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'SUPABASE_URL') return mockSupabaseUrl;
              if (key === 'SUPABASE_ANON_KEY') return mockSupabaseAnonKey;
              if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'test-service-role-key';
              return null;
            }),
          },
        },
        {
          provide: REQUEST,
          useValue: mockRequest, // Provide the mocked request object
        },
      ],
    }).compile();

    // IMPORTANT: Because it's request-scoped, get the service instance from the module context
    // Use resolve instead of get for request-scoped providers
    service = await module.resolve<SupabaseService>(SupabaseService);
    configService = module.get<ConfigService>(ConfigService); // ConfigService is likely a singleton, so get is fine
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('client getter', () => {
    it('should initialize Supabase client with correct credentials and auth header on first access', () => {
      const client = service.client; // Access the getter

      expect(client).toBe(mockSupabaseClientInstance); // Should return the mocked instance
      expect(createClient).toHaveBeenCalledTimes(1);
      expect(createClient).toHaveBeenCalledWith(
        mockSupabaseUrl,
        'test-service-role-key', // In test environment with user, uses service role key
        expect.objectContaining({
          global: {
            headers: { Authorization: `Bearer ${mockJwt}` },
          },
          auth: expect.objectContaining({ // Check auth options if specific ones are important
             autoRefreshToken: false,
             persistSession: false,
           }),
        }),
      );
      // Check config service calls
      expect(configService.get).toHaveBeenCalledWith('SUPABASE_URL');
      expect(configService.get).toHaveBeenCalledWith('SUPABASE_SERVICE_ROLE_KEY');
      expect(Logger.prototype.log).toHaveBeenCalledWith('Test environment with user test-user-123 - creating authenticated client');
    });

    it('should return the same client instance on subsequent accesses', () => {
      const client1 = service.client;
      const client2 = service.client;

      expect(client1).toBe(mockSupabaseClientInstance);
      expect(client2).toBe(client1); // Should be the same instance
      expect(createClient).toHaveBeenCalledTimes(1); // createClient only called once
    });

    it('should throw error if SUPABASE_URL is not provided', () => {
      // Override mock config for this test
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'SUPABASE_ANON_KEY') return mockSupabaseAnonKey;
        return null; // Simulate missing URL
      });

      expect(() => service.client).toThrow('Supabase credentials are not properly configured.');
      expect(Logger.prototype.error).toHaveBeenCalledWith('Supabase URL or API keys not configured');
      expect(createClient).not.toHaveBeenCalled();
    });

    it('should throw error if SUPABASE_ANON_KEY is not provided', () => {
       // Override mock config for this test
       (configService.get as jest.Mock).mockImplementation((key: string) => {
         if (key === 'SUPABASE_URL') return mockSupabaseUrl;
         return null; // Simulate missing Key
       });

       expect(() => service.client).toThrow('Supabase credentials are not properly configured.');
       expect(Logger.prototype.error).toHaveBeenCalledWith('Supabase URL or API keys not configured');
       expect(createClient).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if Authorization header is missing', async () => {
      // Need to disable test environment for this specific test
      process.env.IS_TEST_ENVIRONMENT = 'false';
      
      // Modify the request mock for this specific test case
      const moduleRef = await Test.createTestingModule({
         providers: [
           SupabaseService,
           { provide: ConfigService, useValue: configService }, // Use the existing mocked config
           { provide: REQUEST, useValue: { headers: {} } }, // No auth header
         ],
       }).compile();
      // Use resolve for the scoped service within this custom context
      const serviceWithNoAuth = await moduleRef.resolve<SupabaseService>(SupabaseService);


      expect(() => serviceWithNoAuth.client).toThrow(UnauthorizedException);
      expect(() => serviceWithNoAuth.client).toThrow('Authorization token is missing or invalid.');
      expect(Logger.prototype.warn).toHaveBeenCalledWith('Attempted to create Supabase client without Authorization header.');
      expect(createClient).not.toHaveBeenCalled();
      
      // Re-enable test environment for other tests
      process.env.IS_TEST_ENVIRONMENT = 'true';
    });

    it('should throw UnauthorizedException if Authorization header is not Bearer', async () => {
       // Need to disable test environment for this specific test
       process.env.IS_TEST_ENVIRONMENT = 'false';
       
       // Modify the request mock for this specific test case
       const moduleRef = await Test.createTestingModule({
         providers: [
           SupabaseService,
           { provide: ConfigService, useValue: configService }, // Use the existing mocked config
           { provide: REQUEST, useValue: { headers: { authorization: 'Basic someauth' } } }, // Wrong scheme
         ],
       }).compile();
        // Use resolve for the scoped service within this custom context
       const serviceWithWrongAuth = await moduleRef.resolve<SupabaseService>(SupabaseService);

       expect(() => serviceWithWrongAuth.client).toThrow(UnauthorizedException);
       expect(() => serviceWithWrongAuth.client).toThrow('Authorization token is missing or invalid.');
       expect(Logger.prototype.warn).toHaveBeenCalledWith('Attempted to create Supabase client without Authorization header.');
       expect(createClient).not.toHaveBeenCalled();
       
       // Re-enable test environment for other tests
       process.env.IS_TEST_ENVIRONMENT = 'true';
    });
    
    it('should create a test client in test environment with user', async () => {
      // Ensure test environment is enabled
      process.env.IS_TEST_ENVIRONMENT = 'true';
      
      // Create a request with a user object for test environment
      const testRequestWithUser = {
        headers: {},
        user: { userId: 'test-user-123', organizationId: 'test-org-456' }
      };
      
      // Modify the request mock for this specific test case
      const moduleRef = await Test.createTestingModule({
        providers: [
          SupabaseService,
          { provide: ConfigService, useValue: configService }, // Use the existing mocked config
          { provide: REQUEST, useValue: testRequestWithUser }, // Request with user in test mode
        ],
      }).compile();
      
      // Use resolve for the scoped service within this custom context
      const testService = await moduleRef.resolve<SupabaseService>(SupabaseService);
      
      // This should not throw in test environment
      const client = testService.client;
      expect(client).toBeDefined();
      expect(createClient).toHaveBeenCalledWith(
        mockSupabaseUrl,
        'test-service-role-key', // Should use service role key in test environment
        expect.objectContaining({
          auth: expect.objectContaining({
            autoRefreshToken: false,
            persistSession: false,
          }),
        })
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith('Test environment with user test-user-123 - creating authenticated client');
    });

    it('should create anonymous client in test environment without user', async () => {
      // Ensure test environment is enabled
      process.env.IS_TEST_ENVIRONMENT = 'true';
      
             // Create a request without user object for test environment
       const testRequestWithoutUser = {
         headers: {},
         // No user object
       };
      
      // Modify the request mock for this specific test case
      const moduleRef = await Test.createTestingModule({
        providers: [
          SupabaseService,
          { provide: ConfigService, useValue: configService }, // Use the existing mocked config
          { provide: REQUEST, useValue: testRequestWithoutUser }, // Request without user in test mode
        ],
      }).compile();
      
      // Use resolve for the scoped service within this custom context
      const testService = await moduleRef.resolve<SupabaseService>(SupabaseService);
      
      // This should not throw in test environment
      const client = testService.client;
      expect(client).toBeDefined();
      expect(createClient).toHaveBeenCalledWith(
        mockSupabaseUrl,
        'test-service-role-key', // Should use service role key in test environment
        expect.objectContaining({
          auth: expect.objectContaining({
            autoRefreshToken: false,
            persistSession: false,
          }),
        })
      );
      expect(Logger.prototype.warn).toHaveBeenCalledWith('Test environment but no user in request - creating anonymous client');
    });
  });

  // Remove describe blocks for 'onModuleInit' and 'testConnection' as they no longer exist
}); 