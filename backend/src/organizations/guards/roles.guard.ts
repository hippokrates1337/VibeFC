import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganizationsService } from '../services/organizations.service';
import { OrganizationRole } from '../dto/member.dto';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private organizationsService: OrganizationsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<OrganizationRole[]>(
      'roles',
      context.getHandler(),
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No specific roles required
    }

    const request = context.switchToHttp().getRequest();
    const { user } = request;
    const organizationId = request.params.orgId || request.body.organization_id;

    if (!user || !user.id) {
      throw new ForbiddenException('User is not authenticated');
    }

    if (!organizationId) {
      throw new ForbiddenException('Organization ID is required');
    }

    try {
      const userRole = await this.organizationsService.getUserRoleInOrganization(
        user.id,
        organizationId,
      );

      if (!userRole) {
        return false; // User is not a member of the organization
      }

      // Check if the user has one of the required roles
      return requiredRoles.includes(userRole);
    } catch (error) {
      throw new ForbiddenException(`Role check failed: ${error.message}`);
    }
  }
} 