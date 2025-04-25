import { SetMetadata } from '@nestjs/common';
import { OrganizationRole } from '../dto/member.dto';

export const Roles = (...roles: OrganizationRole[]) => SetMetadata('roles', roles); 