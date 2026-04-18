import { Test, TestingModule } from '@nestjs/testing';
import { MembersService } from './members.service';
import { SupabaseOptimizedService } from '../../supabase/supabase-optimized.service';
import {
  Logger,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InviteMemberDto, UpdateMemberRoleDto, OrganizationRole } from '../dto/member.dto';

Logger.prototype.log = jest.fn();
Logger.prototype.error = jest.fn();
Logger.prototype.warn = jest.fn();

describe('MembersService', () => {
  let service: MembersService;

  const inviteUserByEmail = jest.fn();
  const mockAdminFrom = jest.fn();

  const mockAdminClient = {
    from: mockAdminFrom,
    auth: {
      admin: {
        inviteUserByEmail,
      },
    },
  };

  const mockUserFrom = jest.fn();
  const mockUserClient = {
    from: mockUserFrom,
  };

  const mockSupabaseService = {
    getClientForRequest: jest.fn(() => mockUserClient),
    getServiceRoleClient: jest.fn(() => mockAdminClient),
    hasServiceRoleKey: jest.fn(() => true),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(undefined),
  };

  const mockRequest = {
    headers: { authorization: 'Bearer mock-token' },
    user: { id: 'test-user-123', userId: 'test-user-123', email: 'test@example.com' },
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSupabaseService.hasServiceRoleKey.mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: SupabaseOptimizedService, useValue: mockSupabaseService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllInOrganization', () => {
    const orgId = 'org-456';
    const rows = [
      { user_id: 'u1', email: 'a@test.com', role: 'admin', joined_at: '2023-01-01T10:00:00Z' },
      { user_id: 'u2', email: 'e@test.com', role: 'editor', joined_at: '2023-01-02T11:00:00Z' },
    ];

    it('should map rows from organization_members_with_emails', async () => {
      const eq = jest.fn().mockResolvedValue({ data: rows, error: null });
      const select = jest.fn().mockReturnValue({ eq });
      mockUserFrom.mockReturnValue({ select });

      const result = await service.findAllInOrganization(orgId, mockRequest);

      expect(mockUserFrom).toHaveBeenCalledWith('organization_members_with_emails');
      expect(select).toHaveBeenCalledWith('user_id, email, role, joined_at');
      expect(eq).toHaveBeenCalledWith('organization_id', orgId);
      expect(result).toEqual([
        { id: 'u1', email: 'a@test.com', role: 'admin', joinedAt: new Date(rows[0].joined_at) },
        { id: 'u2', email: 'e@test.com', role: 'editor', joinedAt: new Date(rows[1].joined_at) },
      ]);
    });
  });

  describe('addMember', () => {
    const orgId = 'org-123';
    const inviteDto: InviteMemberDto = { email: 'Invitee@test.com', role: OrganizationRole.VIEWER };

    it('returns member_added when profile exists and member inserted', async () => {
      const profileChain = {
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'invitee-uuid' }, error: null }),
      };
      const memberCheckChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      const memberInsertChain = {
        insert: jest.fn().mockResolvedValue({ error: null }),
      };
      let orgMembersCalls = 0;
      mockUserFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain;
        if (table === 'organization_members') {
          orgMembersCalls += 1;
          return orgMembersCalls === 1 ? memberCheckChain : memberInsertChain;
        }
        return {};
      });

      const result = await service.addMember(orgId, inviteDto, mockRequest);

      expect(result).toEqual({ outcome: 'member_added' });
      expect(inviteUserByEmail).not.toHaveBeenCalled();
    });

    it('returns invite_email_sent when no profile and invite succeeds', async () => {
      const profileChain = {
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      const invChain = {
        insert: jest.fn().mockResolvedValue({ error: null }),
      };
      mockUserFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain;
        if (table === 'organization_invitations') return invChain;
        return {};
      });
      inviteUserByEmail.mockResolvedValue({ error: null });

      const result = await service.addMember(orgId, inviteDto, mockRequest);

      expect(result).toEqual({ outcome: 'invite_email_sent' });
      expect(inviteUserByEmail).toHaveBeenCalledWith(
        'invitee@test.com',
        expect.objectContaining({
          data: { organization_id: orgId, role: inviteDto.role },
        }),
      );
    });

    it('throws UnprocessableEntityException when service role missing for new user', async () => {
      mockSupabaseService.hasServiceRoleKey.mockReturnValue(false);
      const profileChain = {
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      mockUserFrom.mockImplementation((t: string) => (t === 'profiles' ? profileChain : {}));

      await expect(service.addMember(orgId, inviteDto, mockRequest)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws ConflictException when user already a member', async () => {
      const profileChain = {
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'invitee-uuid' }, error: null }),
      };
      const memberCheck = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
      };
      mockUserFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain;
        if (table === 'organization_members') return memberCheck;
        return {};
      });

      await expect(service.addMember(orgId, inviteDto, mockRequest)).rejects.toThrow(ConflictException);
    });
  });

  describe('updateMemberRole', () => {
    const orgId = 'org-789';
    const userId = 'user-to-update';
    const updateDto: UpdateMemberRoleDto = { role: OrganizationRole.VIEWER };

    it('should update role when member exists', async () => {
      const maybeSingle = jest
        .fn()
        .mockResolvedValueOnce({ data: { id: 'm1', role: OrganizationRole.EDITOR }, error: null });
      const updateEq2 = jest.fn().mockResolvedValue({ error: null });
      const updateEq1 = jest.fn().mockReturnValue({ eq: updateEq2 });
      const updateFn = jest.fn().mockReturnValue({ eq: updateEq1 });

      mockUserFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({ maybeSingle }),
          }),
        }),
        update: updateFn,
      });

      await service.updateMemberRole(orgId, userId, updateDto, mockRequest);

      expect(updateFn).toHaveBeenCalledWith({ role: updateDto.role });
    });

    it('should throw NotFoundException when member missing', async () => {
      mockUserFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      });

      await expect(service.updateMemberRole(orgId, userId, updateDto, mockRequest)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('removeMember', () => {
    const orgId = 'org-abc';
    const userId = 'user-to-remove';

    it('should delete when member is non-admin', async () => {
      const deleteEq2 = jest.fn().mockResolvedValue({ error: null });
      const deleteEq1 = jest.fn().mockReturnValue({ eq: deleteEq2 });
      const deleteFn = jest.fn().mockReturnValue({ eq: deleteEq1 });

      mockUserFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: { role: OrganizationRole.EDITOR }, error: null }),
            }),
          }),
        }),
        delete: deleteFn,
      });

      await service.removeMember(orgId, userId, mockRequest);

      expect(deleteFn).toHaveBeenCalled();
    });
  });
});
