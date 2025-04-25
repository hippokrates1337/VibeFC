import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { SupabaseService } from '../supabase/supabase.service';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

describe('HealthController', () => {
  let app: INestApplication;
  let supabaseService: SupabaseService;

  // Mock SupabaseService
  const mockSupabaseService = {
    testConnection: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    supabaseService = moduleFixture.get<SupabaseService>(SupabaseService);
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return status ok and timestamp', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('timestamp');
          expect(Date.parse(res.body.timestamp)).not.toBeNaN();
        });
    });
  });

  describe('GET /health/supabase', () => {
    it('should return ok if supabase connection is successful', () => {
      mockSupabaseService.testConnection.mockResolvedValue(true);

      return request(app.getHttpServer())
        .get('/health/supabase')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('message', 'Supabase connection successful');
          expect(res.body).toHaveProperty('timestamp');
          expect(Date.parse(res.body.timestamp)).not.toBeNaN();
          expect(mockSupabaseService.testConnection).toHaveBeenCalledTimes(1);
        });
    });

    it('should return error if supabase connection fails', () => {
        const errorMessage = 'Connection timed out';
        mockSupabaseService.testConnection.mockRejectedValue(new Error(errorMessage));
  
        return request(app.getHttpServer())
          .get('/health/supabase')
          .expect(200) // Controller handles the error and returns 200 with error status
          .expect((res) => {
            expect(res.body).toHaveProperty('status', 'error');
            expect(res.body).toHaveProperty('message', `Supabase connection failed: ${errorMessage}`);
            expect(res.body).toHaveProperty('timestamp');
            expect(Date.parse(res.body.timestamp)).not.toBeNaN();
            expect(mockSupabaseService.testConnection).toHaveBeenCalledTimes(1);
          });
      });

      it('should return error if supabase service explicitly returns false', () => {
        // Although testConnection likely throws, test the case where it might return false
        mockSupabaseService.testConnection.mockResolvedValue(false);
  
        return request(app.getHttpServer())
          .get('/health/supabase')
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('status', 'error');
            // The actual message might differ based on controller logic for `false` return
            // Assuming it defaults to a generic error or specific message for false
            // Let's refine based on actual HealthController logic. Assuming it results in 'error' status
            expect(res.body).toHaveProperty('timestamp');
            expect(mockSupabaseService.testConnection).toHaveBeenCalledTimes(1);
          });
      });
  });
}); 