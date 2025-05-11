import { Test, TestingModule } from '@nestjs/testing';
import { ForecastService } from '../forecast.service';
import { SupabaseService } from '../../../supabase/supabase.service';
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
  let supabaseService: SupabaseService;
  const testUserId = 'test-user-123';
  const testOrgId = 'test-org-123';

  const mockSupabaseService = {
    client: mockSupabaseClient,
  };

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
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    mockSupabaseInsert.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'new-forecast-id' }, error: null })
    });

    mockSupabaseUpdate.mockReturnValue({
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'updated-forecast-id' }, error: null })
    });

    mockSupabaseDelete.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ count: 1, error: null }),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForecastService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        Logger,
      ],
    }).compile();

    service = module.get<ForecastService>(ForecastService);
    supabaseService = module.get<SupabaseService>(SupabaseService);

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

      const result = await service.create(userId, createDto);

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
      expect(Logger.prototype.log).toHaveBeenCalledWith(`Forecast created: ${newForecast.id} by user ${userId}`);
    });

    it('should throw InternalServerErrorException if forecast creation fails', async () => {
      const dbError = { message: 'Insert failed', code: 'DB500' };
      mockSupabaseInsert.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: dbError })
      });

      await expect(service.create(userId, createDto))
        .rejects.toThrow(new InternalServerErrorException(`Failed to create forecast: ${dbError.message}`));
      expect(Logger.prototype.error).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if insert succeeds but no data is returned', async () => {
      mockSupabaseInsert.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      });

      await expect(service.create(userId, createDto))
        .rejects.toThrow(new InternalServerErrorException('Failed to create forecast, data missing after insert.'));
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
      const mockSelectEq = jest.fn().mockResolvedValue({ data: mockDbResult, error: null });
      mockSupabaseSelect.mockReturnValue({ eq: mockSelectEq });

      const result = await service.findAll(userId, organizationId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('forecasts');
      expect(mockSupabaseSelect).toHaveBeenCalledWith('*');
      expect(mockSelectEq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(result).toEqual(expectedForecasts);
    });

    it('should throw InternalServerErrorException if DB query fails', async () => {
      const dbError = { message: 'Query failed', code: 'DB500' };
      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: dbError })
      });

      await expect(service.findAll(userId, organizationId))
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
      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockDbResult, error: null })
      });

      const result = await service.findOne(forecastId, userId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('forecasts');
      expect(mockSupabaseSelect).toHaveBeenCalledWith('*');
      expect(result).toEqual(expectedForecast);
    });

    it('should throw NotFoundException if forecast does not exist', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      });

      await expect(service.findOne(forecastId, userId))
        .rejects.toThrow(new NotFoundException(`Forecast with ID ${forecastId} not found.`));
      expect(Logger.prototype.warn).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if DB query fails', async () => {
      const dbError = { message: 'Query failed', code: 'DB500' };
      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: dbError })
      });

      await expect(service.findOne(forecastId, userId))
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
      mockSupabaseUpdate.mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: forecastId }, error: null })
      });

      await service.update(forecastId, updateDto);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('forecasts');
      expect(mockSupabaseUpdate).toHaveBeenCalledWith(expect.objectContaining({
        name: updateDto.name,
        forecast_start_date: updateDto.forecastStartDate,
        forecast_end_date: updateDto.forecastEndDate,
        updated_at: expect.any(String)
      }));
      expect(Logger.prototype.log).toHaveBeenCalledWith(`Forecast updated: ${forecastId}`);
    });

    it('should do nothing if no update data is provided', async () => {
      await service.update(forecastId, {});

      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
      expect(mockSupabaseUpdate).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if forecast does not exist', async () => {
      mockSupabaseUpdate.mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      });

      await expect(service.update(forecastId, updateDto))
        .rejects.toThrow(new NotFoundException(`Forecast with ID ${forecastId} not found.`));
      expect(Logger.prototype.warn).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if DB update fails', async () => {
      const dbError = { message: 'Update failed', code: 'DB500' };
      mockSupabaseUpdate.mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: dbError })
      });

      await expect(service.update(forecastId, updateDto))
        .rejects.toThrow(new InternalServerErrorException(`Failed to update forecast ${forecastId}: ${dbError.message}`));
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  // --- remove Test ---
  describe('remove', () => {
    const forecastId = 'forecast-123';

    it('should delete a forecast successfully', async () => {
      mockSupabaseDelete.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ count: 1, error: null })
      });

      await service.remove(forecastId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('forecasts');
      expect(mockSupabaseDelete).toHaveBeenCalled();
      expect(Logger.prototype.log).toHaveBeenCalledWith(`Forecast deleted: ${forecastId}`);
    });

    it('should throw NotFoundException if forecast does not exist', async () => {
      mockSupabaseDelete.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ count: 0, error: null })
      });

      await expect(service.remove(forecastId))
        .rejects.toThrow(new NotFoundException(`Forecast with ID ${forecastId} not found.`));
      expect(Logger.prototype.warn).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if DB delete fails', async () => {
      const dbError = { message: 'Delete failed', code: 'DB500' };
      mockSupabaseDelete.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ count: 0, error: dbError })
      });

      await expect(service.remove(forecastId))
        .rejects.toThrow(new InternalServerErrorException(`Failed to delete forecast ${forecastId}: ${dbError.message}`));
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });
}); 