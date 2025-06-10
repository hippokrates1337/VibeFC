import { Test, TestingModule } from '@nestjs/testing';
import { ForecastController } from '../forecast.controller';
import { ForecastService } from '../../services/forecast.service';
import { ForecastNodeService } from '../../services/forecast-node.service';
import { ForecastEdgeService } from '../../services/forecast-edge.service';
import { CreateForecastDto, UpdateForecastDto, ForecastDto } from '../../dto/forecast.dto';
import { CreateForecastNodeDto, UpdateForecastNodeDto, ForecastNodeDto, ForecastNodeKind } from '../../dto/forecast-node.dto';
import { CreateForecastEdgeDto, ForecastEdgeDto } from '../../dto/forecast-edge.dto';
import { NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

describe('ForecastController', () => {
  let controller: ForecastController;
  let forecastService: ForecastService;
  let nodeService: ForecastNodeService;
  let edgeService: ForecastEdgeService;

  // Mock data
  const testUserId = 'test-user-123';
  const testOrgId = 'test-org-123';
  const testForecastId = 'test-forecast-123';
  const testNodeId = 'test-node-123';
  const testEdgeId = 'test-edge-123';

  // Mock request object
  const mockRequest = {
    user: {
      userId: testUserId,
    },
  };

  // Mock forecast data
  const mockForecast: ForecastDto = {
    id: testForecastId,
    name: 'Test Forecast',
    forecastStartDate: '2023-01-01',
    forecastEndDate: '2023-12-31',
    organizationId: testOrgId,
    userId: testUserId,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
  };

  // Mock node data
  const mockNode: ForecastNodeDto = {
    id: testNodeId,
    forecastId: testForecastId,
    kind: ForecastNodeKind.CONSTANT,
    attributes: { name: 'Test Node', value: 100 },
    position: { x: 100, y: 100 },
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
  };

  // Mock edge data
  const mockEdge: ForecastEdgeDto = {
    id: testEdgeId,
    forecastId: testForecastId,
    sourceNodeId: 'source-node-123',
    targetNodeId: 'target-node-123',
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
  };

  // Mock service implementations
  const mockForecastService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockNodeService = {
    create: jest.fn(),
    findByForecast: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockEdgeService = {
    create: jest.fn(),
    findByForecast: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ForecastController],
      providers: [
        { provide: ForecastService, useValue: mockForecastService },
        { provide: ForecastNodeService, useValue: mockNodeService },
        { provide: ForecastEdgeService, useValue: mockEdgeService },
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate: jest.fn(() => true), // Mock the guard to always allow access
    })
    .compile();

    controller = module.get<ForecastController>(ForecastController);
    forecastService = module.get<ForecastService>(ForecastService);
    nodeService = module.get<ForecastNodeService>(ForecastNodeService);
    edgeService = module.get<ForecastEdgeService>(ForecastEdgeService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // --- Forecast Endpoints ---
  describe('Forecast Endpoints', () => {
    describe('create', () => {
      const createDto: CreateForecastDto = {
        name: 'New Forecast',
        forecastStartDate: '2023-01-01',
        forecastEndDate: '2023-12-31',
        organizationId: testOrgId,
      };

      it('should create a new forecast', async () => {
        mockForecastService.create.mockResolvedValue(mockForecast);
        
        const result = await controller.create(mockRequest as any, createDto);
        
        expect(forecastService.create).toHaveBeenCalledWith(testUserId, createDto, mockRequest);
        expect(result).toEqual(mockForecast);
      });
    });

    describe('findAll', () => {
      it('should return an array of forecasts', async () => {
        mockForecastService.findAll.mockResolvedValue([mockForecast]);
        
        const result = await controller.findAll(mockRequest as any, testOrgId);
        
        expect(forecastService.findAll).toHaveBeenCalledWith(testUserId, testOrgId, mockRequest);
        expect(result).toEqual([mockForecast]);
      });
    });

    describe('findOne', () => {
      it('should return a single forecast', async () => {
        mockForecastService.findOne.mockResolvedValue(mockForecast);
        
        const result = await controller.findOne(mockRequest as any, testForecastId);
        
        expect(forecastService.findOne).toHaveBeenCalledWith(testForecastId, testUserId, mockRequest);
        expect(result).toEqual(mockForecast);
      });

      it('should throw NotFoundException when forecast not found', async () => {
        mockForecastService.findOne.mockRejectedValue(new NotFoundException());
        
        await expect(controller.findOne(mockRequest as any, 'non-existent-id'))
          .rejects.toThrow(NotFoundException);
      });
    });

    describe('update', () => {
      const updateDto: UpdateForecastDto = {
        name: 'Updated Forecast Name',
      };

      it('should update a forecast', async () => {
        mockForecastService.update.mockResolvedValue(undefined);
        
        await controller.update(mockRequest as any, testForecastId, updateDto);
        
        expect(forecastService.update).toHaveBeenCalledWith(testForecastId, testUserId, updateDto, mockRequest);
      });
    });

    describe('remove', () => {
      it('should remove a forecast', async () => {
        mockForecastService.remove.mockResolvedValue(undefined);
        
        await controller.remove(mockRequest as any, testForecastId);
        
        expect(forecastService.remove).toHaveBeenCalledWith(testForecastId, testUserId, mockRequest);
      });
    });
  });

  // --- Node Endpoints ---
  describe('Node Endpoints', () => {
    describe('createNode', () => {
      const createNodeDto: CreateForecastNodeDto = {
        forecastId: testForecastId,
        kind: ForecastNodeKind.CONSTANT,
        attributes: { name: 'Test Node', value: 100 },
        position: { x: 100, y: 100 },
      };

      it('should create a new node', async () => {
        mockForecastService.findOne.mockResolvedValue(mockForecast);
        mockNodeService.create.mockResolvedValue(mockNode);
        
        const result = await controller.createNode(mockRequest as any, testForecastId, createNodeDto);
        
        expect(forecastService.findOne).toHaveBeenCalledWith(testForecastId, testUserId, mockRequest);
        expect(nodeService.create).toHaveBeenCalledWith({ ...createNodeDto, forecastId: testForecastId }, mockRequest);
        expect(result).toEqual(mockNode);
      });
    });

    describe('findNodes', () => {
      it('should return an array of nodes for a forecast', async () => {
        mockForecastService.findOne.mockResolvedValue(mockForecast);
        mockNodeService.findByForecast.mockResolvedValue([mockNode]);
        
        const result = await controller.findNodes(mockRequest as any, testForecastId);
        
        expect(forecastService.findOne).toHaveBeenCalledWith(testForecastId, testUserId, mockRequest);
        expect(nodeService.findByForecast).toHaveBeenCalledWith(testForecastId, mockRequest);
        expect(result).toEqual([mockNode]);
      });
    });

    describe('findNode', () => {
      it('should return a single node', async () => {
        mockForecastService.findOne.mockResolvedValue(mockForecast);
        mockNodeService.findOne.mockResolvedValue(mockNode);
        
        const result = await controller.findNode(mockRequest as any, testForecastId, testNodeId);
        
        expect(forecastService.findOne).toHaveBeenCalledWith(testForecastId, testUserId, mockRequest);
        expect(nodeService.findOne).toHaveBeenCalledWith(testNodeId, mockRequest);
        expect(result).toEqual(mockNode);
      });
    });

    describe('updateNode', () => {
      const updateNodeDto: UpdateForecastNodeDto = {
        attributes: { name: 'Updated Node', value: 200 },
        position: { x: 200, y: 200 },
      };

      it('should update a node', async () => {
        mockForecastService.findOne.mockResolvedValue(mockForecast);
        mockNodeService.update.mockResolvedValue(undefined);
        
        await controller.updateNode(mockRequest as any, testForecastId, testNodeId, updateNodeDto);
        
        expect(forecastService.findOne).toHaveBeenCalledWith(testForecastId, testUserId, mockRequest);
        expect(nodeService.update).toHaveBeenCalledWith(testNodeId, updateNodeDto, mockRequest);
      });
    });

    describe('removeNode', () => {
      it('should remove a node', async () => {
        mockForecastService.findOne.mockResolvedValue(mockForecast);
        mockNodeService.remove.mockResolvedValue(undefined);
        
        await controller.removeNode(mockRequest as any, testForecastId, testNodeId);
        
        expect(forecastService.findOne).toHaveBeenCalledWith(testForecastId, testUserId, mockRequest);
        expect(nodeService.remove).toHaveBeenCalledWith(testNodeId, mockRequest);
      });
    });
  });

  // --- Edge Endpoints ---
  describe('Edge Endpoints', () => {
    describe('createEdge', () => {
      const createEdgeDto: CreateForecastEdgeDto = {
        forecastId: testForecastId,
        sourceNodeId: 'source-node-123',
        targetNodeId: 'target-node-123',
      };

      it('should create a new edge', async () => {
        mockForecastService.findOne.mockResolvedValue(mockForecast);
        mockEdgeService.create.mockResolvedValue(mockEdge);
        
        const result = await controller.createEdge(mockRequest as any, testForecastId, createEdgeDto);
        
        expect(forecastService.findOne).toHaveBeenCalledWith(testForecastId, testUserId, mockRequest);
        expect(edgeService.create).toHaveBeenCalledWith({ ...createEdgeDto, forecastId: testForecastId }, mockRequest);
        expect(result).toEqual(mockEdge);
      });
    });

    describe('findEdges', () => {
      it('should return an array of edges for a forecast', async () => {
        mockForecastService.findOne.mockResolvedValue(mockForecast);
        mockEdgeService.findByForecast.mockResolvedValue([mockEdge]);
        
        const result = await controller.findEdges(mockRequest as any, testForecastId);
        
        expect(forecastService.findOne).toHaveBeenCalledWith(testForecastId, testUserId, mockRequest);
        expect(edgeService.findByForecast).toHaveBeenCalledWith(testForecastId, mockRequest);
        expect(result).toEqual([mockEdge]);
      });
    });

    describe('findEdge', () => {
      it('should return a single edge', async () => {
        mockForecastService.findOne.mockResolvedValue(mockForecast);
        mockEdgeService.findOne.mockResolvedValue(mockEdge);
        
        const result = await controller.findEdge(mockRequest as any, testForecastId, testEdgeId);
        
        expect(forecastService.findOne).toHaveBeenCalledWith(testForecastId, testUserId, mockRequest);
        expect(edgeService.findOne).toHaveBeenCalledWith(testEdgeId, mockRequest);
        expect(result).toEqual(mockEdge);
      });
    });

    describe('removeEdge', () => {
      it('should remove an edge', async () => {
        mockForecastService.findOne.mockResolvedValue(mockForecast);
        mockEdgeService.remove.mockResolvedValue(undefined);
        
        await controller.removeEdge(mockRequest as any, testForecastId, testEdgeId);
        
        expect(forecastService.findOne).toHaveBeenCalledWith(testForecastId, testUserId, mockRequest);
        expect(edgeService.remove).toHaveBeenCalledWith(testEdgeId, mockRequest);
      });
    });
  });
}); 