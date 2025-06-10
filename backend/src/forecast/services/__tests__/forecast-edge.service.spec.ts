import { Test, TestingModule } from '@nestjs/testing';
import { ForecastEdgeService } from '../forecast-edge.service';
import { SupabaseOptimizedService } from '../../../supabase/supabase-optimized.service';
import { Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { CreateForecastEdgeDto, ForecastEdgeDto } from '../../dto/forecast-edge.dto';
import { ForecastNodeService } from '../forecast-node.service';

// Mock Supabase client methods
const mockSupabaseInsert = jest.fn();
const mockSupabaseSelect = jest.fn();
const mockSupabaseDelete = jest.fn();

const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: mockSupabaseInsert,
  delete: mockSupabaseDelete,
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
};

// Mock Logger
Logger.prototype.log = jest.fn();
Logger.prototype.error = jest.fn();
Logger.prototype.warn = jest.fn();

describe('ForecastEdgeService', () => {
  let service: ForecastEdgeService;
  let supabaseService: SupabaseOptimizedService;
  const testForecastId = 'test-forecast-123';
  const testSourceNodeId = 'test-source-node-123';
  const testTargetNodeId = 'test-target-node-123';

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
      single: jest.fn().mockResolvedValue({ data: { id: 'new-edge-id' }, error: null })
    });

    mockSupabaseDelete.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ count: 1, error: null }),
    });

    const mockForecastNodeService = {
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForecastEdgeService,
        { provide: SupabaseOptimizedService, useValue: mockSupabaseService },
        { provide: ForecastNodeService, useValue: mockForecastNodeService },
        Logger,
      ],
    }).compile();

    service = module.get<ForecastEdgeService>(ForecastEdgeService);
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
    const createDto: CreateForecastEdgeDto = {
      forecastId: testForecastId,
      sourceNodeId: testSourceNodeId,
      targetNodeId: testTargetNodeId
    };
    const newEdge = {
      id: 'new-edge-id',
      forecast_id: testForecastId,
      source_node_id: testSourceNodeId,
      target_node_id: testTargetNodeId,
      created_at: '2023-01-01T00:00:00.000Z'
    };

    it('should create an edge successfully', async () => {
      const mockInsertSingle = jest.fn().mockResolvedValue({ data: newEdge, error: null });
      mockSupabaseInsert.mockReturnValue({ select: jest.fn().mockReturnThis(), single: mockInsertSingle });

      const result = await service.create(createDto, mockRequest);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('forecast_edges');
      expect(mockSupabaseInsert).toHaveBeenCalledWith({
        forecast_id: createDto.forecastId,
        source_node_id: createDto.sourceNodeId,
        target_node_id: createDto.targetNodeId
      });
      expect(mockInsertSingle).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        id: newEdge.id,
        forecastId: newEdge.forecast_id,
        sourceNodeId: newEdge.source_node_id,
        targetNodeId: newEdge.target_node_id,
        createdAt: new Date(newEdge.created_at)
      });
      expect(Logger.prototype.log).toHaveBeenCalledWith(`Forecast edge created: ${newEdge.id} for forecast ${createDto.forecastId}`);
    });

    it('should throw InternalServerErrorException if edge creation fails', async () => {
      const dbError = { message: 'Insert failed', code: 'DB500' };
      mockSupabaseInsert.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: dbError })
      });

      await expect(service.create(createDto, mockRequest))
        .rejects.toThrow(new InternalServerErrorException(`Failed to create forecast edge: ${dbError.message}`));
      expect(Logger.prototype.error).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if insert succeeds but no data is returned', async () => {
      mockSupabaseInsert.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      });

      await expect(service.create(createDto, mockRequest))
        .rejects.toThrow(new InternalServerErrorException('Failed to create forecast edge, data missing after insert.'));
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  // --- findByForecast Test ---
  describe('findByForecast', () => {
    const forecastId = testForecastId;
    const mockDbResult = [
      {
        id: 'edge-1',
        forecast_id: forecastId,
        source_node_id: 'source-node-1',
        target_node_id: 'target-node-1',
        created_at: '2023-01-01T00:00:00.000Z'
      },
      {
        id: 'edge-2',
        forecast_id: forecastId,
        source_node_id: 'source-node-2',
        target_node_id: 'target-node-2',
        created_at: '2023-01-02T00:00:00.000Z'
      }
    ];
    const expectedEdges = [
      {
        id: 'edge-1',
        forecastId,
        sourceNodeId: 'source-node-1',
        targetNodeId: 'target-node-1',
        createdAt: new Date('2023-01-01T00:00:00.000Z')
      },
      {
        id: 'edge-2',
        forecastId,
        sourceNodeId: 'source-node-2',
        targetNodeId: 'target-node-2',
        createdAt: new Date('2023-01-02T00:00:00.000Z')
      }
    ];

    it('should return all edges for a forecast', async () => {
      const mockSelectEq = jest.fn().mockResolvedValue({ data: mockDbResult, error: null });
      mockSupabaseSelect.mockReturnValue({ eq: mockSelectEq });

      const result = await service.findByForecast(forecastId, mockRequest);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('forecast_edges');
      expect(mockSupabaseSelect).toHaveBeenCalledWith('*');
      expect(mockSelectEq).toHaveBeenCalledWith('forecast_id', forecastId);
      expect(result).toEqual(expectedEdges);
    });

    it('should throw InternalServerErrorException if DB query fails', async () => {
      const dbError = { message: 'Query failed', code: 'DB500' };
      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: dbError })
      });

      await expect(service.findByForecast(forecastId, mockRequest))
        .rejects.toThrow(new InternalServerErrorException(`Failed to fetch forecast edges: ${dbError.message}`));
    });
  });

  // --- findOne Test ---
  describe('findOne', () => {
    const edgeId = 'test-edge-id';
    const mockDbEdge = {
      id: edgeId,
      forecast_id: testForecastId,
      source_node_id: testSourceNodeId,
      target_node_id: testTargetNodeId,
      created_at: '2023-01-01T00:00:00.000Z'
    };
    const expectedEdge = {
      id: edgeId,
      forecastId: testForecastId,
      sourceNodeId: testSourceNodeId,
      targetNodeId: testTargetNodeId,
      createdAt: new Date('2023-01-01T00:00:00.000Z')
    };

    it('should return edge when found', async () => {
      const mockSelectSingle = jest.fn().mockResolvedValue({ data: mockDbEdge, error: null });
      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        single: mockSelectSingle
      });

      const result = await service.findOne(edgeId, mockRequest);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('forecast_edges');
      expect(mockSupabaseSelect).toHaveBeenCalledWith('*');
      expect(mockSelectSingle).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedEdge);
    });

    it('should throw NotFoundException if edge not found', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      });

      await expect(service.findOne(edgeId, mockRequest))
        .rejects.toThrow(new NotFoundException(`Forecast edge with ID ${edgeId} not found.`));
    });

    it('should throw InternalServerErrorException if DB query fails', async () => {
      const dbError = { message: 'Query failed', code: 'DB500' };
      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: dbError })
      });

      await expect(service.findOne(edgeId, mockRequest))
        .rejects.toThrow(new InternalServerErrorException(`Failed to retrieve forecast edge details: ${dbError.message}`));
    });
  });

  // --- remove Test ---
  describe('remove', () => {
    const edgeId = 'test-edge-id';

    it('should remove edge successfully', async () => {
      const mockDeleteEq = jest.fn().mockResolvedValue({ count: 1, error: null });
      mockSupabaseDelete.mockReturnValue({ eq: mockDeleteEq });

      await service.remove(edgeId, mockRequest);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('forecast_edges');
      expect(mockDeleteEq).toHaveBeenCalledWith('id', edgeId);
      expect(Logger.prototype.log).toHaveBeenCalledWith(`Forecast edge deleted: ${edgeId}`);
    });

    it('should throw NotFoundException if edge not found', async () => {
      mockSupabaseDelete.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ count: 0, error: null })
      });

      await expect(service.remove(edgeId, mockRequest))
        .rejects.toThrow(new NotFoundException(`Forecast edge with ID ${edgeId} not found.`));
    });

    it('should throw InternalServerErrorException if delete fails', async () => {
      const dbError = { message: 'Delete failed', code: 'DB500' };
      mockSupabaseDelete.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ count: 0, error: dbError })
      });

      await expect(service.remove(edgeId, mockRequest))
        .rejects.toThrow(new InternalServerErrorException(`Failed to delete forecast edge ${edgeId}: ${dbError.message}`));
    });
  });
}); 