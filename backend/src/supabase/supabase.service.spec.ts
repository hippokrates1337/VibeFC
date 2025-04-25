import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from './supabase.service';
import { createClient } from '@supabase/supabase-js';
import { Logger } from '@nestjs/common';

// Mock the Supabase client creation and specific method chains
const mockLimit = jest.fn();
const mockVariablesSelect = jest.fn().mockReturnValue({ limit: mockLimit });
const mockGenericSelect = jest.fn(); // For other selects if needed

const mockFrom = jest.fn((tableName: string) => {
  if (tableName === 'variables') {
    return { select: mockVariablesSelect };
  }
  // Fallback for other tables if service is extended
  return { select: mockGenericSelect }; 
});

const mockSupabaseClient = {
  from: mockFrom,
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

// Mock Logger methods
Logger.prototype.log = jest.fn();
Logger.prototype.error = jest.fn();

describe('SupabaseService', () => {
  let service: SupabaseService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'SUPABASE_URL') return 'http://test-url.com';
      if (key === 'SUPABASE_KEY') return 'test-key';
      return null;
    }),
  };

  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SupabaseService>(SupabaseService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize supabase client with correct credentials and options', async () => {
      // Mock the testConnection call chain specifically for this test
      mockLimit.mockResolvedValueOnce({ error: null }); 

      await service.onModuleInit();
      expect(mockConfigService.get).toHaveBeenCalledWith('SUPABASE_URL');
      expect(mockConfigService.get).toHaveBeenCalledWith('SUPABASE_KEY');
      expect(createClient).toHaveBeenCalledWith(
        'http://test-url.com',
        'test-key',
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        },
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith('Supabase client initialized with service_role key (bypasses RLS)');
      expect(Logger.prototype.log).toHaveBeenCalledWith('Successfully connected to Supabase');
    });

    it('should call testConnection on initialization', async () => {
      // Mock the testConnection call chain specifically for this test
      mockLimit.mockResolvedValueOnce({ error: null }); 
      const testConnectionSpy = jest.spyOn(service, 'testConnection');
      await service.onModuleInit();
      expect(testConnectionSpy).toHaveBeenCalled();
    });

    it('should throw error if Supabase credentials are not provided', async () => {
      mockConfigService.get.mockReturnValueOnce(null); // Simulate missing URL
      await expect(service.onModuleInit()).rejects.toThrow(
        'Supabase credentials are not provided in environment variables',
      );
      expect(Logger.prototype.error).not.toHaveBeenCalled(); // Error before logging connection attempt
    });

    it('should log and throw error if testConnection fails during init', async () => {
      const testError = new Error('Connection failed');
      // Instead of mocking testConnection, mock the underlying DB call it makes
      mockLimit.mockResolvedValueOnce({ error: testError }); // Simulate DB returning error

      await expect(service.onModuleInit()).rejects.toThrow('Database connection test failed: Connection failed');
      // The service now logs the specific DB error message inside testConnection
      expect(Logger.prototype.error).toHaveBeenCalledWith(`Database connection test failed: ${testError.message}`);
      // And logs the failure to connect in onModuleInit
      expect(Logger.prototype.error).toHaveBeenCalledWith(`Failed to connect to Supabase: Database connection test failed: ${testError.message}`);
    });
  });

  describe('client', () => {
    it('should return the initialized supabase client instance', async () => {
      // Mock the testConnection call chain for initialization
      mockLimit.mockResolvedValueOnce({ error: null }); 
      await service.onModuleInit(); // Ensure client is initialized
      expect(service.client).toBe(mockSupabaseClient);
    });

     it('should return undefined if client is accessed before initialization', () => {
      // Accessing client directly without init might not be possible if private
      // If SupabaseService is instantiated outside Nest lifecycle (unlikely)
      let uninitializedService = new SupabaseService(configService);
      // The getter might still exist, but the internal client is undefined
      expect(uninitializedService.client).toBeUndefined(); 
    });
  });

  describe('testConnection', () => {
    beforeEach(async () => {
      // Need to init the client before testing testConnection directly
      // Re-initialize service instance to get fresh mocks if needed, or clear mocks
      // await service.onModuleInit(); // Ensure client is initialized via lifecycle
      
      // Clear mocks before each test in this suite
      mockFrom.mockClear();
      mockVariablesSelect.mockClear();
      mockLimit.mockClear();
      // Ensure the service's internal client is the mocked one (should be via module setup)
      // We assume the service has been initialized correctly by the test module setup
      if (!service || !service.client) {
        // Initialize if not done by outer beforeEach (e.g. if running tests selectively)
        mockLimit.mockResolvedValueOnce({ error: null }); // Mock for testConnection during init
        const module: TestingModule = await Test.createTestingModule({
             providers: [
               SupabaseService,
               { provide: ConfigService, useValue: mockConfigService },
             ],
           }).compile();
        service = module.get<SupabaseService>(SupabaseService);
        await service.onModuleInit(); // Manually trigger init if needed
      }
    });

    it('should return true if connection is successful', async () => {
      // Ensure the mock is set for this specific call
      mockLimit.mockResolvedValueOnce({ error: null }); // testConnection only checks error
      const result = await service.testConnection();
      expect(result).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith('variables');
      expect(mockVariablesSelect).toHaveBeenCalledWith('id');
      expect(mockLimit).toHaveBeenCalledWith(1);
      expect(Logger.prototype.error).not.toHaveBeenCalled();
    });

    it('should throw and log error if Supabase returns an error', async () => {
      const dbError = { message: 'Database connection error', code: '500' };
      // Ensure the mock is set for this specific call
      mockLimit.mockResolvedValueOnce({ data: null, error: dbError });

      await expect(service.testConnection()).rejects.toThrow(
        `Database connection test failed: ${dbError.message}`,
      );
      expect(mockFrom).toHaveBeenCalledWith('variables');
      expect(mockVariablesSelect).toHaveBeenCalledWith('id');
      expect(mockLimit).toHaveBeenCalledWith(1);
      expect(Logger.prototype.error).toHaveBeenCalledWith(`Database connection test failed: ${dbError.message}`);
    });

    it('should throw and log error if the client query throws', async () => {
      const queryError = new Error('Network error');
      // Mock the limit call itself throwing
      mockLimit.mockRejectedValueOnce(queryError); 

      await expect(service.testConnection()).rejects.toThrow(queryError);
      expect(mockFrom).toHaveBeenCalledWith('variables');
      expect(mockVariablesSelect).toHaveBeenCalledWith('id');
      expect(mockLimit).toHaveBeenCalledWith(1);
      expect(Logger.prototype.error).toHaveBeenCalledWith(`Connection test failed: ${queryError.message}`);
    });
  });
}); 