import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganizationsService } from '../services/organizations.service';
import { OrganizationRole } from '../dto/member.dto';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

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

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { user } = request;
    const organizationId = request.params?.orgId || request.body?.organization_id;

    // JwtAuthGuard sets request.user = { userId, email }
    if (!user?.userId) {
      throw new ForbiddenException('User is not authenticated');
    }

    if (!organizationId) {
      throw new ForbiddenException('Organization ID is required');
    }

    let userRole: OrganizationRole | null;
    try {
      userRole = await this.organizationsService.getUserRoleInOrganization(
        user.userId,
        organizationId,
        request,
      );
    } catch (error) {
      this.logger.error(`Role lookup failed for org ${organizationId}`, error instanceof Error ? error.stack : undefined);
      throw new ForbiddenException('Role check failed');
    }

    if (!userRole) {
      return false; // User is not a member of the organization
    }

    return requiredRoles.includes(userRole);
  }
}
