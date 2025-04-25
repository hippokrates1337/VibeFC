import { Test, TestingModule } from '@nestjs/testing';
import { MembersService } from './members.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { Logger, NotFoundException, InternalServerErrorException, ConflictException, BadRequestException } from '@nestjs/common';
import { InviteMemberDto, UpdateMemberRoleDto, OrganizationRole, MemberDto } from '../dto/member.dto';

// Mock Supabase client methods
const mockSupabaseInsert = jest.fn();
const mockSupabaseSelect = jest.fn();
const mockSupabaseUpdate = jest.fn();
const mockSupabaseDelete = jest.fn();
const mockSupabaseRpc = jest.fn();

const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: mockSupabaseInsert,
  update: mockSupabaseUpdate,
  delete: mockSupabaseDelete,
  eq: jest.fn().mockReturnThis(),
  match: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn(),
  single: jest.fn(),
  rpc: mockSupabaseRpc,
};

// Mock Logger
Logger.prototype.log = jest.fn();
Logger.prototype.error = jest.fn();
Logger.prototype.warn = jest.fn();

describe('MembersService', () => {
  let service: MembersService;
  let supabaseService: SupabaseService;

  const mockSupabaseService = {
    client: mockSupabaseClient,
  };

  // Shared mocks for different .from() calls
  let mockFromAuthUsers: jest.Mock;
  let mockFromOrgMembers: jest.Mock;
  let mockAuthSelect: jest.Mock;
  let mockAuthEq: jest.Mock;
  let mockAuthSingle: jest.Mock;
  let mockMembersSelect: jest.Mock;
  let mockMembersEqOrg: jest.Mock;
  let mockMembersEqUser: jest.Mock;
  let mockMembersMaybeSingle: jest.Mock;
  let mockMembersInsert: jest.Mock;
  let mockMembersUpdate: jest.Mock;
  let mockMembersDelete: jest.Mock;
  let mockMembersMatch: jest.Mock;
  let mockMembersSelectCount: jest.Mock;


  beforeEach(async () => {
    jest.clearAllMocks();

    // --- Set up mock structure for different tables --- 
    mockAuthSingle = jest.fn();
    mockAuthEq = jest.fn().mockReturnValue({ single: mockAuthSingle });
    mockAuthSelect = jest.fn().mockReturnValue({ eq: mockAuthEq });
    mockFromAuthUsers = jest.fn().mockReturnValue({ select: mockAuthSelect });
    
    mockMembersMaybeSingle = jest.fn();
    mockMembersEqUser = jest.fn().mockReturnValue({ maybeSingle: mockMembersMaybeSingle });
    mockMembersEqOrg = jest.fn().mockReturnValue({ eq: mockMembersEqUser }); // For checking existing member
    mockMembersSelectCount = jest.fn();
    mockMembersSelect = jest.fn().mockImplementation((selectString) => {
        // Handle different select calls on members table
        if (selectString === '*') { // For checking existing member
            return { eq: mockMembersEqOrg }; 
        }
        if (selectString === 'role') { // For getting role
             return { eq: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ maybeSingle: mockMembersMaybeSingle }) }) }; 
        }
        if (selectString === 'id') { // For counting admins
            return { eq: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ data: [{id: 'admin1'}], error: null }) }) }; 
        }
        // Default/fallback for other selects like finding members
        return { eq: mockMembersEqOrg }; 
    });
    mockMembersInsert = jest.fn().mockResolvedValue({ error: null }); // Simplified insert mock
    mockMembersMatch = jest.fn();
    mockMembersUpdate = jest.fn().mockReturnValue({ match: mockMembersMatch, eq: jest.fn().mockReturnThis() }); // Mock eq for update too
    mockMembersDelete = jest.fn().mockReturnValue({ eq: jest.fn().mockReturnThis() }); // Mock eq for delete

    mockFromOrgMembers = jest.fn().mockReturnValue({
        select: mockMembersSelect,
        insert: mockMembersInsert,
        update: mockMembersUpdate,
        delete: mockMembersDelete,
    });

    // Main client mock chooser
    (mockSupabaseClient.from as jest.Mock).mockImplementation((tableName) => {
      if (tableName === 'auth.users') return mockFromAuthUsers();
      if (tableName === 'organization_members') return mockFromOrgMembers();
      // Fallback
      return {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn(),
        single: jest.fn(),
      };
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        Logger,
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // --- addMember Test --- 
  describe('addMember', () => {
    const orgId = 'org-123';
    const emailToAdd = 'new@member.com';
    const foundUserId = 'user-found-by-email';
    const role = OrganizationRole.EDITOR;
    const inviteDto: InviteMemberDto = { email: emailToAdd, role };

    it('should find user by email, check membership, add member, and log success', async () => {
      // Mock user lookup success
      mockAuthSingle.mockResolvedValue({ data: { id: foundUserId }, error: null });
      // Mock existing member check (not found)
      mockMembersMaybeSingle.mockResolvedValue({ data: null, error: null });
      // Mock insert success (returns void)
      mockMembersInsert.mockResolvedValue({ error: null });

      await service.addMember(orgId, inviteDto);

      // Verify user lookup
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('auth.users');
      expect(mockAuthSelect).toHaveBeenCalledWith('id');
      expect(mockAuthEq).toHaveBeenCalledWith('email', emailToAdd);
      expect(mockAuthSingle).toHaveBeenCalledTimes(1);
      
      // Verify member check
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('organization_members');
      expect(mockMembersSelect).toHaveBeenCalledWith('*');
      expect(mockMembersEqOrg).toHaveBeenCalledWith('organization_id', orgId);
      expect(mockMembersEqUser).toHaveBeenCalledWith('user_id', foundUserId);
      expect(mockMembersMaybeSingle).toHaveBeenCalledTimes(1);

      // Verify insert
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('organization_members');
      expect(mockMembersInsert).toHaveBeenCalledWith({
        organization_id: orgId,
        user_id: foundUserId, // Use the found userId
        role: inviteDto.role,
      });
      // No log check as service doesn't log on success
    });

    it('should throw NotFoundException if user email is not found', async () => {
      // Mock user lookup failure
      mockAuthSingle.mockResolvedValue({ data: null, error: { message: 'Not found', code: 'PGRST116'} }); // Simulate Supabase not found

      await expect(service.addMember(orgId, inviteDto))
        .rejects.toThrow(new NotFoundException(`User with email ${emailToAdd} not found`));
        
      expect(mockMembersInsert).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if user is already a member', async () => {
        // Mock user lookup success
        mockAuthSingle.mockResolvedValue({ data: { id: foundUserId }, error: null });
        // Mock existing member check (found)
        mockMembersMaybeSingle.mockResolvedValue({ data: { id: 'existing-member'}, error: null });

        await expect(service.addMember(orgId, inviteDto))
            .rejects.toThrow(new ConflictException(`User is already a member of this organization`));
            
        expect(mockMembersInsert).not.toHaveBeenCalled();
    });
    
    it('should throw InternalServerErrorException if checking membership fails', async () => {
        // Mock user lookup success
        mockAuthSingle.mockResolvedValue({ data: { id: foundUserId }, error: null });
        // Mock member check error
        const checkError = { message: 'Check failed', code: 'DB500' };
        mockMembersMaybeSingle.mockResolvedValue({ data: null, error: checkError });

        await expect(service.addMember(orgId, inviteDto))
            .rejects.toThrow(new InternalServerErrorException(`Failed to check existing membership: ${checkError.message}`));
            
        expect(mockMembersInsert).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if insert fails', async () => {
        // Mock user lookup success
        mockAuthSingle.mockResolvedValue({ data: { id: foundUserId }, error: null });
        // Mock existing member check (not found)
        mockMembersMaybeSingle.mockResolvedValue({ data: null, error: null });
        // Mock insert failure
        const insertError = { message: 'Insert failed', code: 'DB500' };
        mockMembersInsert.mockResolvedValue({ error: insertError });

        await expect(service.addMember(orgId, inviteDto))
            .rejects.toThrow(new InternalServerErrorException(`Failed to add member: ${insertError.message}`));
    });
  });

  // --- findAllInOrganization Test --- 
  describe('findAllInOrganization', () => { 
    const orgId = 'org-456';
    const mockDbMembers = [
      { id: 'm1', user_id: 'u1', role: 'admin', organization_id: orgId, joined_at: '2023-01-01T10:00:00Z', user: { id: 'u1', email: 'admin@test.com'} }, 
      { id: 'm2', user_id: 'u2', role: 'editor', organization_id: orgId, joined_at: '2023-01-02T11:00:00Z', user: { id: 'u2', email: 'editor@test.com'} },
    ];
     // Expected result structure from service mapping
     const expectedMembers = [
       { id: 'u1', email: 'admin@test.com', role: OrganizationRole.ADMIN, joinedAt: new Date('2023-01-01T10:00:00Z') },
       { id: 'u2', email: 'editor@test.com', role: OrganizationRole.EDITOR, joinedAt: new Date('2023-01-02T11:00:00Z') },
     ];

    beforeEach(() => {
        // Mock the specific select().eq() for this method
        mockMembersEqOrg = jest.fn().mockResolvedValue({ data: mockDbMembers, error: null });
        mockMembersSelect.mockReturnValue({ eq: mockMembersEqOrg }); 
    });

    it('should return mapped members of the organization', async () => {
      const result = await service.findAllInOrganization(orgId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('organization_members');
      expect(mockMembersSelect).toHaveBeenCalledWith(expect.stringContaining('user:user_id'));
      expect(mockMembersEqOrg).toHaveBeenCalledWith('organization_id', orgId);
      expect(result).toEqual(expectedMembers); 
    });

    it('should return an empty array if organization has no members', async () => {
        mockMembersEqOrg.mockResolvedValue({ data: [], error: null });
        const result = await service.findAllInOrganization(orgId);
        expect(result).toEqual([]);
    });

    it('should throw InternalServerErrorException if select fails', async () => {
        const dbError = { message: 'Select failed', code: 'DB500' };
        mockMembersEqOrg.mockResolvedValue({ data: null, error: dbError });
        await expect(service.findAllInOrganization(orgId))
            .rejects.toThrow(new InternalServerErrorException(`Failed to fetch members: ${dbError.message}`));
    });
  });
  
  // --- updateMemberRole Test --- 
  describe('updateMemberRole', () => {
    const orgId = 'org-789';
    const userId = 'user-to-update';
    const currentRole = OrganizationRole.EDITOR;
    const updateDto: UpdateMemberRoleDto = { role: OrganizationRole.VIEWER };
    let mockUpdateEqUser: jest.Mock;
    let mockSelectEqAdminCount: jest.Mock;

    beforeEach(() => {
        // Mock member check success (default)
        mockMembersMaybeSingle.mockResolvedValue({ data: { id: 'member-id', role: currentRole }, error: null });
        // Mock update success (default)
        mockUpdateEqUser = jest.fn().mockResolvedValue({ error: null });
        mockMembersUpdate.mockReturnValue({ eq: jest.fn().mockReturnValue({ eq: mockUpdateEqUser }) });
        // Mock admin count (default > 1)
        mockSelectEqAdminCount = jest.fn().mockResolvedValue({ data: [{id: 'admin1'}, {id: 'admin2'}], error: null })
        mockMembersSelect.mockImplementation((selectString, options) => {
            if (selectString === 'id' && options && options.count === 'exact') { // For counting admins
                return { eq: jest.fn().mockReturnValue({ eq: mockSelectEqAdminCount }) }; 
            }
            return { eq: mockMembersEqOrg }; // Fallback
        });
    });

    it('should update the member role if member exists and not last admin', async () => {
      await service.updateMemberRole(orgId, userId, updateDto);

      // Verify member check
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('organization_members');
      expect(mockMembersSelect).toHaveBeenCalledWith('*');
      expect(mockMembersEqOrg).toHaveBeenCalledWith('organization_id', orgId);
      expect(mockMembersEqUser).toHaveBeenCalledWith('user_id', userId);
      expect(mockMembersMaybeSingle).toHaveBeenCalledTimes(1);
      
      // Verify update
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('organization_members');
      expect(mockMembersUpdate).toHaveBeenCalledWith({ role: updateDto.role });
      expect(mockUpdateEqUser).toHaveBeenCalledTimes(1); // Called by the chained .eq().eq()
      // Verify admin count was NOT called
      expect(mockSelectEqAdminCount).not.toHaveBeenCalled();
    });
    
    it('should update role if member is the only admin but role is still admin', async () => {
      // Setup: Member is admin, new role is admin
      mockMembersMaybeSingle.mockResolvedValue({ data: { id: 'member-id', role: OrganizationRole.ADMIN }, error: null });
      const adminDto: UpdateMemberRoleDto = { role: OrganizationRole.ADMIN };

      await service.updateMemberRole(orgId, userId, adminDto);

      expect(mockMembersUpdate).toHaveBeenCalledWith({ role: adminDto.role });
      expect(mockUpdateEqUser).toHaveBeenCalledTimes(1);
      // Admin count check should NOT happen
      expect(mockSelectEqAdminCount).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if member to update is not found', async () => {
        mockMembersMaybeSingle.mockResolvedValue({ data: null, error: null }); // Simulate no match
        await expect(service.updateMemberRole(orgId, userId, updateDto))
            .rejects.toThrow(new NotFoundException(`User is not a member of this organization`));
        expect(mockMembersUpdate).not.toHaveBeenCalled();
    });
    
    it('should throw BadRequestException if trying to demote the last admin', async () => {
      // Setup: Member is admin, new role is editor
      mockMembersMaybeSingle.mockResolvedValue({ data: { id: 'member-id', role: OrganizationRole.ADMIN }, error: null });
      const demoteDto: UpdateMemberRoleDto = { role: OrganizationRole.EDITOR };
      // Mock admin count to be 1
      mockSelectEqAdminCount.mockResolvedValue({ data: [{id: 'admin1'}], error: null });

      await expect(service.updateMemberRole(orgId, userId, demoteDto))
          .rejects.toThrow(new BadRequestException(`Cannot demote the last admin of the organization`));

      // Verify admin count was checked
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('organization_members');
      expect(mockMembersSelect).toHaveBeenCalledWith('id', { count: 'exact' });
      expect(mockSelectEqAdminCount).toHaveBeenCalledTimes(1);
      // Verify update was not called
      expect(mockMembersUpdate).not.toHaveBeenCalled();
    });
    
    it('should throw InternalServerErrorException if checking membership fails', async () => {
        const checkError = { message: 'Check failed', code: 'DB500' };
        mockMembersMaybeSingle.mockResolvedValue({ data: null, error: checkError });
        await expect(service.updateMemberRole(orgId, userId, updateDto))
            .rejects.toThrow(new InternalServerErrorException(`Failed to check membership: ${checkError.message}`));
    });
    
    it('should throw InternalServerErrorException if checking admin count fails', async () => {
      // Setup: Member is admin, new role is editor
      mockMembersMaybeSingle.mockResolvedValue({ data: { id: 'member-id', role: OrganizationRole.ADMIN }, error: null });
      const demoteDto: UpdateMemberRoleDto = { role: OrganizationRole.EDITOR };
      // Mock admin count query failure
      const countError = { message: 'Count failed', code: 'DB500' };
      mockSelectEqAdminCount.mockResolvedValue({ data: null, error: countError });

      await expect(service.updateMemberRole(orgId, userId, demoteDto))
          .rejects.toThrow(new InternalServerErrorException(`Failed to check admin count: ${countError.message}`));
    });

    it('should throw InternalServerErrorException if update query fails', async () => {
        const updateError = { message: 'Update failed', code: 'DB500' };
        mockUpdateEqUser.mockResolvedValue({ error: updateError }); // Simulate update error
        await expect(service.updateMemberRole(orgId, userId, updateDto))
            .rejects.toThrow(new InternalServerErrorException(`Failed to update member role: ${updateError.message}`));
    });
  });

  // --- removeMember Test --- 
  describe('removeMember', () => {
    const orgId = 'org-abc';
    const userId = 'user-to-remove';
    let mockDeleteEqUser: jest.Mock;
    let mockSelectEqAdminCount: jest.Mock;

    beforeEach(() => {
        // Mock member check (default: non-admin found)
        mockMembersMaybeSingle.mockResolvedValue({ data: { role: OrganizationRole.EDITOR }, error: null });
        // Mock delete success (default)
        mockDeleteEqUser = jest.fn().mockResolvedValue({ error: null });
        mockMembersDelete.mockReturnValue({ eq: jest.fn().mockReturnValue({ eq: mockDeleteEqUser }) });
         // Mock admin count (default > 1)
        mockSelectEqAdminCount = jest.fn().mockResolvedValue({ data: [{id: 'admin1'}, {id: 'admin2'}], error: null })
        mockMembersSelect.mockImplementation((selectString, options) => {
            if (selectString === 'id' && options && options.count === 'exact') { // For counting admins
                return { eq: jest.fn().mockReturnValue({ eq: mockSelectEqAdminCount }) }; 
            }
            if (selectString === 'role') { // For getting role on check
                return { eq: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ maybeSingle: mockMembersMaybeSingle }) }) }; 
            }
            return { eq: mockMembersEqOrg }; // Fallback
        });
    });

    it('should remove the member if found and not last admin', async () => {
      await service.removeMember(orgId, userId);
      
      // Verify member check
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('organization_members');
      expect(mockMembersSelect).toHaveBeenCalledWith('role');
      expect(mockMembersMaybeSingle).toHaveBeenCalledTimes(1);
      
      // Verify delete call
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('organization_members');
      expect(mockMembersDelete).toHaveBeenCalledTimes(1);
      expect(mockDeleteEqUser).toHaveBeenCalledTimes(1);
      // Verify admin count NOT checked
      expect(mockSelectEqAdminCount).not.toHaveBeenCalled();
      // No log check as service doesn't log
    });
    
     it('should remove an admin member if not the last admin', async () => {
       // Setup: Member is admin
       mockMembersMaybeSingle.mockResolvedValue({ data: { role: OrganizationRole.ADMIN }, error: null });
       // Admin count is > 1 (default mock)
       
       await service.removeMember(orgId, userId);
       
       expect(mockMembersMaybeSingle).toHaveBeenCalledTimes(1);
       // Verify admin count was checked
       expect(mockSupabaseClient.from).toHaveBeenCalledWith('organization_members');
       expect(mockMembersSelect).toHaveBeenNthCalledWith(1, 'role');
       expect(mockMembersSelect).toHaveBeenNthCalledWith(2, 'id', { count: 'exact' });
       expect(mockSelectEqAdminCount).toHaveBeenCalledTimes(1);
       // Verify delete was called
       expect(mockDeleteEqUser).toHaveBeenCalledTimes(1);
     });

    it('should throw NotFoundException if member to remove is not found', async () => {
        mockMembersMaybeSingle.mockResolvedValue({ data: null, error: null }); // Simulate member not found
        await expect(service.removeMember(orgId, userId))
            .rejects.toThrow(new NotFoundException(`User is not a member of this organization`));
        expect(mockMembersDelete).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if trying to remove the last admin', async () => {
      // Setup: Member is admin
      mockMembersMaybeSingle.mockResolvedValue({ data: { role: OrganizationRole.ADMIN }, error: null });
      // Mock admin count to be 1
      mockSelectEqAdminCount.mockResolvedValue({ data: [{id: 'admin1'}], error: null });

      await expect(service.removeMember(orgId, userId))
          .rejects.toThrow(new BadRequestException(`Cannot remove the last admin of the organization`));
          
       // Verify admin count was checked
       expect(mockSupabaseClient.from).toHaveBeenCalledWith('organization_members');
       expect(mockMembersSelect).toHaveBeenNthCalledWith(1, 'role');
       expect(mockMembersSelect).toHaveBeenNthCalledWith(2, 'id', { count: 'exact' });
       expect(mockSelectEqAdminCount).toHaveBeenCalledTimes(1);
       // Verify delete was not called
       expect(mockMembersDelete).not.toHaveBeenCalled();
    });
    
    it('should throw InternalServerErrorException if checking membership fails', async () => {
        const checkError = { message: 'Check failed', code: 'DB500' };
        mockMembersMaybeSingle.mockResolvedValue({ data: null, error: checkError });
        await expect(service.removeMember(orgId, userId))
            .rejects.toThrow(new InternalServerErrorException(`Failed to check membership: ${checkError.message}`));
    });
    
    it('should throw InternalServerErrorException if checking admin count fails', async () => {
      // Setup: Member is admin
      mockMembersMaybeSingle.mockResolvedValue({ data: { role: OrganizationRole.ADMIN }, error: null });
      // Mock admin count query failure
      const countError = { message: 'Count failed', code: 'DB500' };
      mockSelectEqAdminCount.mockResolvedValue({ data: null, error: countError });

      await expect(service.removeMember(orgId, userId))
          .rejects.toThrow(new InternalServerErrorException(`Failed to check admin count: ${countError.message}`));
    });

    it('should throw InternalServerErrorException if delete query fails', async () => {
        const deleteError = { message: 'Delete failed', code: 'DB500' };
        // Mock member check success (non-admin)
        mockMembersMaybeSingle.mockResolvedValue({ data: { role: OrganizationRole.EDITOR }, error: null });
        // Mock delete failure
        mockDeleteEqUser.mockResolvedValue({ error: deleteError }); 
        
        await expect(service.removeMember(orgId, userId))
            .rejects.toThrow(new InternalServerErrorException(`Failed to remove member: ${deleteError.message}`));
    });
  });
}); 