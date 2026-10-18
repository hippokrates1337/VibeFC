import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { OrganizationRole } from '../dto/member.dto';
import { OrganizationsService } from '../services/organizations.service';

describe('RolesGuard', () => {
  let reflector: { get: jest.Mock };
  let organizationsService: { getUserRoleInOrganization: jest.Mock };
  let guard: RolesGuard;

  const createContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
      getHandler: () => () => undefined,
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { get: jest.fn() };
    organizationsService = { getUserRoleInOrganization: jest.fn() };
    guard = new RolesGuard(
      reflector as unknown as Reflector,
      organizationsService as unknown as OrganizationsService,
    );
  });

  it('allows the request when no roles are required', async () => {
    reflector.get.mockReturnValue(undefined);

    await expect(guard.canActivate(createContext({}))).resolves.toBe(true);
    expect(organizationsService.getUserRoleInOrganization).not.toHaveBeenCalled();
  });

  it('reads the user id from request.user.userId as set by JwtAuthGuard', async () => {
    reflector.get.mockReturnValue([OrganizationRole.ADMIN]);
    organizationsService.getUserRoleInOrganization.mockResolvedValue(OrganizationRole.ADMIN);
    const request = { user: { userId: 'user-1', email: 'a@b.c' }, params: { orgId: 'org-1' } };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(organizationsService.getUserRoleInOrganization).toHaveBeenCalledWith('user-1', 'org-1', request);
  });

  it('rejects when the user lacks the required role', async () => {
    reflector.get.mockReturnValue([OrganizationRole.ADMIN]);
    organizationsService.getUserRoleInOrganization.mockResolvedValue(OrganizationRole.VIEWER);
    const request = { user: { userId: 'user-1' }, params: { orgId: 'org-1' } };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(false);
  });

  it('rejects when the user is not a member', async () => {
    reflector.get.mockReturnValue([OrganizationRole.VIEWER]);
    organizationsService.getUserRoleInOrganization.mockResolvedValue(null);
    const request = { user: { userId: 'user-1' }, params: { orgId: 'org-1' } };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(false);
  });

  it('throws when there is no authenticated user', async () => {
    reflector.get.mockReturnValue([OrganizationRole.VIEWER]);

    await expect(guard.canActivate(createContext({ params: { orgId: 'org-1' } }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('takes the organization id from the body when the route has none', async () => {
    reflector.get.mockReturnValue([OrganizationRole.EDITOR]);
    organizationsService.getUserRoleInOrganization.mockResolvedValue(OrganizationRole.EDITOR);
    const request = { user: { userId: 'user-1' }, params: {}, body: { organization_id: 'org-2' } };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(organizationsService.getUserRoleInOrganization).toHaveBeenCalledWith('user-1', 'org-2', request);
  });

  it('throws when no organization id is present (GET without body)', async () => {
    reflector.get.mockReturnValue([OrganizationRole.VIEWER]);

    await expect(
      guard.canActivate(createContext({ user: { userId: 'user-1' }, params: {} })),
    ).rejects.toThrow('Organization ID is required');
  });

  it('does not leak lookup error details', async () => {
    reflector.get.mockReturnValue([OrganizationRole.VIEWER]);
    organizationsService.getUserRoleInOrganization.mockRejectedValue(new Error('relation "x" does not exist'));
    const request = { user: { userId: 'user-1' }, params: { orgId: 'org-1' } };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      new ForbiddenException('Role check failed'),
    );
  });
});
