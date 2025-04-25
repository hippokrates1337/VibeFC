import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from '../services/organizations.service';
import { MembersService } from '../services/members.service';
import { 
  INestApplication, 
  ValidationPipe, 
  ClassSerializerInterceptor, 
  NotFoundException, 
  InternalServerErrorException,
  UnauthorizedException,
  ForbiddenException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as request from 'supertest';
import { Request, Response, NextFunction } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { CreateOrganizationDto, UpdateOrganizationDto } from '../dto/organization.dto';
import { OrganizationRole } from '../dto/member.dto';

const mockUser = { id: 'user-jwt-123' };

// Mock implementations for dependencies
const mockOrganizationsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const mockMembersService = {
  addMember: jest.fn(),
  findMembers: jest.fn(),
  updateMemberRole: jest.fn(),
  removeMember: jest.fn(),
};

// Properly mock guards to throw appropriate exceptions when access is denied
const mockJwtAuthGuard = { 
  canActivate: jest.fn((context) => {
    // Add user to request object
    const req = context.switchToHttp().getRequest();
    req.user = mockUser;
    return true;
  }) 
};

const mockRolesGuard = { 
  canActivate: jest.fn((context) => {
    return true;
  }) 
};

describe('OrganizationsController (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
     controllers: [OrganizationsController],
      providers: [
        { provide: OrganizationsService, useValue: mockOrganizationsService },
        { provide: MembersService, useValue: mockMembersService }, 
        Reflector, 
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue(mockJwtAuthGuard)
    .overrideGuard(RolesGuard) 
    .useValue(mockRolesGuard)
    .compile();

    app = moduleFixture.createNestApplication();
    
    // This middleware isn't needed since the guard mock already adds the user
    // app.use((req: Request & { user?: any }, res: Response, next: NextFunction) => {
    //     req.user = mockUser; 
    //     next();
    // });
    
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    
    await app.init();
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Setup the default behavior for guards
    mockJwtAuthGuard.canActivate.mockImplementation((context) => {
      const req = context.switchToHttp().getRequest();
      req.user = mockUser;
      return true;
    });
    
    mockRolesGuard.canActivate.mockImplementation(() => true);
    
    mockOrganizationsService.findAll.mockClear();
    mockOrganizationsService.findOne.mockClear();
  });

  afterAll(async () => {
    await app.close();
  });

  const orgId = 'test-org-123';

  // --- GET /organizations ---
  describe('GET /organizations', () => {
    const mockOrgs = [
      { id: 'org-1', name: 'Org One', owner_id: 'owner-1', created_at: new Date() },
      { id: 'org-2', name: 'Org Two', owner_id: 'owner-2', created_at: new Date() },
    ];

    it('should return a list of organizations for the user (200 OK)', async () => {
      mockOrganizationsService.findAll.mockResolvedValue(mockOrgs);

      await request(app.getHttpServer())
        .get('/organizations')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveLength(2);
          expect(res.body[0].name).toEqual(mockOrgs[0].name);
          // Add more specific checks if needed, especially for dates
        });

      expect(mockJwtAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockOrganizationsService.findAll).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return 401 if JWT guard denies', async () => {
      // Make the guard throw the appropriate exception
      mockJwtAuthGuard.canActivate.mockImplementation(() => {
        throw new UnauthorizedException();
      });
      
      await request(app.getHttpServer())
        .get('/organizations')
        .expect(401);
    });

    it('should return 500 if service throws', async () => {
      mockOrganizationsService.findAll.mockRejectedValue(new InternalServerErrorException());
      await request(app.getHttpServer())
        .get('/organizations')
        .expect(500);
    });
  });

  // --- GET /organizations/:orgId ---
  describe(`GET /organizations/${orgId}`, () => {
    const mockOrg = { id: orgId, name: 'Specific Org', owner_id: 'owner-spec', created_at: new Date() };

    it('should return the specific organization (200 OK)', async () => {
      mockOrganizationsService.findOne.mockResolvedValue(mockOrg);

      await request(app.getHttpServer())
        .get(`/organizations/${orgId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toEqual(mockOrg.id);
          expect(res.body.name).toEqual(mockOrg.name);
        });

      expect(mockJwtAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      // The controller has RolesGuard on this endpoint
      expect(mockRolesGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockOrganizationsService.findOne).toHaveBeenCalledWith(orgId, mockUser.id);
    });

    it('should return 401 if JWT guard denies', async () => {
      // Make the guard throw the appropriate exception
      mockJwtAuthGuard.canActivate.mockImplementation(() => {
        throw new UnauthorizedException();
      });
      
      await request(app.getHttpServer())
        .get(`/organizations/${orgId}`)
        .expect(401);
    });

    it('should return 403 if Roles guard denies', async () => {
      // Make the roles guard throw a ForbiddenException
      mockRolesGuard.canActivate.mockImplementation(() => {
        throw new ForbiddenException();
      });
      
      await request(app.getHttpServer())
        .get(`/organizations/${orgId}`)
        .expect(403);
      
      // Service shouldn't be called because RolesGuard will block access
      expect(mockOrganizationsService.findOne).not.toHaveBeenCalled();
    });

    it('should return 404 if service throws NotFoundException', async () => {
      mockOrganizationsService.findOne.mockRejectedValue(new NotFoundException());
      await request(app.getHttpServer())
        .get(`/organizations/${orgId}`)
        .expect(404);
    });

    it('should return 500 if service throws other errors', async () => {
      mockOrganizationsService.findOne.mockRejectedValue(new InternalServerErrorException());
      await request(app.getHttpServer())
        .get(`/organizations/${orgId}`)
        .expect(500);
    });
  });

  // --- POST /organizations ---
  describe('POST /organizations', () => {
    const createDto: CreateOrganizationDto = { name: 'New Org' };
    const createdOrg = { id: 'new-org-456', ...createDto, owner_id: mockUser.id, created_at: new Date() };

    it('should create a new organization (201 Created)', async () => {
      mockOrganizationsService.create.mockResolvedValue(createdOrg);

      await request(app.getHttpServer())
        .post('/organizations')
        .send(createDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toEqual(createdOrg.id);
          expect(res.body.name).toEqual(createDto.name);
        });

      expect(mockJwtAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockOrganizationsService.create).toHaveBeenCalledWith(mockUser.id, createDto);
    });

    it('should return 400 for invalid data', async () => {
      await request(app.getHttpServer())
        .post('/organizations')
        .send({ invalidField: 'data' }) // Send data that fails validation
        .expect(400);
        
      expect(mockOrganizationsService.create).not.toHaveBeenCalled();
    });

    it('should return 401 if JWT guard denies', async () => {
      mockJwtAuthGuard.canActivate.mockImplementation(() => { throw new UnauthorizedException(); });
      await request(app.getHttpServer())
        .post('/organizations')
        .send(createDto)
        .expect(401);
    });

    it('should return 500 if service throws', async () => {
      mockOrganizationsService.create.mockRejectedValue(new InternalServerErrorException());
      await request(app.getHttpServer())
        .post('/organizations')
        .send(createDto)
        .expect(500);
    });
  });

  // --- PUT /organizations/:orgId ---
  describe(`PUT /organizations/${orgId}`, () => {
    const updateDto: UpdateOrganizationDto = { name: 'Updated Org Name' };

    it('should update the organization (204 No Content)', async () => {
      mockOrganizationsService.update.mockResolvedValue(undefined); // update returns void

      await request(app.getHttpServer())
        .put(`/organizations/${orgId}`)
        .send(updateDto)
        .expect(204); // Expect 204 No Content on successful PUT

      expect(mockJwtAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockRolesGuard.canActivate).toHaveBeenCalledTimes(1); // RolesGuard is used
      expect(mockOrganizationsService.update).toHaveBeenCalledWith(orgId, updateDto);
    });
    
    it('should return 400 for invalid update data', async () => {
      await request(app.getHttpServer())
        .put(`/organizations/${orgId}`)
        .send({ name: '' }) // Example invalid data (empty name might fail validation)
        .expect(400);
        
      expect(mockOrganizationsService.update).not.toHaveBeenCalled();
    });

    it('should return 401 if JWT guard denies', async () => {
      mockJwtAuthGuard.canActivate.mockImplementation(() => { throw new UnauthorizedException(); });
      await request(app.getHttpServer())
        .put(`/organizations/${orgId}`)
        .send(updateDto)
        .expect(401);
    });

    it('should return 403 if Roles guard denies', async () => {
      mockRolesGuard.canActivate.mockImplementation(() => { throw new ForbiddenException(); });
      await request(app.getHttpServer())
        .put(`/organizations/${orgId}`)
        .send(updateDto)
        .expect(403);
      expect(mockOrganizationsService.update).not.toHaveBeenCalled();
    });
    
    it('should return 404 if service throws NotFoundException', async () => {
      mockOrganizationsService.update.mockRejectedValue(new NotFoundException());
      await request(app.getHttpServer())
        .put(`/organizations/${orgId}`)
        .send(updateDto)
        .expect(404);
    });

    it('should return 500 if service throws other errors', async () => {
      mockOrganizationsService.update.mockRejectedValue(new InternalServerErrorException());
      await request(app.getHttpServer())
        .put(`/organizations/${orgId}`)
        .send(updateDto)
        .expect(500);
    });
  });

  // --- DELETE /organizations/:orgId ---
  describe(`DELETE /organizations/${orgId}`, () => {
    it('should delete the organization (204 No Content)', async () => {
      mockOrganizationsService.remove.mockResolvedValue(undefined); // remove returns void

      await request(app.getHttpServer())
        .delete(`/organizations/${orgId}`)
        .expect(204); // Expect 204 No Content on successful DELETE

      expect(mockJwtAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockRolesGuard.canActivate).toHaveBeenCalledTimes(1); // RolesGuard is used
      expect(mockOrganizationsService.remove).toHaveBeenCalledWith(orgId);
    });

    it('should return 401 if JWT guard denies', async () => {
      mockJwtAuthGuard.canActivate.mockImplementation(() => { throw new UnauthorizedException(); });
      await request(app.getHttpServer())
        .delete(`/organizations/${orgId}`)
        .expect(401);
    });

    it('should return 403 if Roles guard denies', async () => {
      mockRolesGuard.canActivate.mockImplementation(() => { throw new ForbiddenException(); });
      await request(app.getHttpServer())
        .delete(`/organizations/${orgId}`)
        .expect(403);
      expect(mockOrganizationsService.remove).not.toHaveBeenCalled();
    });
    
    it('should return 404 if service throws NotFoundException', async () => {
      mockOrganizationsService.remove.mockRejectedValue(new NotFoundException());
      await request(app.getHttpServer())
        .delete(`/organizations/${orgId}`)
        .expect(404);
    });

    it('should return 500 if service throws other errors', async () => {
      mockOrganizationsService.remove.mockRejectedValue(new InternalServerErrorException());
      await request(app.getHttpServer())
        .delete(`/organizations/${orgId}`)
        .expect(500);
    });
  });
});