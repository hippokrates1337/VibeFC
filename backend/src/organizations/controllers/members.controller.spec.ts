import { Test, TestingModule } from '@nestjs/testing';
import { MembersController } from './members.controller';
import { MembersService } from '../services/members.service';
import { OrganizationsService } from '../services/organizations.service'; // Needed for potential role checks
import { INestApplication, ValidationPipe, ClassSerializerInterceptor, NotFoundException, ConflictException, BadRequestException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as request from 'supertest';
import { Request, Response, NextFunction } from 'express'; 
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard'; 
import { InviteMemberDto, UpdateMemberRoleDto, OrganizationRole } from '../dto/member.dto';
import { Logger } from '@nestjs/common';

// Mock Services
const mockMembersService = {
  findAllInOrganization: jest.fn(),
  addMember: jest.fn(),
  updateMemberRole: jest.fn(),
  removeMember: jest.fn(),
};
const mockOrganizationsService = {
    // Mock methods if RolesGuard depends on it (e.g., checking user role)
    getUserRoleInOrganization: jest.fn().mockResolvedValue(OrganizationRole.ADMIN), // Default to admin for simplicity
};

// Mock Guards
const mockJwtAuthGuard = { 
    canActivate: jest.fn((context) => {
        // Default to true, tests will override or mockImplementation
        return true; 
    }) 
}; 
const mockRolesGuard = {
    canActivate: jest.fn((context) => {
        // Simulate role check - allow by default
        return true; 
    })
};

// Helper to simulate user attached by JwtAuthGuard
const mockUser = { id: 'user-jwt-123' };

describe('MembersController (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MembersController],
      providers: [
        { provide: MembersService, useValue: mockMembersService },
        { provide: OrganizationsService, useValue: mockOrganizationsService }, 
        Reflector, 
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue(mockJwtAuthGuard)
    .overrideGuard(RolesGuard) 
    .useValue(mockRolesGuard)
    .compile();

    app = moduleFixture.createNestApplication();
    
    app.use((req: Request & { user?: any }, res: Response, next: NextFunction) => {
        req.user = mockUser; 
        next();
    });
    
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockJwtAuthGuard.canActivate.mockClear().mockReturnValue(true);
    mockRolesGuard.canActivate.mockClear().mockReturnValue(true);
  });

  afterAll(async () => {
    await app.close();
  });

  const orgId = 'org-test-123';
  const memberUserId = 'member-user-456';

  // --- GET /organizations/:orgId/members --- 
  describe(`GET /organizations/${orgId}/members`, () => {
    const mockMemberList = [
        { id: memberUserId, email: 'member@test.com', role: OrganizationRole.EDITOR, joinedAt: new Date() }
    ];

    it('should return list of members (200)', async () => {
      mockMembersService.findAllInOrganization.mockResolvedValue(mockMemberList);

      await request(app.getHttpServer())
        .get(`/organizations/${orgId}/members`)
        .expect(200)
        .expect((res) => {
          // Dates need careful comparison
          expect(res.body).toHaveLength(1);
          expect(res.body[0].id).toEqual(mockMemberList[0].id);
          expect(res.body[0].role).toEqual(mockMemberList[0].role);
        });
        
      expect(mockJwtAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      // RolesGuard might be called implicitly if globally applied or on the controller
      // expect(mockRolesGuard.canActivate).toHaveBeenCalledTimes(1); 
      expect(mockMembersService.findAllInOrganization).toHaveBeenCalledWith(orgId, expect.any(Object));
    });
    
    it('should return 401 if JWT guard denies', async () => {
        // Throwing mimics the real guard behavior better for NestJS exception filters
        mockJwtAuthGuard.canActivate.mockImplementation(() => { throw new UnauthorizedException(); }); 
        await request(app.getHttpServer())
            .get(`/organizations/${orgId}/members`)
            .expect(401);
        expect(mockRolesGuard.canActivate).not.toHaveBeenCalled();
    });
    
    // Add test for RolesGuard denial if applicable (e.g., only members can view)
    it('should return 403 if Roles guard denies view access', async () => {
        mockRolesGuard.canActivate.mockReturnValue(false); // Simulate insufficient role
        await request(app.getHttpServer())
            .get(`/organizations/${orgId}/members`)
            .expect(403);
        expect(mockMembersService.findAllInOrganization).not.toHaveBeenCalled();
    });

    it('should return 500 if service throws', async () => {
        // Temporarily silence the logger for this expected error
        const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
        
        mockMembersService.findAllInOrganization.mockRejectedValue(new Error('Service Error'));
        await request(app.getHttpServer())
            .get(`/organizations/${orgId}/members`)
            .expect(500);
            
        // Restore the original logger implementation
        loggerErrorSpy.mockRestore();
    });
  });

  // --- POST /organizations/:orgId/members --- 
  describe(`POST /organizations/${orgId}/members`, () => {
    const inviteDto: InviteMemberDto = { email: 'invite@test.com', role: OrganizationRole.VIEWER };

    it('should invite a member and return 201 Created', async () => {
      // Service returns void on success
      mockMembersService.addMember.mockResolvedValue(undefined); 

      await request(app.getHttpServer())
        .post(`/organizations/${orgId}/members`)
        .send(inviteDto)
        .expect(201);
        
      expect(mockJwtAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockRolesGuard.canActivate).toHaveBeenCalledTimes(1); // Expect admin role check
      expect(mockMembersService.addMember).toHaveBeenCalledWith(orgId, inviteDto, expect.any(Object));
    });

    it('should return 400 on invalid DTO', async () => {
        const invalidDto = { email: 'not-an-email', role: 'invalid-role' };
        await request(app.getHttpServer())
          .post(`/organizations/${orgId}/members`)
          .send(invalidDto)
          .expect(400);
      });

    it('should return 401 if JWT guard denies', async () => {
        mockJwtAuthGuard.canActivate.mockImplementation(() => { throw new UnauthorizedException(); });
        await request(app.getHttpServer())
            .post(`/organizations/${orgId}/members`)
            .send(inviteDto)
            .expect(401);
        expect(mockRolesGuard.canActivate).not.toHaveBeenCalled();
    });
    
    it('should return 403 if Roles guard denies (non-admin)', async () => {
        mockRolesGuard.canActivate.mockReturnValue(false); 
        await request(app.getHttpServer())
            .post(`/organizations/${orgId}/members`)
            .send(inviteDto)
            .expect(403);
        expect(mockMembersService.addMember).not.toHaveBeenCalled();
    });

    it('should return 404 if service throws NotFoundException (user not found)', async () => {
        mockMembersService.addMember.mockRejectedValue(new NotFoundException());
        await request(app.getHttpServer())
            .post(`/organizations/${orgId}/members`)
            .send(inviteDto)
            .expect(404);
    });
    
    it('should return 409 if service throws ConflictException (already member)', async () => {
        mockMembersService.addMember.mockRejectedValue(new ConflictException());
        await request(app.getHttpServer())
            .post(`/organizations/${orgId}/members`)
            .send(inviteDto)
            .expect(409);
    });

    it('should return 500 if service throws other errors', async () => {
        mockMembersService.addMember.mockRejectedValue(new InternalServerErrorException());
        await request(app.getHttpServer())
            .post(`/organizations/${orgId}/members`)
            .send(inviteDto)
            .expect(500);
    });
  });

  // --- PUT /organizations/:orgId/members/:userId --- 
  describe(`PUT /organizations/${orgId}/members/${memberUserId}`, () => {
    const updateDto: UpdateMemberRoleDto = { role: OrganizationRole.ADMIN };

    it('should update member role and return 204 No Content', async () => {
      // Service returns void on success
      mockMembersService.updateMemberRole.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .put(`/organizations/${orgId}/members/${memberUserId}`)
        .send(updateDto)
        .expect(204); // PUT/PATCH often return 204 on success with no body

      expect(mockJwtAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockRolesGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockMembersService.updateMemberRole).toHaveBeenCalledWith(orgId, memberUserId, updateDto, expect.any(Object));
    });

    it('should return 400 on invalid DTO', async () => {
        const invalidDto = { role: 'not-a-role' };
        await request(app.getHttpServer())
          .put(`/organizations/${orgId}/members/${memberUserId}`)
          .send(invalidDto)
          .expect(400);
      });
      
     it('should return 400 if service throws BadRequestException (last admin)', async () => {
        mockMembersService.updateMemberRole.mockRejectedValue(new BadRequestException());
        await request(app.getHttpServer())
          .put(`/organizations/${orgId}/members/${memberUserId}`)
          .send(updateDto)
          .expect(400);
      });

    it('should return 401 if JWT guard denies', async () => {
        mockJwtAuthGuard.canActivate.mockImplementation(() => { throw new UnauthorizedException(); });
        await request(app.getHttpServer())
            .put(`/organizations/${orgId}/members/${memberUserId}`)
            .send(updateDto)
            .expect(401);
        expect(mockRolesGuard.canActivate).not.toHaveBeenCalled();
    });
    
    it('should return 403 if Roles guard denies', async () => {
        mockRolesGuard.canActivate.mockReturnValue(false); 
        await request(app.getHttpServer())
            .put(`/organizations/${orgId}/members/${memberUserId}`)
            .send(updateDto)
            .expect(403);
    });

    it('should return 404 if service throws NotFoundException', async () => {
        mockMembersService.updateMemberRole.mockRejectedValue(new NotFoundException());
        await request(app.getHttpServer())
            .put(`/organizations/${orgId}/members/${memberUserId}`)
            .send(updateDto)
            .expect(404);
    });

    it('should return 500 if service throws other errors', async () => {
        mockMembersService.updateMemberRole.mockRejectedValue(new InternalServerErrorException());
        await request(app.getHttpServer())
            .put(`/organizations/${orgId}/members/${memberUserId}`)
            .send(updateDto)
            .expect(500);
    });
  });

  // --- DELETE /organizations/:orgId/members/:userId --- 
  describe(`DELETE /organizations/${orgId}/members/${memberUserId}`, () => {

    it('should remove member and return 204 No Content', async () => {
       // Service returns void on success
      mockMembersService.removeMember.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete(`/organizations/${orgId}/members/${memberUserId}`)
        .expect(204);
        
      expect(mockJwtAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockRolesGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockMembersService.removeMember).toHaveBeenCalledWith(orgId, memberUserId, expect.any(Object));
    });

    it('should return 401 if JWT guard denies', async () => {
        mockJwtAuthGuard.canActivate.mockImplementation(() => { throw new UnauthorizedException(); });
        await request(app.getHttpServer())
            .delete(`/organizations/${orgId}/members/${memberUserId}`)
            .expect(401);
        expect(mockRolesGuard.canActivate).not.toHaveBeenCalled();
    });
    
    it('should return 403 if Roles guard denies', async () => {
        mockRolesGuard.canActivate.mockReturnValue(false); 
        await request(app.getHttpServer())
            .delete(`/organizations/${orgId}/members/${memberUserId}`)
            .expect(403);
    });
    
    it('should return 400 if service throws BadRequestException (last admin)', async () => {
        mockMembersService.removeMember.mockRejectedValue(new BadRequestException());
        await request(app.getHttpServer())
          .delete(`/organizations/${orgId}/members/${memberUserId}`)
          .expect(400);
      });

    it('should return 404 if service throws NotFoundException', async () => {
        mockMembersService.removeMember.mockRejectedValue(new NotFoundException());
        await request(app.getHttpServer())
            .delete(`/organizations/${orgId}/members/${memberUserId}`)
            .expect(404);
    });

    it('should return 500 if service throws other errors', async () => {
        mockMembersService.removeMember.mockRejectedValue(new InternalServerErrorException());
        await request(app.getHttpServer())
            .delete(`/organizations/${orgId}/members/${memberUserId}`)
            .expect(500);
    });
  });

}); 