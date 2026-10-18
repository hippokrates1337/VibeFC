import { CreateForecastDto } from '../src/forecast/dto/forecast.dto';
import { CreateForecastNodeDto, ForecastNodeKind } from '../src/forecast/dto/forecast-node.dto';
import { CreateForecastEdgeDto } from '../src/forecast/dto/forecast-edge.dto';
import { v4 as uuidv4 } from 'uuid';
import {
  app,
  globalBeforeAll,
  globalAfterAll,
  aliceAuthToken,
  charlieAuthToken,
  dynamicOrgAId,
  createdForecastIds
} from './test-setup.helper';
const request = require('supertest');

/**
 * These tests focus on Forecast Edge operations, assuming a parent forecast and nodes exist.
 */
describe('Forecast Edge Operations (RLS Focused)', () => {
  let aliceEdgeTestForecastId: string;
  let sourceNodeId: string;
  let targetNodeId: string;
  let createdEdgeId: string;

  beforeAll(async () => {
    await globalBeforeAll(); // Initialize global state (users, org, app)

    // Create a specific forecast for these edge tests using Alice
    const createForecastDto: CreateForecastDto = {
      name: `Edge Test Parent Forecast - ${new Date().toISOString()}`,
      forecastStartDate: '2024-01-01',
      forecastEndDate: '2024-12-31',
      organizationId: dynamicOrgAId,
    };
    let response = await request(app.getHttpServer())
      .post('/forecasts')
      .set('Authorization', `Bearer ${aliceAuthToken}`)
      .send(createForecastDto)
      .expect(201);
    aliceEdgeTestForecastId = response.body.id;
    if (!aliceEdgeTestForecastId) {
      throw new Error('Failed to create parent forecast for edge tests.');
    }
    createdForecastIds.push(aliceEdgeTestForecastId); // Add to global cleanup array
    console.log(`Parent forecast ${aliceEdgeTestForecastId} created for Edge tests.`);

    // Create source node
    const sourceNodeDto: CreateForecastNodeDto = {
      forecastId: aliceEdgeTestForecastId,
      kind: ForecastNodeKind.CONSTANT,
      attributes: { name: 'Edge Source', value: 1 },
      position: { x: 0, y: 0 },
    };
    response = await request(app.getHttpServer())
      .post(`/forecasts/${aliceEdgeTestForecastId}/nodes`)
      .set('Authorization', `Bearer ${aliceAuthToken}`)
      .send(sourceNodeDto)
      .expect(201);
    sourceNodeId = response.body.id;
    if (!sourceNodeId) throw new Error('Failed to create source node for edge tests.');

    // Create target node
    const targetNodeDto: CreateForecastNodeDto = {
      forecastId: aliceEdgeTestForecastId,
      kind: ForecastNodeKind.CONSTANT,
      attributes: { name: 'Edge Target', value: 2 },
      position: { x: 100, y: 0 },
    };
    response = await request(app.getHttpServer())
      .post(`/forecasts/${aliceEdgeTestForecastId}/nodes`)
      .set('Authorization', `Bearer ${aliceAuthToken}`)
      .send(targetNodeDto)
      .expect(201);
    targetNodeId = response.body.id;
    if (!targetNodeId) throw new Error('Failed to create target node for edge tests.');

    console.log(`Source (${sourceNodeId}) and Target (${targetNodeId}) nodes created for Edge tests.`);
  }, 60000); // Increased timeout for setup that includes multiple creations

  afterAll(async () => {
    // globalAfterAll will handle cleanup of users, org, app, and the parent forecast (and its nodes/edges via cascade or explicit node/edge cleanup if necessary)
    await globalAfterAll(); 
  }, 30000);

  // Edge Creation Tests
  describe('Edge Creation (POST /forecasts/:forecastId/edges)', () => {
    it('Alice should be able to create an edge in her forecast', async () => {
      const edgeDto: CreateForecastEdgeDto = {
        forecastId: aliceEdgeTestForecastId, 
        sourceNodeId: sourceNodeId,
        targetNodeId: targetNodeId,
      };
      const response = await request(app.getHttpServer())
        .post(`/forecasts/${aliceEdgeTestForecastId}/edges`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(edgeDto)
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
      createdEdgeId = response.body.id;
      expect(response.body.forecastId).toBe(aliceEdgeTestForecastId);
      expect(response.body.sourceNodeId).toBe(sourceNodeId);
      expect(response.body.targetNodeId).toBe(targetNodeId);
      // Note: Edges are part of a forecast. If the forecast is deleted, edges should be deleted by DB cascade.
      // No need to add edge IDs to createdForecastIds unless specific edge cleanup is desired outside forecast deletion.
    });

    it('Charlie should get 404 when trying to create an edge in Alice\'s forecast', async () => {
      const edgeDto: CreateForecastEdgeDto = {
        forecastId: aliceEdgeTestForecastId,
        sourceNodeId: sourceNodeId,
        targetNodeId: targetNodeId,
      };
      await request(app.getHttpServer())
        .post(`/forecasts/${aliceEdgeTestForecastId}/edges`)
        .set('Authorization', `Bearer ${charlieAuthToken}`)
        .send(edgeDto)
        .expect(404); 
    });

    it('Alice should get 400 or 404 when trying to create an edge with a non-existent source node', async () => {
      const edgeDto: CreateForecastEdgeDto = {
        forecastId: aliceEdgeTestForecastId,
        sourceNodeId: uuidv4(), // Non-existent
        targetNodeId: targetNodeId,
      };
      const response = await request(app.getHttpServer())
        .post(`/forecasts/${aliceEdgeTestForecastId}/edges`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(edgeDto);
      expect([400, 404]).toContain(response.status); 
    });

    it('Alice should get 400 or 404 when trying to create an edge with a non-existent target node', async () => {
      const edgeDto: CreateForecastEdgeDto = {
        forecastId: aliceEdgeTestForecastId,
        sourceNodeId: sourceNodeId,
        targetNodeId: uuidv4(), // Non-existent
      };
      const response = await request(app.getHttpServer())
        .post(`/forecasts/${aliceEdgeTestForecastId}/edges`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(edgeDto);
      expect([400, 404]).toContain(response.status);
    });

    it('Alice should get 404 when trying to create an edge in a non-existent forecast', async () => {
      const nonExistentForecastId = uuidv4();
      const edgeDto: CreateForecastEdgeDto = {
        forecastId: nonExistentForecastId,
        sourceNodeId: uuidv4(), // Can be anything as forecast won't be found
        targetNodeId: uuidv4(),
      };
      await request(app.getHttpServer())
        .post(`/forecasts/${nonExistentForecastId}/edges`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(edgeDto)
        .expect(404);
    });
  });

  describe('Edge Reading (GET /forecasts/:forecastId/edges, GET /forecasts/:forecastId/edges/:edgeId)', () => {
    it('Alice should be able to list all edges for her forecast', async () => {
      const res = await request(app.getHttpServer())
        .get(`/forecasts/${aliceEdgeTestForecastId}/edges`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      const foundEdge = res.body.find((edge: any) => edge.id === createdEdgeId);
      expect(foundEdge).toBeDefined();
    });

    it('Alice should be able to fetch an edge by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/forecasts/${aliceEdgeTestForecastId}/edges/${createdEdgeId}`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .expect(200);

      expect(res.body.id).toBe(createdEdgeId);
      expect(res.body.sourceNodeId).toBe(sourceNodeId);
      expect(res.body.targetNodeId).toBe(targetNodeId);
    });

    it('Charlie should get 404 when reading Alice edge', async () => {
      await request(app.getHttpServer())
        .get(`/forecasts/${aliceEdgeTestForecastId}/edges/${createdEdgeId}`)
        .set('Authorization', `Bearer ${charlieAuthToken}`)
        .expect(404);
    });
  });

  describe('Edge Deletion (DELETE /forecasts/:forecastId/edges/:edgeId)', () => {
    it('Alice should be able to delete her edge', async () => {
      // Create an additional edge for this deletion test
      const edgeDto: CreateForecastEdgeDto = {
        forecastId: aliceEdgeTestForecastId,
        sourceNodeId: sourceNodeId,
        targetNodeId: targetNodeId,
      };
      const res = await request(app.getHttpServer())
        .post(`/forecasts/${aliceEdgeTestForecastId}/edges`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(edgeDto)
        .expect(201);
      const edgeToDeleteId = res.body.id;

      await request(app.getHttpServer())
        .delete(`/forecasts/${aliceEdgeTestForecastId}/edges/${edgeToDeleteId}`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .expect(204);

      // Verify it's gone
      await request(app.getHttpServer())
        .get(`/forecasts/${aliceEdgeTestForecastId}/edges/${edgeToDeleteId}`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .expect(404);
    });

    it('Charlie should get 404 when deleting Alice edge', async () => {
      await request(app.getHttpServer())
        .delete(`/forecasts/${aliceEdgeTestForecastId}/edges/${createdEdgeId}`)
        .set('Authorization', `Bearer ${charlieAuthToken}`)
        .expect(404);
    });
  });
}); 