import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganizationsService } from '../services/organizations.service';
export declare class RolesGuard implements CanActivate {
    private reflector;
    private organizationsService;
    constructor(reflector: Reflector, organizationsService: OrganizationsService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
