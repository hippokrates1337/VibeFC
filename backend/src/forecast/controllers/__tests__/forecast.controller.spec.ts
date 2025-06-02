import { Test, TestingModule } from '@nestjs/testing';
import { ForecastController } from '../forecast.controller';
import { ForecastService } from '../../services/forecast.service';
import { ForecastNodeService } from '../../services/forecast-node.service';
import { ForecastEdgeService } from '../../services/forecast-edge.service';
import { CreateForecastDto, UpdateForecastDto, ForecastDto } from '../../dto/forecast.dto';
import { CreateForecastNodeDto, UpdateForecastNodeDto, ForecastNodeDto, ForecastNodeKind } from '../../dto/forecast-node.dto';
import { CreateForecastEdgeDto, ForecastEdgeDto } from '../../dto/forecast-edge.dto';
import { NotFoundException } from '@nestjs/common';

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
    attributes: { value: 100 },
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
    }).compile();

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
        
        expect(forecastService.create).toHaveBeenCalledWith(testUserId, createDto);
        expect(result).toEqual(mockForecast);
      });
    });

    describe('findAll', () => {
      it('should return an array of forecasts', async () => {
        mockForecastService.findAll.mockResolvedValue([mockForecast]);
        
        const result = await controller.findAll(mockRequest as any, testOrgId);
        
        expect(forecastService.findAll).toHaveBeenCalledWith(testUserId, testOrgId);
        expect(result).toEqual([mockForecast]);
      });
    });

    describe('findOne', () => {
      it('should return a single forecast', async () => {
        mockForecastService.findOne.mockResolvedValue(mockForecast);
        
        const result = await controller.findOne(mockRequest as any, testForecastId);
        
        expect(forecastService.findOne).toHaveBeenCalledWith(testForecastId, testUserId);
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
        
        await controller.update(testForecastId, updateDto);
        
        expect(forecastService.update).toHaveBeenCalledWith(testForecastId, updateDto);
      });
    });

    describe('remove', () => {
      it('should remove a forecast', async () => {
        mockForecastService.remove.mockResolvedValue(undefined);
        
        await controller.remove(testForecastId);
        
        expect(forecastService.remove).toHaveBeenCalledWith(testForecastId);
      });
    });
  });

  // --- Node Endpoints ---
  describe('Node Endpoints', () => {
    describe('createNode', () => {
      const createNodeDto: CreateForecastNodeDto = {
        forecastId: testForecastId,
        kind: ForecastNodeKind.CONSTANT,
        attributes: { value: 100 },
        position: { x: 100, y: 100 },
      };

      it('should create a new node', async () => {
        mockNodeService.create.mockResolvedValue(mockNode);
        
        const result = await controller.createNode(testForecastId, createNodeDto);
        
        expect(nodeService.create).toHaveBeenCalledWith(createNodeDto);
        expect(result).toEqual(mockNode);
      });
    });

    describe('findNodes', () => {
      it('should return an array of nodes for a forecast', async () => {
        mockNodeService.findByForecast.mockResolvedValue([mockNode]);
        
        const result = await controller.findNodes(testForecastId);
        
        expect(nodeService.findByForecast).toHaveBeenCalledWith(testForecastId);
        expect(result).toEqual([mockNode]);
      });
    });

    describe('findNode', () => {
      it('should return a single node', async () => {
        mockNodeService.findOne.mockResolvedValue(mockNode);
        
        const result = await controller.findNode(testNodeId);
        
        expect(nodeService.findOne).toHaveBeenCalledWith(testNodeId);
        expect(result).toEqual(mockNode);
      });
    });

    describe('updateNode', () => {
      const updateNodeDto: UpdateForecastNodeDto = {
        attributes: { value: 200 },
        position: { x: 200, y: 200 },
      };

      it('should update a node', async () => {
        mockNodeService.update.mockResolvedValue(undefined);
        
        await controller.updateNode(testNodeId, updateNodeDto);
        
        expect(nodeService.update).toHaveBeenCalledWith(testNodeId, updateNodeDto);
      });
    });

    describe('removeNode', () => {
      it('should remove a node', async () => {
        mockNodeService.remove.mockResolvedValue(undefined);
        
        await controller.removeNode(testNodeId);
        
        expect(nodeService.remove).toHaveBeenCalledWith(testNodeId);
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
        mockEdgeService.create.mockResolvedValue(mockEdge);
        
        const result = await controller.createEdge(testForecastId, createEdgeDto);
        
        expect(edgeService.create).toHaveBeenCalledWith(createEdgeDto);
        expect(result).toEqual(mockEdge);
      });
    });

    describe('findEdges', () => {
      it('should return an array of edges for a forecast', async () => {
        mockEdgeService.findByForecast.mockResolvedValue([mockEdge]);
        
        const result = await controller.findEdges(testForecastId);
        
        expect(edgeService.findByForecast).toHaveBeenCalledWith(testForecastId);
        expect(result).toEqual([mockEdge]);
      });
    });

    describe('findEdge', () => {
      it('should return a single edge', async () => {
        mockEdgeService.findOne.mockResolvedValue(mockEdge);
        
        const result = await controller.findEdge(testEdgeId);
        
        expect(edgeService.findOne).toHaveBeenCalledWith(testEdgeId);
        expect(result).toEqual(mockEdge);
      });
    });

    describe('removeEdge', () => {
      it('should remove an edge', async () => {
        mockEdgeService.remove.mockResolvedValue(undefined);
        
        await controller.removeEdge(testEdgeId);
        
        expect(edgeService.remove).toHaveBeenCalledWith(testEdgeId);
      });
    });
  });
}); 