import { Request as ExpressRequest } from 'express';
import { ForecastService } from '../services/forecast.service';
import { ForecastNodeService } from '../services/forecast-node.service';
import { ForecastEdgeService } from '../services/forecast-edge.service';
import { ForecastCalculationService } from '../services/forecast-calculation.service';
import { CreateForecastDto, UpdateForecastDto, ForecastDto, UpdateForecastPeriodsDto } from '../dto/forecast.dto';
import { CreateForecastNodeDto, UpdateForecastNodeDto, ForecastNodeDto } from '../dto/forecast-node.dto';
import { CreateForecastEdgeDto, ForecastEdgeDto } from '../dto/forecast-edge.dto';
import { BulkSaveGraphDto, FlattenedForecastWithDetailsDto } from '../dto/bulk-save-graph.dto';
interface RequestWithUser extends ExpressRequest {
    user: {
        userId: string;
        [key: string]: any;
    };
}
export declare class ForecastController {
    private readonly forecastService;
    private readonly nodeService;
    private readonly edgeService;
    private readonly forecastCalculationService;
    private readonly logger;
    constructor(forecastService: ForecastService, nodeService: ForecastNodeService, edgeService: ForecastEdgeService, forecastCalculationService: ForecastCalculationService);
    create(req: RequestWithUser, createForecastDto: CreateForecastDto): Promise<ForecastDto>;
    findAll(req: RequestWithUser, organizationId: string): Promise<ForecastDto[]>;
    findOne(req: RequestWithUser, id: string): Promise<ForecastDto>;
    update(req: RequestWithUser, id: string, updateForecastDto: UpdateForecastDto): Promise<void>;
    updatePeriods(req: RequestWithUser, id: string, updatePeriodsDto: UpdateForecastPeriodsDto): Promise<void>;
    remove(req: RequestWithUser, id: string): Promise<void>;
    bulkSaveGraph(req: RequestWithUser, forecastId: string, bulkSaveDto: BulkSaveGraphDto): Promise<FlattenedForecastWithDetailsDto>;
    createNode(req: RequestWithUser, forecastId: string, createNodeDto: CreateForecastNodeDto): Promise<ForecastNodeDto>;
    findNodes(req: RequestWithUser, forecastId: string): Promise<ForecastNodeDto[]>;
    findNode(req: RequestWithUser, forecastId: string, nodeId: string): Promise<ForecastNodeDto>;
    updateNode(req: RequestWithUser, forecastId: string, nodeId: string, updateNodeDto: UpdateForecastNodeDto): Promise<void>;
    removeNode(req: RequestWithUser, forecastId: string, nodeId: string): Promise<void>;
    createEdge(req: RequestWithUser, forecastId: string, createEdgeDto: CreateForecastEdgeDto): Promise<ForecastEdgeDto>;
    findEdges(req: RequestWithUser, forecastId: string): Promise<ForecastEdgeDto[]>;
    findEdge(req: RequestWithUser, forecastId: string, edgeId: string): Promise<ForecastEdgeDto>;
    removeEdge(req: RequestWithUser, forecastId: string, edgeId: string): Promise<void>;
}
export {};
