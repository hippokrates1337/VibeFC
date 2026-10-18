import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Request as NestRequest, HttpCode, HttpStatus } from '@nestjs/common';
import { OrganizationsService } from '../services/organizations.service';
import { CreateOrganizationDto, UpdateOrganizationDto, OrganizationDto } from '../dto/organization.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { OrganizationRole } from '../dto/member.dto';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { ForecastService } from '../../forecast/services/forecast.service';
import { ForecastDto } from '../../forecast/dto/forecast.dto';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly forecastService: ForecastService,
  ) {}

  @Post()
  async create(@NestRequest() req: AuthenticatedRequest, @Body() createOrganizationDto: CreateOrganizationDto): Promise<OrganizationDto> {
    return this.organizationsService.create(req.user.userId, createOrganizationDto, req);
  }

  @Get()
  async findAll(@NestRequest() req: AuthenticatedRequest): Promise<OrganizationDto[]> {
    return this.organizationsService.findAll(req.user.userId, req);
  }

  /** Matches frontend `GET /organizations/:orgId/forecasts/summary` (forecast graph list). */
  @Get(':orgId/forecasts/summary')
  @UseGuards(RolesGuard)
  @Roles(OrganizationRole.ADMIN, OrganizationRole.EDITOR, OrganizationRole.VIEWER)
  async listForecastSummaries(
    @Param('orgId') orgId: string,
    @NestRequest() req: AuthenticatedRequest,
  ): Promise<Array<ForecastDto & { nodeCount: number; edgeCount: number; nodeTypes: string[] }>> {
    return this.forecastService.findSummariesByOrganization(req.user.userId, orgId, req);
  }

  @Get(':orgId')
  @UseGuards(RolesGuard)
  @Roles(OrganizationRole.ADMIN, OrganizationRole.EDITOR, OrganizationRole.VIEWER)
  async findOne(@Param('orgId') orgId: string, @NestRequest() req: AuthenticatedRequest): Promise<OrganizationDto> {
    return this.organizationsService.findOne(orgId, req.user.userId, req);
  }

  @Put(':orgId')
  @UseGuards(RolesGuard)
  @Roles(OrganizationRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async update(
    @Param('orgId') orgId: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @NestRequest() req: AuthenticatedRequest
  ): Promise<void> {
    return this.organizationsService.update(orgId, updateOrganizationDto, req);
  }

  @Delete(':orgId')
  @UseGuards(RolesGuard)
  @Roles(OrganizationRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('orgId') orgId: string, @NestRequest() req: AuthenticatedRequest): Promise<void> {
    return this.organizationsService.remove(orgId, req);
  }
} 