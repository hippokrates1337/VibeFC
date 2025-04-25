import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SupabaseService } from '../../supabase/supabase.service';

// Mock SupabaseService
const mockSupabaseService = {
  client: {
    auth: {
      getUser: jest.fn(),
    },
  },
};

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);

    // Reset mocks
    mockSupabaseService.client.auth.getUser.mockClear();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  // Helper to create a mock ExecutionContext
  const createMockExecutionContext = (request: any = {}): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as any);

  describe('canActivate', () => {
    it('should return true with valid token', async () => {
      // Arrange
      const mockUser = { id: 'user-id', email: 'test@example.com' };
      const mockToken = 'valid.jwt.token';
      const mockRequest: any = {
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      };
      const context = createMockExecutionContext(mockRequest);
      
      // Mock Supabase getUser to return success
      mockSupabaseService.client.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      
      // Act
      const result = await guard.canActivate(context);
      
      // Assert
      expect(result).toBe(true);
      expect(mockSupabaseService.client.auth.getUser).toHaveBeenCalledWith(mockToken);
      expect(mockRequest.user).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when authorization header is missing', async () => {
      // Arrange
      const context = createMockExecutionContext({ headers: {} });
      
      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      expect(mockSupabaseService.client.auth.getUser).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when token format is invalid', async () => {
      // Arrange
      const context = createMockExecutionContext({
        headers: {
          authorization: 'InvalidTokenFormat',
        },
      });
      
      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      expect(mockSupabaseService.client.auth.getUser).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when token verification fails', async () => {
      // Arrange
      const mockToken = 'invalid.jwt.token';
      const context = createMockExecutionContext({
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      });
      
      // Mock Supabase getUser to return error
      mockSupabaseService.client.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });
      
      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      expect(mockSupabaseService.client.auth.getUser).toHaveBeenCalledWith(mockToken);
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      // Arrange
      const mockToken = 'valid.but.no.user.token';
      const context = createMockExecutionContext({
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      });
      
      // Mock Supabase getUser to return success but no user
      mockSupabaseService.client.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });
      
      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      expect(mockSupabaseService.client.auth.getUser).toHaveBeenCalledWith(mockToken);
    });
  });
}); 