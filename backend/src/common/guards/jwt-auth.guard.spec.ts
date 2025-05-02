import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

// Define the mock function before using it in jest.mock
const mockGetUser = jest.fn();

// Mock createClient and ensure its structure matches usage
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockImplementation(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  // Mock ConfigService
  const mockConfigService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'SUPABASE_URL':
          return 'http://mock-supabase-url.com';
        case 'SUPABASE_ANON_KEY':
          return 'mock-supabase-anon-key';
        default:
          return null;
      }
    }),
  };

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    // Get a fresh reference to the mock getUser function
    mockGetUser.mockClear();
    (createClient as jest.Mock).mockImplementation(() => ({
      auth: {
        getUser: mockGetUser,
      },
    }));

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [
        JwtAuthGuard,
      ],
    })
    .overrideProvider(ConfigService)
    .useValue(mockConfigService)
    .compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);

    // Reset mocks for getUser specifically after guard instantiation if needed
    // mockGetUser.mockClear(); // Usually cleared in jest.clearAllMocks() but good practice
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(mockConfigService.get).toHaveBeenCalledWith('SUPABASE_URL');
    expect(mockConfigService.get).toHaveBeenCalledWith('SUPABASE_ANON_KEY');
  });

  // Helper to create a mock ExecutionContext
  const createMockExecutionContext = (headers: Record<string, string> = {}): ExecutionContext => {
    const mockRequest = { headers }; // Create the request object once
    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest, // Always return the same request object instance
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as any;
  };

  describe('canActivate', () => {
    it('should return true and attach user to request with valid token', async () => {
      // Arrange
      const mockUser = { id: 'user-id', email: 'test@example.com' };
      const mockToken = 'valid.jwt.token';
      const mockRequestHeaders = { authorization: `Bearer ${mockToken}` };
      const context = createMockExecutionContext(mockRequestHeaders);
      const mockRequest = context.switchToHttp().getRequest();
      
      // Mock Supabase getUser to return success
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      
      // Act
      const result = await guard.canActivate(context);
      
      // Assert
      expect(result).toBe(true);
      expect(mockGetUser).toHaveBeenCalledTimes(1);
      expect(mockGetUser).toHaveBeenCalledWith(mockToken);
      expect(mockRequest.user).toEqual({ 
        id: mockUser.id, 
        userId: mockUser.id, 
        email: mockUser.email 
      });
    });

    it('should throw UnauthorizedException when authorization header is missing', async () => {
      // Arrange
      const context = createMockExecutionContext({});
      
      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Missing or invalid authorization token');
      expect(mockGetUser).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when token format is invalid (not Bearer)', async () => {
      // Arrange
      const context = createMockExecutionContext({ authorization: 'InvalidTokenFormat' });
      
      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Missing or invalid authorization token');
      expect(mockGetUser).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when token verification fails (Supabase error)', async () => {
      // Arrange
      const mockToken = 'invalid.jwt.token';
      const context = createMockExecutionContext({ authorization: `Bearer ${mockToken}` });
      const mockError = { message: 'Invalid token signature' };
      
      // Mock Supabase getUser to return error
      mockGetUser.mockResolvedValue({ data: { user: null }, error: mockError });
      
      // Act & Assert
      try {
        await guard.canActivate(context);
        fail('Should have thrown UnauthorizedException');
      } catch (e) {
        expect(e).toBeInstanceOf(UnauthorizedException);
        expect(e.message).toBe('Invalid token');
      }
      expect(mockGetUser).toHaveBeenCalledTimes(1);
      expect(mockGetUser).toHaveBeenCalledWith(mockToken);
    });

    it('should throw UnauthorizedException when user is not found (valid token, no user)', async () => {
      // Arrange
      const mockToken = 'valid.but.no.user.token';
      const context = createMockExecutionContext({ authorization: `Bearer ${mockToken}` });
      
      // Mock Supabase getUser to return success but no user
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      
      // Act & Assert
      try {
         await guard.canActivate(context);
         fail('Should have thrown UnauthorizedException');
       } catch (e) {
         expect(e).toBeInstanceOf(UnauthorizedException);
         expect(e.message).toBe('User not found for token');
       }
      expect(mockGetUser).toHaveBeenCalledTimes(1);
      expect(mockGetUser).toHaveBeenCalledWith(mockToken);
    });
  });
}); 