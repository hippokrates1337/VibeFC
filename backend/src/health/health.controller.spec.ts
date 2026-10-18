import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { INestApplication } from '@nestjs/common';
import request = require('supertest');

describe('HealthController', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
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
}); 