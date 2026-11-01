import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpCode, Request, Query, Logger, ParseUUIDPipe } from '@nestjs/common';
import { ForecastService } from '../services/forecast.service';
import { ForecastNodeService } from '../services/forecast-node.service';
import { ForecastEdgeService } from '../services/forecast-edge.service';
import { CreateForecastDto, UpdateForecastDto, ForecastDto, UpdateForecastPeriodsDto } from '../dto/forecast.dto';
import { CreateForecastNodeDto, UpdateForecastNodeDto, ForecastNodeDto } from '../dto/forecast-node.dto';
import { CreateForecastEdgeDto, ForecastEdgeDto } from '../dto/forecast-edge.dto';
import { BulkSaveGraphDto, FlattenedForecastWithDetailsDto } from '../dto/bulk-save-graph.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

/** Path ids are UUIDs: anything else is a 400 instead of a database error. */
const Uuid = (name: string) => Param(name, new ParseUUIDPipe());

/**
 * Forecasts and their nodes and edges. Every route first loads the forecast (404 unless the
 * caller may read it); node and edge routes then only find nodes and edges of that forecast.
 * Writes are limited to editors and admins by row-level security.
 */
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
  async create(@Request() req: AuthenticatedRequest, @Body() createForecastDto: CreateForecastDto): Promise<ForecastDto> {
    return this.forecastService.create(req.user.userId, createForecastDto, req);
  }

  @Get()
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('organizationId', new ParseUUIDPipe()) organizationId: string
  ): Promise<ForecastDto[]> {
    return this.forecastService.findAll(req.user.userId, organizationId, req);
  }

  @Get(':id')
  async findOne(@Request() req: AuthenticatedRequest, @Uuid('id') id: string): Promise<ForecastDto> {
    return this.forecastService.findOne(id, req.user.userId, req);
  }

  @Patch(':id')
  @HttpCode(204)
  async update(@Request() req: AuthenticatedRequest, @Uuid('id') id: string, @Body() updateForecastDto: UpdateForecastDto): Promise<void> {
    return this.forecastService.update(id, req.user.userId, updateForecastDto, req);
  }

  @Patch(':id/periods')
  @HttpCode(204)
  async updatePeriods(@Request() req: AuthenticatedRequest, @Uuid('id') id: string, @Body() updatePeriodsDto: UpdateForecastPeriodsDto): Promise<void> {
    return this.forecastService.updatePeriods(id, req.user.userId, updatePeriodsDto, req);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Request() req: AuthenticatedRequest, @Uuid('id') id: string): Promise<void> {
    return this.forecastService.remove(id, req.user.userId, req);
  }

  @Post(':forecastId/bulk-save')
  async bulkSaveGraph(
    @Request() req: AuthenticatedRequest,
    @Uuid('forecastId') forecastId: string,
    @Body() bulkSaveDto: BulkSaveGraphDto
  ): Promise<FlattenedForecastWithDetailsDto> {
    return this.forecastService.bulkSaveGraph(forecastId, req.user.userId, bulkSaveDto, req);
  }

  // Node endpoints
  @Post(':forecastId/nodes')
  async createNode(
    @Request() req: AuthenticatedRequest,
    @Uuid('forecastId') forecastId: string,
    @Body() createNodeDto: CreateForecastNodeDto
  ): Promise<ForecastNodeDto> {
    await this.forecastService.findOne(forecastId, req.user.userId, req);
    // The node always belongs to the forecast in the URL
    return this.nodeService.create({ ...createNodeDto, forecastId }, req);
  }

  @Get(':forecastId/nodes')
  async findNodes(@Request() req: AuthenticatedRequest, @Uuid('forecastId') forecastId: string): Promise<ForecastNodeDto[]> {
    await this.forecastService.findOne(forecastId, req.user.userId, req);
    return this.nodeService.findByForecast(forecastId, req);
  }

  @Get(':forecastId/nodes/:nodeId')
  async findNode(
    @Request() req: AuthenticatedRequest,
    @Uuid('forecastId') forecastId: string,
    @Uuid('nodeId') nodeId: string
  ): Promise<ForecastNodeDto> {
    await this.forecastService.findOne(forecastId, req.user.userId, req);
    return this.nodeService.findOne(forecastId, nodeId, req);
  }

  @Patch(':forecastId/nodes/:nodeId')
  @HttpCode(204)
  async updateNode(
    @Request() req: AuthenticatedRequest,
    @Uuid('forecastId') forecastId: string,
    @Uuid('nodeId') nodeId: string,
    @Body() updateNodeDto: UpdateForecastNodeDto
  ): Promise<void> {
    await this.forecastService.findOne(forecastId, req.user.userId, req);
    return this.nodeService.update(forecastId, nodeId, updateNodeDto, req);
  }

  @Delete(':forecastId/nodes/:nodeId')
  @HttpCode(204)
  async removeNode(
    @Request() req: AuthenticatedRequest,
    @Uuid('forecastId') forecastId: string,
    @Uuid('nodeId') nodeId: string
  ): Promise<void> {
    await this.forecastService.findOne(forecastId, req.user.userId, req);
    return this.nodeService.remove(forecastId, nodeId, req);
  }

  // Edge endpoints
  @Post(':forecastId/edges')
  async createEdge(
    @Request() req: AuthenticatedRequest,
    @Uuid('forecastId') forecastId: string,
    @Body() createEdgeDto: CreateForecastEdgeDto
  ): Promise<ForecastEdgeDto> {
    await this.forecastService.findOne(forecastId, req.user.userId, req);
    return this.edgeService.create({ ...createEdgeDto, forecastId }, req);
  }

  @Get(':forecastId/edges')
  async findEdges(@Request() req: AuthenticatedRequest, @Uuid('forecastId') forecastId: string): Promise<ForecastEdgeDto[]> {
    await this.forecastService.findOne(forecastId, req.user.userId, req);
    return this.edgeService.findByForecast(forecastId, req);
  }

  @Get(':forecastId/edges/:edgeId')
  async findEdge(
    @Request() req: AuthenticatedRequest,
    @Uuid('forecastId') forecastId: string,
    @Uuid('edgeId') edgeId: string
  ): Promise<ForecastEdgeDto> {
    await this.forecastService.findOne(forecastId, req.user.userId, req);
    return this.edgeService.findOne(forecastId, edgeId, req);
  }

  @Delete(':forecastId/edges/:edgeId')
  @HttpCode(204)
  async removeEdge(
    @Request() req: AuthenticatedRequest,
    @Uuid('forecastId') forecastId: string,
    @Uuid('edgeId') edgeId: string
  ): Promise<void> {
    await this.forecastService.findOne(forecastId, req.user.userId, req);
    return this.edgeService.remove(forecastId, edgeId, req);
  }
}
