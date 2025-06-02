import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpCode, Request, Query, Logger } from '@nestjs/common';
import { ForecastService } from '../services/forecast.service';
import { ForecastNodeService } from '../services/forecast-node.service';
import { ForecastEdgeService } from '../services/forecast-edge.service';
import { CreateForecastDto, UpdateForecastDto, ForecastDto } from '../dto/forecast.dto';
import { CreateForecastNodeDto, UpdateForecastNodeDto, ForecastNodeDto } from '../dto/forecast-node.dto';
import { CreateForecastEdgeDto, ForecastEdgeDto } from '../dto/forecast-edge.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// Define type for authenticated request
interface RequestWithUser extends Request {
  user: {
    userId: string;
    [key: string]: any;
  };
}

@Controller('forecasts')
@UseGuards(JwtAuthGuard)
export class ForecastController {
  private readonly logger = new Logger(ForecastController.name);

  constructor(
    private readonly forecastService: ForecastService,
    private readonly nodeService: ForecastNodeService,
    private readonly edgeService: ForecastEdgeService,
  ) {}

  // Forecast endpoints
  @Post()
  async create(@Request() req: RequestWithUser, @Body() createForecastDto: CreateForecastDto): Promise<ForecastDto> {
    this.logger.debug(`ForecastController.create called`);
    this.logger.debug(`Request user object: ${JSON.stringify(req.user)}`);
    
    const userId = req.user?.userId;
    if (!userId) {
      this.logger.error('User ID not found in request after auth guard. Check JWT strategy and guard setup.');
    }
    this.logger.debug(`Extracted userId: ${userId}`);
    this.logger.debug(`Received CreateForecastDto: ${JSON.stringify(createForecastDto)}`);

    try {
      const result = await this.forecastService.create(userId, createForecastDto);
      this.logger.debug(`Forecast creation successful in controller, returning result.`);
      return result;
    } catch (error) {
      this.logger.error(`Error in ForecastController.create while calling service: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get()
  async findAll(@Request() req: RequestWithUser, @Query('organizationId') organizationId: string): Promise<ForecastDto[]> {
    const userId = req.user.userId;
    return this.forecastService.findAll(userId, organizationId);
  }

  @Get(':id')
  async findOne(@Request() req: RequestWithUser, @Param('id') id: string): Promise<ForecastDto> {
    const userId = req.user.userId;
    return this.forecastService.findOne(id, userId);
  }

  @Patch(':id')
  @HttpCode(204)
  async update(@Request() req: RequestWithUser, @Param('id') id: string, @Body() updateForecastDto: UpdateForecastDto): Promise<void> {
    const userId = req.user.userId;
    return this.forecastService.update(id, userId, updateForecastDto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Request() req: RequestWithUser, @Param('id') id: string): Promise<void> {
    const userId = req.user.userId;
    return this.forecastService.remove(id, userId);
  }

  // Node endpoints
  @Post(':forecastId/nodes')
  async createNode(
    @Request() req: RequestWithUser,
    @Param('forecastId') forecastId: string, 
    @Body() createNodeDto: CreateForecastNodeDto
  ): Promise<ForecastNodeDto> {
    // First check if the forecast belongs to this user
    const userId = req.user.userId;
    await this.forecastService.findOne(forecastId, userId);
    
    // Ensure the node is associated with the correct forecast
    createNodeDto.forecastId = forecastId;
    return this.nodeService.create(createNodeDto);
  }

  @Get(':forecastId/nodes')
  async findNodes(@Request() req: RequestWithUser, @Param('forecastId') forecastId: string): Promise<ForecastNodeDto[]> {
    // First check if the forecast belongs to this user
    const userId = req.user.userId;
    await this.forecastService.findOne(forecastId, userId);
    
    // If we get here, the forecast exists and belongs to the user
    return this.nodeService.findByForecast(forecastId);
  }

  @Get(':forecastId/nodes/:nodeId')
  async findNode(@Request() req: RequestWithUser, @Param('forecastId') forecastId: string, @Param('nodeId') nodeId: string): Promise<ForecastNodeDto> {
    // First check if the forecast belongs to this user
    const userId = req.user.userId;
    await this.forecastService.findOne(forecastId, userId);
    
    // If we get here, the forecast exists and belongs to the user, so we can check the node
    return this.nodeService.findOne(nodeId);
  }

  @Patch(':forecastId/nodes/:nodeId')
  @HttpCode(204)
  async updateNode(
    @Request() req: RequestWithUser,
    @Param('forecastId') forecastId: string,
    @Param('nodeId') nodeId: string, 
    @Body() updateNodeDto: UpdateForecastNodeDto
  ): Promise<void> {
    // First check if the forecast belongs to this user
    const userId = req.user.userId;
    await this.forecastService.findOne(forecastId, userId);
    
    return this.nodeService.update(nodeId, updateNodeDto);
  }

  @Delete(':forecastId/nodes/:nodeId')
  @HttpCode(204)
  async removeNode(
    @Request() req: RequestWithUser,
    @Param('forecastId') forecastId: string,
    @Param('nodeId') nodeId: string
  ): Promise<void> {
    // First check if the forecast belongs to this user
    const userId = req.user.userId;
    await this.forecastService.findOne(forecastId, userId);
    
    return this.nodeService.remove(nodeId);
  }

  // Edge endpoints
  @Post(':forecastId/edges')
  async createEdge(
    @Request() req: RequestWithUser,
    @Param('forecastId') forecastId: string, 
    @Body() createEdgeDto: CreateForecastEdgeDto
  ): Promise<ForecastEdgeDto> {
    // First check if the forecast belongs to this user
    const userId = req.user.userId;
    await this.forecastService.findOne(forecastId, userId);
    
    // Ensure the edge is associated with the correct forecast
    createEdgeDto.forecastId = forecastId;
    return this.edgeService.create(createEdgeDto);
  }

  @Get(':forecastId/edges')
  async findEdges(@Request() req: RequestWithUser, @Param('forecastId') forecastId: string): Promise<ForecastEdgeDto[]> {
    // First check if the forecast belongs to this user
    const userId = req.user.userId;
    await this.forecastService.findOne(forecastId, userId);
    
    // If we get here, the forecast exists and belongs to the user
    return this.edgeService.findByForecast(forecastId);
  }

  @Get(':forecastId/edges/:edgeId')
  async findEdge(@Request() req: RequestWithUser, @Param('forecastId') forecastId: string, @Param('edgeId') edgeId: string): Promise<ForecastEdgeDto> {
    // First check if the forecast belongs to this user
    const userId = req.user.userId;
    await this.forecastService.findOne(forecastId, userId);
    
    // If we get here, the forecast exists and belongs to the user, so we can check the edge
    return this.edgeService.findOne(edgeId);
  }

  @Delete(':forecastId/edges/:edgeId')
  @HttpCode(204)
  async removeEdge(
    @Request() req: RequestWithUser,
    @Param('forecastId') forecastId: string,
    @Param('edgeId') edgeId: string
  ): Promise<void> {
    // First check if the forecast belongs to this user
    const userId = req.user.userId;
    await this.forecastService.findOne(forecastId, userId);
    
    return this.edgeService.remove(edgeId);
  }
} 