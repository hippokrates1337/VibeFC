import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, HttpCode, HttpStatus, Request as NestRequest } from '@nestjs/common';
import { MembersService } from '../services/members.service';
import { InviteMemberDto, UpdateMemberRoleDto, AddMemberResponseDto } from '../dto/member.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { OrganizationRole } from '../dto/member.dto';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@Controller('organizations/:orgId/members')
@UseGuards(JwtAuthGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(OrganizationRole.ADMIN, OrganizationRole.EDITOR, OrganizationRole.VIEWER)
  async findAll(@Param('orgId') orgId: string, @NestRequest() req: AuthenticatedRequest) {
    return this.membersService.findAllInOrganization(orgId, req);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(OrganizationRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async addMember(
    @Param('orgId') orgId: string,
    @Body() inviteMemberDto: InviteMemberDto,
    @NestRequest() req: AuthenticatedRequest
  ): Promise<AddMemberResponseDto> {
    return this.membersService.addMember(orgId, inviteMemberDto, req);
  }

  @Put(':userId')
  @UseGuards(RolesGuard)
  @Roles(OrganizationRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateRole(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @Body() updateRoleDto: UpdateMemberRoleDto,
    @NestRequest() req: AuthenticatedRequest
  ): Promise<void> {
    return this.membersService.updateMemberRole(orgId, userId, updateRoleDto, req);
  }

  @Delete(':userId')
  @UseGuards(RolesGuard)
  @Roles(OrganizationRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @NestRequest() req: AuthenticatedRequest
  ): Promise<void> {
    return this.membersService.removeMember(orgId, userId, req);
  }
} 