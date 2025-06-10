import { Test, TestingModule } from '@nestjs/testing';
import { ForecastNodeService } from '../forecast-node.service';
import { SupabaseOptimizedService } from '../../../supabase/supabase-optimized.service';
import { Logger, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { CreateForecastNodeDto, UpdateForecastNodeDto, ForecastNodeDto, ForecastNodeKind, NodePosition } from '../../dto/forecast-node.dto';

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

describe('ForecastNodeService', () => {
  let service: ForecastNodeService;
  let supabaseService: SupabaseOptimizedService;
  const testForecastId = 'test-forecast-123';

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
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    mockSupabaseInsert.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'new-node-id' }, error: null })
    });

    mockSupabaseUpdate.mockReturnValue({
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'updated-node-id' }, error: null })
    });

    mockSupabaseDelete.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ count: 1, error: null }),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForecastNodeService,
        { provide: SupabaseOptimizedService, useValue: mockSupabaseService },
        Logger,
      ],
    }).compile();

    service = module.get<ForecastNodeService>(ForecastNodeService);
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
    const position: NodePosition = { x: 100, y: 200 };
    
    // Test creation of different node types
    const dataNodeDto: CreateForecastNodeDto = {
      forecastId: testForecastId,
      kind: ForecastNodeKind.DATA,
      attributes: { name: 'Data Node', variableId: 'var-123', offsetMonths: 3 },
      position,
    };

    const constantNodeDto: CreateForecastNodeDto = {
      forecastId: testForecastId,
      kind: ForecastNodeKind.CONSTANT,
      attributes: { name: 'Constant Node', value: 42 },
      position,
    };

    const operatorNodeDto: CreateForecastNodeDto = {
      forecastId: testForecastId,
      kind: ForecastNodeKind.OPERATOR,
      attributes: { op: '+', inputOrder: ['node-1', 'node-2'] },
      position,
    };

    it('should create a DATA node successfully', async () => {
      const newNode = {
        id: 'new-data-node',
        forecast_id: testForecastId,
        kind: ForecastNodeKind.DATA,
        attributes: { variableId: 'var-123', offsetMonths: 3 },
        position,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z'
      };

      const mockInsertSingle = jest.fn().mockResolvedValue({ data: newNode, error: null });
      mockSupabaseInsert.mockReturnValue({ select: jest.fn().mockReturnThis(), single: mockInsertSingle });

      const result = await service.create(dataNodeDto, mockRequest);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('forecast_nodes');
      expect(mockSupabaseInsert).toHaveBeenCalledWith({
        forecast_id: dataNodeDto.forecastId,
        kind: dataNodeDto.kind,
        attributes: dataNodeDto.attributes,
        position: dataNodeDto.position,
      });
      expect(result).toEqual({
        id: newNode.id,
        forecastId: newNode.forecast_id,
        kind: newNode.kind,
        attributes: newNode.attributes,
        position: newNode.position,
        createdAt: new Date(newNode.created_at),
        updatedAt: new Date(newNode.updated_at),
      });
      expect(Logger.prototype.log).toHaveBeenCalledWith(`Forecast node created: ${newNode.id} for forecast ${dataNodeDto.forecastId}`);
    });

    it('should create a CONSTANT node successfully', async () => {
      const newNode = {
        id: 'new-constant-node',
        forecast_id: testForecastId,
        kind: ForecastNodeKind.CONSTANT,
        attributes: { name: 'Constant Node', value: 42 },
        position,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z'
      };

      const mockInsertSingle = jest.fn().mockResolvedValue({ data: newNode, error: null });
      mockSupabaseInsert.mockReturnValue({ select: jest.fn().mockReturnThis(), single: mockInsertSingle });

      const result = await service.create(constantNodeDto, mockRequest);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('forecast_nodes');
      expect(mockSupabaseInsert).toHaveBeenCalledWith({
        forecast_id: constantNodeDto.forecastId,
        kind: constantNodeDto.kind,
        attributes: constantNodeDto.attributes,
        position: constantNodeDto.position,
      });
      expect(result.attributes).toEqual({ name: 'Constant Node', value: 42 });
    });

    it('should create an OPERATOR node successfully', async () => {
      const newNode = {
        id: 'new-operator-node',
        forecast_id: testForecastId,
        kind: ForecastNodeKind.OPERATOR,
        attributes: { op: '+', inputOrder: ['node-1', 'node-2'] },
        position,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z'
      };

      const mockInsertSingle = jest.fn().mockResolvedValue({ data: newNode, error: null });
      mockSupabaseInsert.mockReturnValue({ select: jest.fn().mockReturnThis(), single: mockInsertSingle });

      const result = await service.create(operatorNodeDto, mockRequest);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('forecast_nodes');
      expect(mockSupabaseInsert).toHaveBeenCalledWith({
        forecast_id: operatorNodeDto.forecastId,
        kind: operatorNodeDto.kind,
        attributes: operatorNodeDto.attributes,
        position: operatorNodeDto.position,
      });
      expect(result.attributes).toEqual({ op: '+', inputOrder: ['node-1', 'node-2'] });
    });

    it('should throw InternalServerErrorException if node creation fails', async () => {
      const dbError = { message: 'Insert failed', code: 'DB500' };
      mockSupabaseInsert.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: dbError })
      });

      await expect(service.create(dataNodeDto, mockRequest))
        .rejects.toThrow(new InternalServerErrorException(`Failed to create forecast node: ${dbError.message}`));
      expect(Logger.prototype.error).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if insert succeeds but no data is returned', async () => {
      mockSupabaseInsert.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      });

      await expect(service.create(dataNodeDto, mockRequest))
        .rejects.toThrow(new InternalServerErrorException('Failed to create forecast node, data missing after insert.'));
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  // --- findByForecast Test ---
  describe('findByForecast', () => {
    const forecastId = testForecastId;
    const mockDbResult = [
      {
        id: 'node-1',
        forecast_id: forecastId,
        kind: ForecastNodeKind.DATA,
        attributes: { variableId: 'var-123', offsetMonths: 3 },
        position: { x: 100, y: 200 },
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z'
      },
      {
        id: 'node-2',
        forecast_id: forecastId,
        kind: ForecastNodeKind.CONSTANT,
        attributes: { value: 42 },
        position: { x: 300, y: 200 },
        created_at: '2023-01-02T00:00:00.000Z',
        updated_at: '2023-01-02T00:00:00.000Z'
      }
    ];

    it('should return all nodes for a forecast', async () => {
      const mockSelectEq = jest.fn().mockResolvedValue({ data: mockDbResult, error: null });
      mockSupabaseSelect.mockReturnValue({ eq: mockSelectEq });

      const result = await service.findByForecast(forecastId, mockRequest);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('forecast_nodes');
      expect(mockSupabaseSelect).toHaveBeenCalledWith('*');
      expect(mockSelectEq).toHaveBeenCalledWith('forecast_id', forecastId);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('node-1');
      expect(result[0].kind).toBe(ForecastNodeKind.DATA);
      expect(result[1].id).toBe('node-2');
      expect(result[1].kind).toBe(ForecastNodeKind.CONSTANT);
    });

    it('should throw InternalServerErrorException if DB query fails', async () => {
      const dbError = { message: 'Query failed', code: 'DB500' };
      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: dbError })
      });

      await expect(service.findByForecast(forecastId, mockRequest))
        .rejects.toThrow(new InternalServerErrorException(`Failed to fetch forecast nodes: ${dbError.message}`));
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  // --- findOne Test ---
  describe('findOne', () => {
    const nodeId = 'node-123';
    const mockDbResult = {
      id: nodeId,
      forecast_id: testForecastId,
      kind: ForecastNodeKind.DATA,
      attributes: { variableId: 'var-123', offsetMonths: 3 },
      position: { x: 100, y: 200 },
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z'
    };

    it('should return a specific node by ID', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockDbResult, error: null })
      });

      const result = await service.findOne(nodeId, mockRequest);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('forecast_nodes');
      expect(mockSupabaseSelect).toHaveBeenCalledWith('*');
      expect(result.id).toBe(nodeId);
      expect(result.forecastId).toBe(testForecastId);
      expect(result.kind).toBe(ForecastNodeKind.DATA);
    });

    it('should throw NotFoundException if node does not exist', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      });

      await expect(service.findOne(nodeId, mockRequest))
        .rejects.toThrow(new NotFoundException(`Forecast node with ID ${nodeId} not found (no data).`));
      expect(Logger.prototype.warn).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if DB query fails', async () => {
      const dbError = { message: 'Query failed', code: 'DB500' };
      mockSupabaseSelect.mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: dbError })
      });

      await expect(service.findOne(nodeId, mockRequest))
        .rejects.toThrow(new InternalServerErrorException(`Failed to retrieve forecast node details: ${dbError.message}`));
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  // --- update Test ---
  describe('update', () => {
    const nodeId = 'node-123';
    const updateDto: UpdateForecastNodeDto = {
      kind: ForecastNodeKind.CONSTANT,
      attributes: { name: 'Updated Constant', value: 99 },
      position: { x: 150, y: 250 }
    };

    it('should update a node successfully', async () => {
      mockSupabaseUpdate.mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: nodeId }, error: null })
      });

      await service.update(nodeId, updateDto, mockRequest);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('forecast_nodes');
      expect(mockSupabaseUpdate).toHaveBeenCalledWith(expect.objectContaining({
        kind: updateDto.kind,
        attributes: updateDto.attributes,
        position: updateDto.position,
        updated_at: expect.any(String)
      }));
      expect(Logger.prototype.log).toHaveBeenCalledWith(`Forecast node updated: ${nodeId}`);
    });

    it('should update only specified fields', async () => {
      const partialUpdate: UpdateForecastNodeDto = {
        attributes: { name: 'Updated Name', value: 99 }
      };

      mockSupabaseUpdate.mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: nodeId }, error: null })
      });

      await service.update(nodeId, partialUpdate, mockRequest);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('forecast_nodes');
      expect(mockSupabaseUpdate).toHaveBeenCalledWith(expect.objectContaining({
        attributes: partialUpdate.attributes,
        updated_at: expect.any(String)
      }));
      expect(mockSupabaseUpdate).not.toHaveBeenCalledWith(expect.objectContaining({
        kind: expect.anything(),
        position: expect.anything()
      }));
    });

    it('should do nothing if no update data is provided', async () => {
      await service.update(nodeId, {}, mockRequest);

      // The service implementation returns early without calling the client
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
      expect(mockSupabaseUpdate).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if node does not exist', async () => {
      mockSupabaseUpdate.mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      });

      await expect(service.update(nodeId, updateDto, mockRequest))
        .rejects.toThrow(new NotFoundException(`Forecast node with ID ${nodeId} not found.`));
      expect(Logger.prototype.warn).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if DB update fails', async () => {
      const dbError = { message: 'Update failed', code: 'DB500' };
      mockSupabaseUpdate.mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: dbError })
      });

      await expect(service.update(nodeId, updateDto, mockRequest))
        .rejects.toThrow(new InternalServerErrorException(`Failed to update forecast node ${nodeId}: ${dbError.message}`));
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  // --- remove Test ---
  describe('remove', () => {
    const nodeId = 'node-123';

    it('should delete a node successfully', async () => {
      mockSupabaseDelete.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ count: 1, error: null })
      });

      // First mock the findOne call that remove() makes to verify existence
      const mockFindOneSingle = jest.fn().mockResolvedValue({ 
        data: { id: nodeId, forecast_id: testForecastId }, 
        error: null 
      });
      const mockFindOneEq = jest.fn().mockReturnValue({ single: mockFindOneSingle });
      mockSupabaseSelect.mockReturnValue({ eq: mockFindOneEq });

      // Then mock the delete call
      const mockDeleteEq = jest.fn().mockResolvedValue({ error: null });
      mockSupabaseDelete.mockReturnValue({ eq: mockDeleteEq });

      await service.remove(nodeId, mockRequest);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('forecast_nodes');
      expect(mockSupabaseDelete).toHaveBeenCalled();
      expect(Logger.prototype.log).toHaveBeenCalledWith(`Forecast node deleted: ${nodeId}`);
    });

    it('should throw NotFoundException if node does not exist', async () => {
      // Mock findOne to throw NotFoundException (called by remove)
      const mockFindOneSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockFindOneEq = jest.fn().mockReturnValue({ single: mockFindOneSingle });
      mockSupabaseSelect.mockReturnValue({ eq: mockFindOneEq });

      await expect(service.remove(nodeId, mockRequest))
        .rejects.toThrow(new NotFoundException(`Forecast node with ID ${nodeId} not found (no data).`));
      expect(Logger.prototype.warn).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if DB delete fails', async () => {
      // First mock successful findOne
      const mockFindOneSingle = jest.fn().mockResolvedValue({ 
        data: { id: nodeId, forecast_id: testForecastId }, 
        error: null 
      });
      const mockFindOneEq = jest.fn().mockReturnValue({ single: mockFindOneSingle });
      mockSupabaseSelect.mockReturnValue({ eq: mockFindOneEq });

      // Then mock delete failure
      const dbError = { message: 'Delete failed', code: 'DB500' };
      const mockDeleteEq = jest.fn().mockResolvedValue({ error: dbError });
      mockSupabaseDelete.mockReturnValue({ eq: mockDeleteEq });

      await expect(service.remove(nodeId, mockRequest))
        .rejects.toThrow(new InternalServerErrorException(`Failed to delete forecast node ${nodeId}: ${dbError.message}`));
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });
}); 