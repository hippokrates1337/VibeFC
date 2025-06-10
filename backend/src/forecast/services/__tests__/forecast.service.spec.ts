import { Test, TestingModule } from '@nestjs/testing';
import { ForecastService } from '../forecast.service';
import { SupabaseOptimizedService } from '../../../supabase/supabase-optimized.service';
import { PerformanceService } from '../../../common/services/performance.service';
import { Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { CreateForecastDto, UpdateForecastDto, ForecastDto } from '../../dto/forecast.dto';

// Mock Supabase client methods
const mockSupabaseInsert = jest.fn();
const mockSupabaseSelect = jest.fn();
const mockSupabaseUpdate = jest.fn();
const mockSupabaseDelete = jest.fn();

const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: mockSupabaseInsert,
  update: mockSupabaseUpdate,
  delete: mockSupabaseDelete,
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
};

// Mock Logger
Logger.prototype.log = jest.fn();
Logger.prototype.error = jest.fn();
Logger.prototype.warn = jest.fn();

describe('ForecastService', () => {
  let service: ForecastService;
  let supabaseService: SupabaseOptimizedService;
  const testUserId = 'test-user-123';
  const testOrgId = 'test-org-123';

  const mockSupabaseService = {
    getClientForRequest: jest.fn().mockReturnValue(mockSupabaseClient),
  };

  // Mock request object
  const mockRequest = {
    headers: { authorization: 'Bearer mock-token' },
    user: { id: 'test-user-123', email: 'test@example.com' }
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset specific mocks for chaining
    mockSupabaseClient.from.mockImplementation(() => {
      return {
        select: mockSupabaseSelect,
        insert: mockSupabaseInsert,
        update: mockSupabaseUpdate,
        delete: mockSupabaseDelete,
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
      };
    });

    mockSupabaseSelect.mockReturnValue({
      eq: jest.fn().mockReturnThis(),
      filter: jest.fn().mockReturnThis(),
      match: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    mockSupabaseInsert.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'new-forecast-id' }, error: null })
    });

    mockSupabaseUpdate.mockReturnValue({
      eq: jest.fn().mockReturnThis(),
      match: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'updated-forecast-id' }, error: null })
    });

    mockSupabaseDelete.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ count: 1, error: null }),
      match: jest.fn().mockResolvedValue({ count: 1, error: null }),
    });

    const mockPerformanceService = {
      measureTime: jest.fn(),
      logPerformance: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForecastService,
        { provide: SupabaseOptimizedService, useValue: mockSupabaseService },
        { provide: PerformanceService, useValue: mockPerformanceService },
        Logger,
      ],
    }).compile();

    service = module.get<ForecastService>(ForecastService);
    supabaseService = module.get<SupabaseOptimizedService>(SupabaseOptimizedService);

    // Clear logger mocks before each test
    (Logger.prototype.log as jest.Mock).mockClear();
    (Logger.prototype.error as jest.Mock).mockClear();
    (Logger.prototype.warn as jest.Mock).mockClear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // --- create Test ---
  describe('create', () => {
    const userId = testUserId;
    const createDto: CreateForecastDto = {
      name: 'New Forecast',
      forecastStartDate: '2023-01-01',
      forecastEndDate: '2023-12-31',
      organizationId: testOrgId
    };
    const newForecast = {
      id: 'new-forecast-id',
      name: 'New Forecast',
      forecast_start_date: '2023-01-01',
      forecast_end_date: '2023-12-31',
      organization_id: testOrgId,
      user_id: userId,
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z'
    };

    it('should create a forecast and return it', async () => {
      // Mock insert to return the new forecast
      const mockInsertSingle = jest.fn().mockResolvedValue({ data: newForecast, error: null });
      mockSupabaseInsert.mockReturnValue({ select: jest.fn().mockReturnThis(), single: mockInsertSingle });

      const result = await service.create(userId, createDto, mockRequest);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('forecasts');
      expect(mockSupabaseInsert).toHaveBeenCalledWith({
        name: createDto.name,
        forecast_start_date: createDto.forecastStartDate,
        forecast_end_date: createDto.forecastEndDate,
        organization_id: createDto.organizationId,
        user_id: userId,
      });
      expect(mockInsertSingle).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        id: newForecast.id,
        name: newForecast.name,
        forecastStartDate: newForecast.forecast_start_date,
        forecastEndDate: newForecast.forecast_end_date,
        organizationId: newForecast.organization_id,
        userId: newForecast.user_id,
        createdAt: new Date(newForecast.created_at),
        updatedAt: new Date(newForecast.updated_at),
      });
      expect(Logger.prototype.log).toHaveBeenCalledWith(`Forecast created successfully via service: ${newForecast.id} by user ${userId}`);
    });

    it('should throw InternalServerErrorException if forecast creation fails', async () => {
      const dbError = { message: 'Insert failed', code: 'DB500' };
      mockSupabaseInsert.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: dbError })
      });

      await expect(service.create(userId, createDto, mockRequest))
        .rejects.toThrow(new InternalServerErrorException(`Failed to create forecast due to database error: ${dbError.message}`));
      expect(Logger.prototype.error).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if insert succeeds but no data is returned', async () => {
      mockSupabaseInsert.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      });

      await expect(service.create(userId, createDto, mockRequest))
        .rejects.toThrow(new InternalServerErrorException('Failed to create forecast, data missing after insert and no explicit error from database.'));
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  // --- findAll Test ---
  describe('findAll', () => {
    const userId = testUserId;
    const organizationId = testOrgId;
    const mockDbResult = [
      {
        id: 'forecast-1',
        name: 'Forecast 1',
        forecast_start_date: '2023-01-01',
        forecast_end_date: '2023-12-31',
        organization_id: organizationId,
        user_id: userId,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z'
      },
      {
        id: 'forecast-2',
        name: 'Forecast 2',
        forecast_start_date: '2023-02-01',
        forecast_end_date: '2023-12-31',
        organization_id: organizationId,
        user_id: userId,
        created_at: '2023-01-02T00:00:00.000Z',
        updated_at: '2023-01-02T00:00:00.000Z'
      }
    ];
    const expectedForecasts = [
      {
        id: 'forecast-1',
        name: 'Forecast 1',
        forecastStartDate: '2023-01-01',
        forecastEndDate: '2023-12-31',
        organizationId: organizationId,
        userId: userId,
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z')
      },
      {
        id: 'forecast-2',
        name: 'Forecast 2',
        forecastStartDate: '2023-02-01',
        forecastEndDate: '2023-12-31',
        organizationId: organizationId,
        userId: userId,
        createdAt: new Date('2023-01-02T00:00:00.000Z'),
        updatedAt: new Date('2023-01-02T00:00:00.000Z')
      }
    ];

    it('should return all forecasts for the specified organization', async () => {
      const mockFilter = jest.fn().mockResolvedValue({ data: mockDbResult, error: null });
      const mockSelectEq = jest.fn().mockReturnValue({ filter: mockFilter });
      mockSupabaseSelect.mockReturnValue({ eq: mockSelectEq });

      const result = await service.findAll(userId, organizationId, mockRequest);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('forecasts');
      expect(mockSupabaseSelect).toHaveBeenCalledWith('*');
      expect(mockSelectEq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(mockFilter).toHaveBeenCalledWith('user_id', 'eq', userId);
      expect(result).toEqual(expectedForecasts);
    });

    it('should throw InternalServerErrorException if DB query fails', async () => {
      const dbError = { message: 'Query failed', code: 'DB500' };
      const mockFilter = jest.fn().mockResolvedValue({ data: null, error: dbError });
      const mockSelectEq = jest.fn().mockReturnValue({ filter: mockFilter });
      mockSupabaseSelect.mockReturnValue({ eq: mockSelectEq });

      await expect(service.findAll(userId, organizationId, mockRequest))
        .rejects.toThrow(new InternalServerErrorException(`Failed to fetch forecasts: ${dbError.message}`));
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  // --- findOne Test ---
  describe('findOne', () => {
    const userId = testUserId;
    const forecastId = 'forecast-123';
    const mockDbResult = {
      id: forecastId,
      name: 'Test Forecast',
      forecast_start_date: '2023-01-01',
      forecast_end_date: '2023-12-31',
      organization_id: testOrgId,
      user_id: userId,
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z'
    };
    const expectedForecast = {
      id: forecastId,
      name: 'Test Forecast',
      forecastStartDate: '2023-01-01',
      forecastEndDate: '2023-12-31',
      organizationId: testOrgId,
      userId: userId,
      createdAt: new Date('2023-01-01T00:00:00.000Z'),
      updatedAt: new Date('2023-01-01T00:00:00.000Z')
    };

    it('should return a specific forecast by ID', async () => {
      const mockSingle = jest.fn().mockResolvedValue({ data: mockDbResult, error: null });
      const mockMatch = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelectEq = jest.fn().mockReturnValue({ match: mockMatch });
      mockSupabaseSelect.mockReturnValue({ eq: mockSelectEq });

      const result = await service.findOne(forecastId, userId, mockRequest);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('forecasts');
      expect(mockSupabaseSelect).toHaveBeenCalledWith('*');
      expect(mockSelectEq).toHaveBeenCalledWith('id', forecastId);
      expect(mockMatch).toHaveBeenCalledWith({ user_id: userId });
      expect(mockSingle).toHaveBeenCalled();
      expect(result).toEqual(expectedForecast);
    });

    it('should throw NotFoundException if forecast does not exist', async () => {
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockMatch = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelectEq = jest.fn().mockReturnValue({ match: mockMatch });
      mockSupabaseSelect.mockReturnValue({ eq: mockSelectEq });

      await expect(service.findOne(forecastId, userId, mockRequest))
        .rejects.toThrow(new NotFoundException(`Forecast with ID ${forecastId} not found.`));
      expect(Logger.prototype.warn).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if DB query fails', async () => {
      const dbError = { message: 'Query failed', code: 'DB500' };
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: dbError });
      const mockMatch = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelectEq = jest.fn().mockReturnValue({ match: mockMatch });
      mockSupabaseSelect.mockReturnValue({ eq: mockSelectEq });

      await expect(service.findOne(forecastId, userId, mockRequest))
        .rejects.toThrow(new InternalServerErrorException(`Failed to retrieve forecast details: ${dbError.message}`));
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  // --- update Test ---
  describe('update', () => {
    const forecastId = 'forecast-123';
    const updateDto: UpdateForecastDto = {
      name: 'Updated Forecast',
      forecastStartDate: '2023-02-01',
      forecastEndDate: '2023-11-30'
    };

    it('should update a forecast successfully', async () => {
      // First mock findOne to return the existing forecast
      const mockFindOneSingle = jest.fn().mockResolvedValue({ 
        data: { 
          id: forecastId, 
          name: 'Old name', 
          forecast_start_date: '2023-01-01',
          forecast_end_date: '2023-12-31',
          organization_id: testOrgId,
          user_id: testUserId,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z'
        }, 
        error: null 
      });
      const mockFindOneMatch = jest.fn().mockReturnValue({ single: mockFindOneSingle });
      const mockFindOneEq = jest.fn().mockReturnValue({ match: mockFindOneMatch });
      mockSupabaseSelect.mockReturnValue({ eq: mockFindOneEq });

      // Then mock the update operation
      const mockUpdateSingle = jest.fn().mockResolvedValue({ data: { id: forecastId }, error: null });
      const mockUpdateSelect = jest.fn().mockReturnValue({ single: mockUpdateSingle });
      const mockUpdateMatch = jest.fn().mockReturnValue({ select: mockUpdateSelect });
      mockSupabaseUpdate.mockReturnValue({ match: mockUpdateMatch });

      await service.update(forecastId, testUserId, updateDto, mockRequest);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('forecasts');
      expect(mockSupabaseUpdate).toHaveBeenCalledWith(expect.objectContaining({
        name: updateDto.name,
        forecast_start_date: updateDto.forecastStartDate,
        forecast_end_date: updateDto.forecastEndDate,
        updated_at: expect.any(String)
      }));
      expect(mockUpdateMatch).toHaveBeenCalledWith({ id: forecastId, user_id: testUserId });
      expect(Logger.prototype.log).toHaveBeenCalledWith(`Forecast updated: ${forecastId} by user: ${testUserId}`);
    });

    it('should do nothing if no update data is provided', async () => {
      // First mock findOne to return the existing forecast (since update() calls findOne first)
      const mockFindOneSingle = jest.fn().mockResolvedValue({ 
        data: { 
          id: forecastId, 
          name: 'Test name', 
          forecast_start_date: '2023-01-01',
          forecast_end_date: '2023-12-31',
          organization_id: testOrgId,
          user_id: testUserId,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z'
        }, 
        error: null 
      });
      const mockFindOneMatch = jest.fn().mockReturnValue({ single: mockFindOneSingle });
      const mockFindOneEq = jest.fn().mockReturnValue({ match: mockFindOneMatch });
      mockSupabaseSelect.mockReturnValue({ eq: mockFindOneEq });

      await service.update(forecastId, testUserId, {}, mockRequest);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('forecasts'); // Called for findOne
      expect(mockSupabaseUpdate).not.toHaveBeenCalled(); // Update not called due to empty dto
    });

    it('should throw NotFoundException if forecast does not exist', async () => {
      mockSupabaseUpdate.mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      });

      await expect(service.update(forecastId, testUserId, updateDto, mockRequest))
        .rejects.toThrow(new NotFoundException(`Forecast with ID ${forecastId} not found.`));
      expect(Logger.prototype.warn).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if DB update fails', async () => {
      // First mock successful findOne
      const mockFindOneSingle = jest.fn().mockResolvedValue({ 
        data: { 
          id: forecastId, 
          name: 'Old name', 
          forecast_start_date: '2023-01-01',
          forecast_end_date: '2023-12-31',
          organization_id: testOrgId,
          user_id: testUserId,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z'
        }, 
        error: null 
      });
      const mockFindOneMatch = jest.fn().mockReturnValue({ single: mockFindOneSingle });
      const mockFindOneEq = jest.fn().mockReturnValue({ match: mockFindOneMatch });
      mockSupabaseSelect.mockReturnValue({ eq: mockFindOneEq });

      // Then mock update failure
      const dbError = { message: 'Update failed', code: 'DB500' };
      const mockUpdateSingle = jest.fn().mockResolvedValue({ data: null, error: dbError });
      const mockUpdateSelect = jest.fn().mockReturnValue({ single: mockUpdateSingle });
      const mockUpdateMatch = jest.fn().mockReturnValue({ select: mockUpdateSelect });
      mockSupabaseUpdate.mockReturnValue({ match: mockUpdateMatch });

      await expect(service.update(forecastId, testUserId, updateDto, mockRequest))
        .rejects.toThrow(new InternalServerErrorException(`Failed to update forecast ${forecastId}: ${dbError.message}`));
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  // --- remove Test ---
  describe('remove', () => {
    const forecastId = 'forecast-123';

    it('should delete a forecast successfully', async () => {
      // First mock the findOne call (to check forecast exists)
      const mockFindOneSingle = jest.fn().mockResolvedValue({ data: { id: forecastId }, error: null });
      const mockFindOneMatch = jest.fn().mockReturnValue({ single: mockFindOneSingle });
      const mockFindOneEq = jest.fn().mockReturnValue({ match: mockFindOneMatch });
      mockSupabaseSelect.mockReturnValue({ eq: mockFindOneEq });

      // Then mock the delete call
      const mockDeleteMatch = jest.fn().mockResolvedValue({ error: null });
      mockSupabaseDelete.mockReturnValue({ match: mockDeleteMatch });

      await service.remove(forecastId, testUserId, mockRequest);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('forecasts');
      expect(mockSupabaseDelete).toHaveBeenCalled();
      expect(mockDeleteMatch).toHaveBeenCalledWith({ id: forecastId, user_id: testUserId });
      expect(Logger.prototype.log).toHaveBeenCalledWith(`Forecast deleted: ${forecastId} by user: ${testUserId}`);
    });

    it('should throw NotFoundException if forecast does not exist', async () => {
      // Mock findOne to throw NotFoundException (forecast doesn't exist)
      const mockFindOneSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockFindOneMatch = jest.fn().mockReturnValue({ single: mockFindOneSingle });
      const mockFindOneEq = jest.fn().mockReturnValue({ match: mockFindOneMatch });
      mockSupabaseSelect.mockReturnValue({ eq: mockFindOneEq });

      await expect(service.remove(forecastId, testUserId, mockRequest))
        .rejects.toThrow(new NotFoundException(`Forecast with ID ${forecastId} not found.`));
      expect(Logger.prototype.warn).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if DB delete fails', async () => {
      // First mock successful findOne
      const mockFindOneSingle = jest.fn().mockResolvedValue({ data: { id: forecastId }, error: null });
      const mockFindOneMatch = jest.fn().mockReturnValue({ single: mockFindOneSingle });
      const mockFindOneEq = jest.fn().mockReturnValue({ match: mockFindOneMatch });
      mockSupabaseSelect.mockReturnValue({ eq: mockFindOneEq });

      // Then mock delete failure
      const dbError = { message: 'Delete failed', code: 'DB500' };
      const mockDeleteMatch = jest.fn().mockResolvedValue({ error: dbError });
      mockSupabaseDelete.mockReturnValue({ match: mockDeleteMatch });

      await expect(service.remove(forecastId, testUserId, mockRequest))
        .rejects.toThrow(new InternalServerErrorException(`Failed to delete forecast: ${dbError.message}`));
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });
}); 