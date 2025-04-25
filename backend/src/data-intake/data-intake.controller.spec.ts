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

// Mock Service
const mockDataIntakeService = {
  addVariables: jest.fn(),
  getVariablesByUser: jest.fn(),
  updateVariables: jest.fn(),
  deleteVariables: jest.fn(),
};

// Mock Guard - Create proper implementation
const mockJwtAuthGuard = {
  canActivate: jest.fn((context) => {
    // Add user to request object (what JwtAuthGuard actually does)
    const req = context.switchToHttp().getRequest();
    req.user = { userId: 'test-user' };
    return true;
  })
};

describe('DataIntakeController (Integration)', () => {
  let app: INestApplication;
  let dataIntakeService: DataIntakeService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      // Import the actual module if complex dependencies are needed, 
      // otherwise just declare controller and mocked providers.
      // imports: [DataIntakeModule], // Option 1: Import full module
      controllers: [DataIntakeController], // Option 2: Declare controller directly
      providers: [
        // Provide the mock service
        { provide: DataIntakeService, useValue: mockDataIntakeService },
        // We might need Reflector for interceptors even if guard is mocked
        Reflector, 
      ],
    })
    .overrideGuard(JwtAuthGuard) // Override the actual guard with the mock
    .useValue(mockJwtAuthGuard)
    .compile();

    app = moduleFixture.createNestApplication();
    
    // Apply global pipes and interceptors as in main.ts for realistic testing
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
    // Reset mocks before each test
    jest.clearAllMocks();
    // Set the default behavior for the guard
    mockJwtAuthGuard.canActivate.mockImplementation((context) => {
      const req = context.switchToHttp().getRequest();
      req.user = { userId: 'test-user' };
      return true;
    });
  });

  afterAll(async () => {
    await app.close();
  });

  // --- POST /data-intake/variables --- 
  describe('POST /data-intake/variables', () => {
    const userId = 'test-user'; // Assuming guard adds user to request
    // Create valid time series points
    const validTimeSeriesPoints: TimeSeriesPoint[] = [
      { date: '2023-01-01', value: 100 }
    ];
    
    // Create a proper VariableDto with all required fields
    const variablesToAdd: VariableDto[] = [
      { 
        id: '123e4567-e89b-12d3-a456-426614174000', // Valid UUID format
        name: 'Var1', 
        type: VariableType.INPUT, 
        values: validTimeSeriesPoints,
        userId: userId 
      },
    ];
    
    // Create a proper AddVariablesDto
    const addDto: AddVariablesDto = { variables: variablesToAdd };
    
    const mockAddedVariables = variablesToAdd.map(v => ({ 
      ...v, 
      created_at: 'ts', 
      updated_at: 'ts' 
    }));

    it('should call service.addVariables and return result on success', async () => {
      // Make sure the service returns the expected result
      mockDataIntakeService.addVariables.mockResolvedValue(mockAddedVariables);

      await request(app.getHttpServer())
        .post('/data-intake/variables')
        .set('Authorization', 'Bearer fake-token') // Simulate token
        .send(addDto)
        .expect(201) // Expect HTTP 201 Created
        .expect((res) => {
          expect(res.body).toEqual(mockAddedVariables);
        });

      expect(mockJwtAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      // Check if service was called with the right arguments
      expect(mockDataIntakeService.addVariables).toHaveBeenCalledWith(
        expect.objectContaining({ variables: expect.arrayContaining([expect.objectContaining({ userId })]) })
      );
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

    it('should return 400 on invalid DTO (missing required field)', async () => {
        const invalidDto = { 
          variables: [{ 
            /* Missing id field which is required */
            name: 'Test',
            type: VariableType.INPUT, 
            values: validTimeSeriesPoints 
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
        // Override guard to throw UnauthorizedException
        mockJwtAuthGuard.canActivate.mockImplementation(() => {
          throw new UnauthorizedException();
        });
        
        await request(app.getHttpServer())
            .post('/data-intake/variables')
            .send(addDto)
            .expect(401); // Expect HTTP 401 Unauthorized
            
        expect(mockDataIntakeService.addVariables).not.toHaveBeenCalled();
    });
    
    it('should return 500 if service throws an error', async () => {
        mockDataIntakeService.addVariables.mockRejectedValue(
          new HttpException('DB error', HttpStatus.INTERNAL_SERVER_ERROR)
        );
        
        await request(app.getHttpServer())
            .post('/data-intake/variables')
            .set('Authorization', 'Bearer fake-token')
            .send(addDto)
            .expect(500); // Expect HTTP 500 Internal Server Error
    });
  });

  // --- GET /data-intake/variables/:userId --- 
  describe('GET /data-intake/variables/:userId', () => {
    const userId = 'user-to-fetch';
    const mockUserVariables = [{ 
      id: '123e4567-e89b-12d3-a456-426614174000', 
      name: 'Var1', 
      type: VariableType.ACTUAL, 
      values: [{ date: '2023-01-01', value: 100 }], 
      userId 
    }];

    it('should call service.getVariablesByUser and return data', async () => {
      mockDataIntakeService.getVariablesByUser.mockResolvedValue(mockUserVariables);

      await request(app.getHttpServer())
        .get(`/data-intake/variables/${userId}`)
        .set('Authorization', 'Bearer fake-token')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(mockUserVariables);
        });

      expect(mockJwtAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockDataIntakeService.getVariablesByUser).toHaveBeenCalledWith(userId);
    });

     it('should return 401 if auth guard denies access', async () => {
         // Override guard to throw UnauthorizedException
         mockJwtAuthGuard.canActivate.mockImplementation(() => {
           throw new UnauthorizedException();
         });
         
         await request(app.getHttpServer())
             .get(`/data-intake/variables/${userId}`)
             .expect(401);
         expect(mockDataIntakeService.getVariablesByUser).not.toHaveBeenCalled();
     });
     
    it('should return 500 if service throws an error', async () => {
        mockDataIntakeService.getVariablesByUser.mockRejectedValue(
          new HttpException('Fetch error', HttpStatus.INTERNAL_SERVER_ERROR)
        );
        
        await request(app.getHttpServer())
            .get(`/data-intake/variables/${userId}`)
            .set('Authorization', 'Bearer fake-token')
            .expect(500);
    });
  });

  // --- PUT /data-intake/variables --- 
  describe('PUT /data-intake/variables', () => {
    const userId = 'test-user';
    const variablesToUpdate: UpdateVariableDto[] = [
      { 
        id: '123e4567-e89b-12d3-a456-426614174000', // Valid UUID
        name: 'Updated Name',
        type: VariableType.INPUT,
        values: [{ date: '2023-01-01', value: 200 }]
      },
    ];
    const updateDto: UpdateVariablesDto = { variables: variablesToUpdate };
    const mockUpdatedVariables = [{ 
      id: '123e4567-e89b-12d3-a456-426614174000', 
      name: 'Updated Name', 
      type: VariableType.INPUT, 
      values: [{ date: '2023-01-01', value: 200 }], 
      userId 
    }];

    it('should call service.updateVariables and return result', async () => {
      mockDataIntakeService.updateVariables.mockResolvedValue(mockUpdatedVariables);

      await request(app.getHttpServer())
        .put('/data-intake/variables')
        .set('Authorization', 'Bearer fake-token')
        .send(updateDto)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(mockUpdatedVariables);
        });

      expect(mockJwtAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockDataIntakeService.updateVariables).toHaveBeenCalledWith(updateDto);
    });

    it('should return 400 on invalid DTO', async () => {
        const invalidDto = { variables: [] };
        await request(app.getHttpServer())
            .put('/data-intake/variables')
            .set('Authorization', 'Bearer fake-token')
            .send(invalidDto)
            .expect(400);
        expect(mockDataIntakeService.updateVariables).not.toHaveBeenCalled();
    });
    
    it('should return 401 if auth guard denies access', async () => {
        // Override guard to throw UnauthorizedException
        mockJwtAuthGuard.canActivate.mockImplementation(() => {
          throw new UnauthorizedException();
        });
        
        await request(app.getHttpServer())
            .put('/data-intake/variables')
            .send(updateDto)
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
            .send(updateDto)
            .expect(500);
    });
  });

  // --- DELETE /data-intake/variables --- 
  describe('DELETE /data-intake/variables', () => {
    const userId = 'test-user';
    // Use valid UUIDs in the delete DTOs
    const idsToDelete = [
      '123e4567-e89b-12d3-a456-426614174000', 
      '123e4567-e89b-12d3-a456-426614174001'
    ];
    const deleteDto: DeleteVariablesDto = { ids: idsToDelete }; 
    const mockDeleteResult = { deletedCount: 2 };

    it('should call service.deleteVariables and return result', async () => {
      mockDataIntakeService.deleteVariables.mockResolvedValue(mockDeleteResult);

      await request(app.getHttpServer())
        .delete('/data-intake/variables')
        .set('Authorization', 'Bearer fake-token')
        .send(deleteDto)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(mockDeleteResult);
        });

      expect(mockJwtAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockDataIntakeService.deleteVariables).toHaveBeenCalledWith(deleteDto);
    });
    
    it('should return 400 on invalid DTO (empty ids array)', async () => {
        const invalidDto = { ids: [] };
        await request(app.getHttpServer())
            .delete('/data-intake/variables')
            .set('Authorization', 'Bearer fake-token')
            .send(invalidDto)
            .expect(400);
        expect(mockDataIntakeService.deleteVariables).not.toHaveBeenCalled();
    });

    it('should return 401 if auth guard denies access', async () => {
        // Override guard to throw UnauthorizedException
        mockJwtAuthGuard.canActivate.mockImplementation(() => {
          throw new UnauthorizedException();
        });
        
        await request(app.getHttpServer())
            .delete('/data-intake/variables')
            .send(deleteDto)
            .expect(401);
        expect(mockDataIntakeService.deleteVariables).not.toHaveBeenCalled();
    });
    
    it('should return 500 if service throws an error', async () => {
        // Mock proper HTTP exception with 500 status
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
            .send(deleteDto)
            .expect(500);
    });
  });

}); 