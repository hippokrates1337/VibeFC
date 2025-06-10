import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Request as NestRequest, HttpCode, HttpStatus } from '@nestjs/common';
import { OrganizationsService } from '../services/organizations.service';
import { CreateOrganizationDto, UpdateOrganizationDto, OrganizationDto } from '../dto/organization.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { OrganizationRole } from '../dto/member.dto';
import { Request } from 'express';

// Extend Express Request to include user property
interface RequestWithUser extends Request {
  user: {
    id: string;
    [key: string]: any;
  };
}

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  async create(@NestRequest() req: RequestWithUser, @Body() createOrganizationDto: CreateOrganizationDto): Promise<OrganizationDto> {
    return this.organizationsService.create(req.user.id, createOrganizationDto, req);
  }

  @Get()
  async findAll(@NestRequest() req: RequestWithUser): Promise<OrganizationDto[]> {
    return this.organizationsService.findAll(req.user.id, req);
  }

  @Get(':orgId')
  @UseGuards(RolesGuard)
  @Roles(OrganizationRole.ADMIN, OrganizationRole.EDITOR, OrganizationRole.VIEWER)
  async findOne(@Param('orgId') orgId: string, @NestRequest() req: RequestWithUser): Promise<OrganizationDto> {
    return this.organizationsService.findOne(orgId, req.user.id, req);
  }

  @Put(':orgId')
  @UseGuards(RolesGuard)
  @Roles(OrganizationRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async update(
    @Param('orgId') orgId: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @NestRequest() req: RequestWithUser
  ): Promise<void> {
    return this.organizationsService.update(orgId, updateOrganizationDto, req);
  }

  @Delete(':orgId')
  @UseGuards(RolesGuard)
  @Roles(OrganizationRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('orgId') orgId: string, @NestRequest() req: RequestWithUser): Promise<void> {
    return this.organizationsService.remove(orgId, req);
  }
} 