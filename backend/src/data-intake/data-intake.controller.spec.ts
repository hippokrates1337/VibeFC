import { Test, TestingModule } from '@nestjs/testing';
import { DataIntakeController } from './data-intake.controller';
import { DataIntakeService } from './data-intake.service';
import { SupabaseService } from '../supabase/supabase.service'; // Although service is mocked, module might need it
import { ConfigService } from '@nestjs/config'; // Module might need it
import { 
  INestApplication, 
  ValidationPipe, 
  ClassSerializerInterceptor, 
  ExecutionContext,
  UnauthorizedException,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as request from 'supertest';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AddVariablesDto } from './dto/add-variables.dto';
import { UpdateVariablesDto } from './dto/update-variables.dto';
import { UpdateVariableDto } from './dto/update-variables.dto';
import { DeleteVariablesDto } from './dto/delete-variables.dto';
import { VariableDto, VariableType, TimeSeriesPoint } from './dto/variable.dto';

// --- Mocks ---
// Mock UUIDs for testing
const MOCK_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const MOCK_ORG_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

// Mock Service
const mockDataIntakeService = {
  addVariables: jest.fn(),
  getVariablesByUser: jest.fn(),
  updateVariables: jest.fn(),
  deleteVariables: jest.fn(),
};

// Mock Guard
const mockJwtAuthGuard = {
  canActivate: jest.fn((context: ExecutionContext) => {
    const req = context.switchToHttp().getRequest();
    // Use mock UUIDs for user context
    req.user = { userId: MOCK_USER_ID, organizationId: MOCK_ORG_ID };
    return true;
  })
};

describe('DataIntakeController (Integration)', () => {
  let app: INestApplication;
  let dataIntakeService: DataIntakeService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [DataIntakeController],
      providers: [
        { provide: DataIntakeService, useValue: mockDataIntakeService },
        Reflector,
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue(mockJwtAuthGuard)
    .compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: false
    }));
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

    await app.init();

    dataIntakeService = moduleFixture.get<DataIntakeService>(DataIntakeService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset guard to default mock implementation
    mockJwtAuthGuard.canActivate.mockImplementation((context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest();
      req.user = { userId: MOCK_USER_ID, organizationId: MOCK_ORG_ID };
      return true;
    });
  });

  afterAll(async () => {
    await app.close();
  });

  // --- POST /data-intake/variables --- 
  describe('POST /data-intake/variables', () => {
    // Use mock UUIDs
    const userId = MOCK_USER_ID;
    const organizationId = MOCK_ORG_ID;

    const validTimeSeriesPoints: TimeSeriesPoint[] = [
      { date: '2023-01-01', value: 100 }
    ];

    // Use valid UUIDs in the DTO
    const variablesToAdd: VariableDto[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000', // Keep existing valid UUID for variable ID
        name: 'Var1',
        type: VariableType.INPUT,
        values: validTimeSeriesPoints,
        user_id: userId, // Use mock UUID
        organization_id: organizationId // Use mock UUID
      },
    ];

    const addDto: AddVariablesDto = { variables: variablesToAdd };

    // Mock return value - ensure shape matches what service returns
    const mockAddedVariablesResult = variablesToAdd.map(v => ({
      ...v,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    it('should call service.addVariables and return result on success', async () => {
      mockDataIntakeService.addVariables.mockResolvedValue(mockAddedVariablesResult);

      await request(app.getHttpServer())
        .post('/data-intake/variables')
        .set('Authorization', 'Bearer fake-token')
        .send(addDto)
        .expect(201) // Expect HTTP 201 Created
        .expect((res) => {
          // Ensure body matches the structure returned by the service mock
          expect(res.body).toEqual(mockAddedVariablesResult);
        });

      expect(mockJwtAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      // Controller passes the DTO directly to the service after potentially adding IDs (which doesn't happen here as they exist)
      expect(mockDataIntakeService.addVariables).toHaveBeenCalledWith(addDto);
    });

    it('should return 400 on invalid DTO (empty array)', async () => {
        const invalidDto = { variables: [] };
        await request(app.getHttpServer())
          .post('/data-intake/variables')
          .set('Authorization', 'Bearer fake-token')
          .send(invalidDto)
          .expect(400); // Expect HTTP 400 Bad Request (ValidationPipe)

        expect(mockDataIntakeService.addVariables).not.toHaveBeenCalled();
      });

    it('should return 400 on invalid DTO (missing required field - e.g., organization_id)', async () => {
        const invalidDto = {
          variables: [{
            id: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
            name: 'Test',
            type: VariableType.INPUT,
            values: validTimeSeriesPoints,
            user_id: MOCK_USER_ID,
            // Missing organization_id
          }]
        };

        await request(app.getHttpServer())
            .post('/data-intake/variables')
            .set('Authorization', 'Bearer fake-token')
            .send(invalidDto)
            .expect(400);

        expect(mockDataIntakeService.addVariables).not.toHaveBeenCalled();
    });

    it('should return 401 if auth guard denies access', async () => {
        mockJwtAuthGuard.canActivate.mockImplementation(() => {
          throw new UnauthorizedException();
        });

        await request(app.getHttpServer())
            .post('/data-intake/variables')
            .send(addDto) // Use the valid addDto
            .expect(401);

        expect(mockDataIntakeService.addVariables).not.toHaveBeenCalled();
    });

    it('should return 500 if service throws an error', async () => {
        mockDataIntakeService.addVariables.mockRejectedValue(
          new HttpException('DB error', HttpStatus.INTERNAL_SERVER_ERROR)
        );

        await request(app.getHttpServer())
            .post('/data-intake/variables')
            .set('Authorization', 'Bearer fake-token')
            .send(addDto) // Use the valid addDto
            .expect(500);
    });
  });

  // --- GET /data-intake/variables/:userId --- 
  describe('GET /data-intake/variables/:userId', () => {
    // Use a valid UUID format for the parameter
    const userIdToFetch = 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
    const mockUserVariables = [{
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Var1',
      type: VariableType.ACTUAL,
      values: [{ date: '2023-01-01', value: 100 }],
      user_id: userIdToFetch,
      organization_id: MOCK_ORG_ID // Assume variables belong to an org
    }];

    it('should call service.getVariablesByUser and return data', async () => {
      mockDataIntakeService.getVariablesByUser.mockResolvedValue(mockUserVariables);

      await request(app.getHttpServer())
        .get(`/data-intake/variables/${userIdToFetch}`) // Use valid UUID
        .set('Authorization', 'Bearer fake-token')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(mockUserVariables);
        });

      expect(mockJwtAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockDataIntakeService.getVariablesByUser).toHaveBeenCalledWith(userIdToFetch);
    });

     it('should return 401 if auth guard denies access', async () => {
         mockJwtAuthGuard.canActivate.mockImplementation(() => {
           throw new UnauthorizedException();
         });

         await request(app.getHttpServer())
             .get(`/data-intake/variables/${userIdToFetch}`)
             .expect(401);
         expect(mockDataIntakeService.getVariablesByUser).not.toHaveBeenCalled();
     });

    it('should return 500 if service throws an error', async () => {
        mockDataIntakeService.getVariablesByUser.mockRejectedValue(
          new HttpException('Fetch error', HttpStatus.INTERNAL_SERVER_ERROR)
        );

        await request(app.getHttpServer())
            .get(`/data-intake/variables/${userIdToFetch}`)
            .set('Authorization', 'Bearer fake-token')
            .expect(500);
    });
  });

  // --- PUT /data-intake/variables --- 
  describe('PUT /data-intake/variables', () => {
    const userId = MOCK_USER_ID;
    const variablesToUpdate: UpdateVariableDto[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000', // Valid UUID
        name: 'Updated Name',
        type: VariableType.INPUT,
        values: [{ date: '2023-01-01', value: 200 }]
      },
    ];
    const updateDto: UpdateVariablesDto = { variables: variablesToUpdate };
    const mockUpdatedVariablesResult = variablesToUpdate.map(v => ({
      ...v,
      user_id: userId,
      organization_id: MOCK_ORG_ID,
      updated_at: new Date().toISOString()
    }));

    it('should call service.updateVariables and return result', async () => {
      mockDataIntakeService.updateVariables.mockResolvedValue(mockUpdatedVariablesResult);

      await request(app.getHttpServer())
        .put('/data-intake/variables')
        .set('Authorization', 'Bearer fake-token')
        .send(updateDto)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(mockUpdatedVariablesResult);
        });

      expect(mockJwtAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      // Controller passes DTO directly, service might use user context internally
      expect(mockDataIntakeService.updateVariables).toHaveBeenCalledWith(updateDto);
    });

    it('should return 400 on invalid DTO', async () => {
        const invalidDto = { variables: [] }; // Empty array fails validation
        await request(app.getHttpServer())
            .put('/data-intake/variables')
            .set('Authorization', 'Bearer fake-token')
            .send(invalidDto)
            .expect(400);
        expect(mockDataIntakeService.updateVariables).not.toHaveBeenCalled();
    });

    it('should return 401 if auth guard denies access', async () => {
        mockJwtAuthGuard.canActivate.mockImplementation(() => {
          throw new UnauthorizedException();
        });

        await request(app.getHttpServer())
            .put('/data-intake/variables')
            .send(updateDto) // Use valid DTO
            .expect(401);
        expect(mockDataIntakeService.updateVariables).not.toHaveBeenCalled();
    });

    it('should return 500 if service throws an error', async () => {
        mockDataIntakeService.updateVariables.mockRejectedValue(
          new HttpException('Update error', HttpStatus.INTERNAL_SERVER_ERROR)
        );

        await request(app.getHttpServer())
            .put('/data-intake/variables')
            .set('Authorization', 'Bearer fake-token')
            .send(updateDto) // Use valid DTO
            .expect(500);
    });
  });

  // --- DELETE /data-intake/variables --- 
  describe('DELETE /data-intake/variables', () => {
    const userId = MOCK_USER_ID;
    const organizationId = MOCK_ORG_ID;
    const idsToDelete = [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001'
    ];
    // Include mandatory organizationId in the DTO
    const deleteDto: DeleteVariablesDto = { ids: idsToDelete, organizationId };
    const mockDeleteResult = { deletedCount: 2 }; // Example result structure

    it('should call service.deleteVariables and return result', async () => {
      mockDataIntakeService.deleteVariables.mockResolvedValue(mockDeleteResult);

      await request(app.getHttpServer())
        .delete('/data-intake/variables')
        .set('Authorization', 'Bearer fake-token')
        .send(deleteDto) // Send the DTO including organizationId
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(mockDeleteResult);
        });

      expect(mockJwtAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      // Verify service call arguments: ({ ids }, userId, organizationId)
      expect(mockDataIntakeService.deleteVariables).toHaveBeenCalledWith(
        { ids: idsToDelete }, // Service expects {ids} object based on controller code
        userId,           // User ID from request context
        organizationId    // Org ID from DTO body
      );
    });

    it('should return 400 on invalid DTO (empty ids array)', async () => {
        const invalidDto = { ids: [], organizationId }; // Still need orgId, but ids is invalid
        await request(app.getHttpServer())
            .delete('/data-intake/variables')
            .set('Authorization', 'Bearer fake-token')
            .send(invalidDto)
            .expect(400);
        expect(mockDataIntakeService.deleteVariables).not.toHaveBeenCalled();
    });

    it('should return 400 on invalid DTO (missing organizationId)', async () => {
        const invalidDto = { ids: idsToDelete }; // Missing mandatory orgId
        await request(app.getHttpServer())
            .delete('/data-intake/variables')
            .set('Authorization', 'Bearer fake-token')
            .send(invalidDto)
            .expect(400); // Controller validation should fail
        expect(mockDataIntakeService.deleteVariables).not.toHaveBeenCalled();
    });

    it('should return 401 if auth guard denies access', async () => {
        mockJwtAuthGuard.canActivate.mockImplementation(() => {
          throw new UnauthorizedException();
        });

        await request(app.getHttpServer())
            .delete('/data-intake/variables')
            .send(deleteDto) // Use valid DTO
            .expect(401);
        expect(mockDataIntakeService.deleteVariables).not.toHaveBeenCalled();
    });

    it('should return 500 if service throws an error', async () => {
        const serverError = new HttpException(
          {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Delete error',
            error: 'Internal Server Error',
          },
          HttpStatus.INTERNAL_SERVER_ERROR
        );

        mockDataIntakeService.deleteVariables.mockRejectedValue(serverError);

        await request(app.getHttpServer())
            .delete('/data-intake/variables')
            .set('Authorization', 'Bearer fake-token')
            .send(deleteDto) // Use valid DTO
            .expect(500);
    });
  });

}); 