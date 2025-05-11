import { CreateForecastDto, UpdateForecastDto } from '../src/forecast/dto/forecast.dto';
import { v4 as uuidv4 } from 'uuid';
import { Response } from 'supertest'; // Import Response from supertest for typing
import {
  app,
  globalBeforeAll,
  globalAfterAll,
  aliceAuthToken,
  charlieAuthToken,
  dynamicAliceId,
  dynamicOrgAId,
  createdForecastIds
} from './test-setup.helper'; // Import from the helper
const request = require('supertest');

// Set longer timeout for all tests in this file since we're connecting to a real database
// jest.setTimeout(30000); // Timeout is now in jest-e2e.json

/**
 * These tests connect to the real Supabase instance and perform actual database operations.
 * They are true integration tests that verify the full stack from API to database, including RLS.
 * This file focuses on CORE FORECAST entity operations.
 */
describe('Forecast Core Operations (RLS Focused)', () => {
  beforeAll(async () => {
    await globalBeforeAll(); // Call the global setup
  }, 60000); // Keep increased timeout for setup

  afterAll(async () => {
    await globalAfterAll(); // Call the global cleanup
  }, 30000);
      
  describe('Forecast Creation (RLS)', () => {
    it('Alice (member of OrgA) should be able to create a forecast in OrgA', async () => {
      const createForecastDto: CreateForecastDto = {
        name: `Alice's RLS Test Forecast ${new Date().toISOString()}`,
        forecastStartDate: '2024-01-01',
        forecastEndDate: '2024-12-31',
        organizationId: dynamicOrgAId, // Use dynamic OrgA ID from helper
      };
      
      // console.log('Payload for Alice in specific test:', JSON.stringify(createForecastDto));

      const response = await request(app.getHttpServer()) // app is from helper
        .post('/forecasts')
        .set('Authorization', `Bearer ${aliceAuthToken}`) // aliceAuthToken from helper
        .send(createForecastDto);

      if (response.status !== 201) {
        console.error('Create forecast response error (Alice):', response.body);
      }
      expect(response.status).toBe(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(createForecastDto.name);
      expect(response.body.organizationId).toBe(dynamicOrgAId);
      expect(response.body).toHaveProperty('userId');
      expect(response.body.userId).toBe(dynamicAliceId); // dynamicAliceId from helper

      createdForecastIds.push(response.body.id); // Add to shared array
    });

    it('Charlie (NOT a member of OrgA) should NOT be able to create a forecast in OrgA', async () => {
      const createForecastDto: CreateForecastDto = {
        name: `Charlie's Unauthorized RLS Test Forecast ${new Date().toISOString()}`,
        forecastStartDate: '2024-01-01',
        forecastEndDate: '2024-12-31',
        organizationId: dynamicOrgAId, // Use dynamic OrgA ID
      };

      const response = await request(app.getHttpServer())
        .post('/forecasts')
        .set('Authorization', `Bearer ${charlieAuthToken}`) // charlieAuthToken from helper
        .send(createForecastDto);
      
      if (response.status === 500) {
        console.error('Create forecast response error (Charlie - expected RLS deny):', response.body);
      }
      expect([403, 404]).toContain(response.status);
    });
  });

  describe('Forecast Reading (RLS)', () => {
    let aliceForecastId: string;

    beforeAll(async () => {
      // Create a forecast specifically for these read tests by Alice
      const createForecastDto: CreateForecastDto = {
        name: `Alice's Readable Forecast ${new Date().toISOString()}`,
        forecastStartDate: '2024-01-01',
        forecastEndDate: '2024-12-31',
        organizationId: dynamicOrgAId,
      };

      const response = await request(app.getHttpServer())
        .post('/forecasts')
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(createForecastDto);

      if (response.status !== 201) {
        console.error(
          "Failed to create Alice's readable forecast in beforeAll for Read Tests:", 
          response.body
        );
        throw new Error(
          `Setup for read tests failed: Could not create Alice's forecast. Status: ${response.status}, Body: ${JSON.stringify(response.body)}`
        );
      }
      aliceForecastId = response.body.id;
      if (!aliceForecastId) {
        throw new Error(
          `Setup for read tests failed: Created forecast for Alice has no ID. Body: ${JSON.stringify(response.body)}`
        );
      }
      createdForecastIds.push(aliceForecastId); // Add to shared array
      console.log(`Successfully created forecast ${aliceForecastId} for read tests.`);
    });

    it('Alice (member of OrgA) should be able to read her forecast in OrgA', async () => {
      const response = await request(app.getHttpServer())
        .get(`/forecasts/${aliceForecastId}`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .expect(200);

      expect(response.body.id).toBe(aliceForecastId);
      expect(response.body.organizationId).toBe(dynamicOrgAId);
      expect(response.body).toHaveProperty('userId');
      expect(response.body.userId).toBe(dynamicAliceId);
    });

    it('Charlie (NOT a member of OrgA) should NOT be able to read Alice\'s forecast from OrgA', async () => {
      await request(app.getHttpServer())
        .get(`/forecasts/${aliceForecastId}`)
        .set('Authorization', `Bearer ${charlieAuthToken}`)
        .expect(404);
    });

    it('Alice should get 404 when trying to read a non-existent forecast', async () => {
      await request(app.getHttpServer())
        .get(`/forecasts/${uuidv4()}`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .expect(404);
    });

    it('Alice (member of OrgA) should be able to list forecasts for OrgA (and see hers)', async () => {
      await request(app.getHttpServer())
        .get('/forecasts')
        .query({ organizationId: dynamicOrgAId })
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .expect(200)
        .then((response: Response) => {
          expect(Array.isArray(response.body)).toBe(true);
          const found = response.body.find((f: any) => f.id === aliceForecastId);
          expect(found).toBeDefined();
          if (found) {
            expect(found.name).toContain("Alice's Readable Forecast");
          }
    });
  });

    it('Charlie (NOT a member of OrgA) should NOT be able to list forecasts for OrgA (or get an empty list/404)', async () => {
      const response = await request(app.getHttpServer())
        .get('/forecasts')
        .query({ organizationId: dynamicOrgAId })
        .set('Authorization', `Bearer ${charlieAuthToken}`);
        
      if (response.status === 200) {
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(0);
      } else {
        expect([403, 404]).toContain(response.status);
      }
    });
  });

  describe('Forecast Update (RLS)', () => {
    let forecastToUpdateId: string;

    beforeEach(async () => {
      const createDto: CreateForecastDto = {
        name: `Forecast For Update Test - ${new Date().toISOString()}`,
        forecastStartDate: '2024-01-01',
        forecastEndDate: '2024-12-31',
        organizationId: dynamicOrgAId,
      };
      const response = await request(app.getHttpServer())
        .post('/forecasts')
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(createDto)
        .expect(201);
      forecastToUpdateId = response.body.id;
      createdForecastIds.push(forecastToUpdateId); // Add to shared array
    });

    it('Alice should be able to update her own forecast', async () => {
      const updateDto: UpdateForecastDto = {
        name: `Updated Forecast Name - ${new Date().toISOString()}`,
      };
      await request(app.getHttpServer())
        .patch(`/forecasts/${forecastToUpdateId}`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(updateDto)
        .expect(204);

      const verifyResponse = await request(app.getHttpServer())
        .get(`/forecasts/${forecastToUpdateId}`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .expect(200);
      expect(verifyResponse.body.name).toBe(updateDto.name);
    });

    it('Alice should get 404 when trying to update a non-existent forecast', async () => {
      const updateDto: UpdateForecastDto = { name: 'Attempt to update non-existent' };
      await request(app.getHttpServer())
        .patch(`/forecasts/${uuidv4()}`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(updateDto)
        .expect(404);
    });

    it('Charlie should get 404 when trying to update Alice\'s forecast', async () => {
      const updateDto: UpdateForecastDto = { name: 'Charlie\'s malicious update' };
      await request(app.getHttpServer())
        .patch(`/forecasts/${forecastToUpdateId}`)
        .set('Authorization', `Bearer ${charlieAuthToken}`)
        .send(updateDto)
        .expect(404);
    });
  });

  describe('Forecast Deletion (RLS)', () => {
    it('Alice should be able to delete her own forecast', async () => {
      const tempCreateDto: CreateForecastDto = {
        name: `Forecast To Be Deleted - ${new Date().toISOString()}`,
        forecastStartDate: '2024-01-01',
        forecastEndDate: '2024-12-31',
        organizationId: dynamicOrgAId,
      };
      const createResponse = await request(app.getHttpServer())
        .post('/forecasts')
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(tempCreateDto)
        .expect(201);
      const forecastIdToDelete = createResponse.body.id;
      // This ID does not need to be added to createdForecastIds if it's immediately deleted.
      // However, for consistency and safety if the delete fails, it can be added.
      // Let's assume successful deletion for now and not add it, 
      // as globalAfterAll will clean up remaining forecasts if any are left due to test failures.

      await request(app.getHttpServer())
        .delete(`/forecasts/${forecastIdToDelete}`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/forecasts/${forecastIdToDelete}`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .expect(404);
    });

    it('Alice should get 404 when trying to delete a non-existent forecast', async () => {
      await request(app.getHttpServer())
        .delete(`/forecasts/${uuidv4()}`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .expect(404);
    });

    it('Charlie should get 404 when trying to delete Alice\'s forecast', async () => {
      const tempCreateDto: CreateForecastDto = {
        name: `Alice\'s Forecast For Charlie Delete Attempt - ${new Date().toISOString()}`,
        forecastStartDate: '2024-01-01',
        forecastEndDate: '2024-12-31',
        organizationId: dynamicOrgAId,
      };
      const createResponse = await request(app.getHttpServer())
        .post('/forecasts')
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(tempCreateDto)
        .expect(201);
      const alicesForecastId = createResponse.body.id;
      createdForecastIds.push(alicesForecastId); // Add to cleanup in case Charlie's delete fails

      await request(app.getHttpServer())
        .delete(`/forecasts/${alicesForecastId}`)
        .set('Authorization', `Bearer ${charlieAuthToken}`)
        .expect(404);
    });
  });

}); 