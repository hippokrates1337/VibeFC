import { ForecastService } from '../services/forecast.service';
import { ForecastNodeService } from '../services/forecast-node.service';
import { ForecastEdgeService } from '../services/forecast-edge.service';
import { CreateForecastDto, UpdateForecastDto, ForecastDto } from '../dto/forecast.dto';
import { CreateForecastNodeDto, UpdateForecastNodeDto, ForecastNodeDto } from '../dto/forecast-node.dto';
import { CreateForecastEdgeDto, ForecastEdgeDto } from '../dto/forecast-edge.dto';
interface RequestWithUser extends Request {
    user: {
        userId: string;
        [key: string]: any;
    };
}
export declare class ForecastController {
    private readonly forecastService;
    private readonly nodeService;
    private readonly edgeService;
    private readonly logger;
    constructor(forecastService: ForecastService, nodeService: ForecastNodeService, edgeService: ForecastEdgeService);
    create(req: RequestWithUser, createForecastDto: CreateForecastDto): Promise<ForecastDto>;
    findAll(req: RequestWithUser, organizationId: string): Promise<ForecastDto[]>;
    findOne(req: RequestWithUser, id: string): Promise<ForecastDto>;
    update(req: RequestWithUser, id: string, updateForecastDto: UpdateForecastDto): Promise<void>;
    remove(req: RequestWithUser, id: string): Promise<void>;
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
