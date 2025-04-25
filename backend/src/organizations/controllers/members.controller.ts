import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { MembersService } from '../services/members.service';
import { InviteMemberDto, UpdateMemberRoleDto } from '../dto/member.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { OrganizationRole } from '../dto/member.dto';

@Controller('organizations/:orgId/members')
@UseGuards(JwtAuthGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(OrganizationRole.ADMIN, OrganizationRole.EDITOR, OrganizationRole.VIEWER)
  async findAll(@Param('orgId') orgId: string) {
    return this.membersService.findAllInOrganization(orgId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(OrganizationRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async addMember(
    @Param('orgId') orgId: string,
    @Body() inviteMemberDto: InviteMemberDto,
  ): Promise<void> {
    return this.membersService.addMember(orgId, inviteMemberDto);
  }

  @Put(':userId')
  @UseGuards(RolesGuard)
  @Roles(OrganizationRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateRole(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @Body() updateRoleDto: UpdateMemberRoleDto,
  ): Promise<void> {
    return this.membersService.updateMemberRole(orgId, userId, updateRoleDto);
  }

  @Delete(':userId')
  @UseGuards(RolesGuard)
  @Roles(OrganizationRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    return this.membersService.removeMember(orgId, userId);
  }
} 