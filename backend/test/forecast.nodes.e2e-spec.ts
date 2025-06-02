import { CreateForecastDto } from '../src/forecast/dto/forecast.dto';
import { CreateForecastNodeDto, UpdateForecastNodeDto, ForecastNodeKind } from '../src/forecast/dto/forecast-node.dto';
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
 * These tests focus on Forecast Node operations, assuming a parent forecast exists.
 */
describe('Forecast Node Operations (RLS Focused)', () => {
  let aliceNodeTestForecastId: string; // Parent forecast for these node tests

  beforeAll(async () => {
    await globalBeforeAll(); // Initialize global state (users, org, app)

    // Create a specific forecast for these node tests using Alice
    const createDto: CreateForecastDto = {
      name: `Node Test Parent Forecast - ${new Date().toISOString()}`,
      forecastStartDate: '2024-01-01',
      forecastEndDate: '2024-12-31',
      organizationId: dynamicOrgAId,
    };
    const response = await request(app.getHttpServer())
      .post('/forecasts')
      .set('Authorization', `Bearer ${aliceAuthToken}`)
      .send(createDto)
      .expect(201);
    aliceNodeTestForecastId = response.body.id;
    if (!aliceNodeTestForecastId) {
      throw new Error('Failed to create parent forecast for node tests.');
    }
    createdForecastIds.push(aliceNodeTestForecastId); // Add to global cleanup array
    console.log(`Parent forecast ${aliceNodeTestForecastId} created for Node tests.`);
  }, 60000); // Increased timeout for setup that includes an extra forecast creation

  afterAll(async () => {
    // globalAfterAll will handle cleanup of users, org, app, and the parent forecast
    await globalAfterAll(); 
  }, 30000);

  // Node Creation Tests
  describe('Node Creation (POST /forecasts/:forecastId/nodes)', () => {
    it('Alice should be able to create a node in her forecast', async () => {
      const nodeDto: CreateForecastNodeDto = {
        forecastId: aliceNodeTestForecastId, 
        kind: ForecastNodeKind.CONSTANT,
        attributes: { value: 123 },
        position: { x: 10, y: 20 },
      };
      const response = await request(app.getHttpServer())
        .post(`/forecasts/${aliceNodeTestForecastId}/nodes`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(nodeDto)
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body.forecastId).toBe(aliceNodeTestForecastId);
      expect(response.body.kind).toBe(ForecastNodeKind.CONSTANT);
      expect(response.body.attributes).toEqual({ value: 123 });
    });

    it('Charlie should get 404 when trying to create a node in Alice\'s forecast', async () => {
      const nodeDto: CreateForecastNodeDto = {
        forecastId: aliceNodeTestForecastId,
        kind: ForecastNodeKind.DATA,
        attributes: { variableId: 'some-var', offsetMonths: 0 },
        position: { x: 30, y: 40 },
      };
      await request(app.getHttpServer())
        .post(`/forecasts/${aliceNodeTestForecastId}/nodes`)
        .set('Authorization', `Bearer ${charlieAuthToken}`)
        .send(nodeDto)
        .expect(404); 
    });

    it('Alice should get 404 when trying to create a node in a non-existent forecast', async () => {
      const nonExistentForecastId = uuidv4();
      const nodeDto: CreateForecastNodeDto = {
        forecastId: nonExistentForecastId,
        kind: ForecastNodeKind.CONSTANT,
        attributes: { value: 456 },
        position: { x: 50, y: 60 },
      };
      await request(app.getHttpServer())
        .post(`/forecasts/${nonExistentForecastId}/nodes`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(nodeDto)
        .expect(404);
    });
  });

  // Node Reading Tests
  describe('Node Reading (GET /forecasts/:forecastId/nodes, GET /forecasts/:forecastId/nodes/:nodeId)', () => {
    let createdNodeId: string;

    beforeEach(async () => {
      const nodeDto: CreateForecastNodeDto = {
        forecastId: aliceNodeTestForecastId,
        kind: ForecastNodeKind.OPERATOR,
        attributes: { op: '+', inputOrder: [] },
        position: { x: 100, y: 100 },
      };
      const response = await request(app.getHttpServer())
        .post(`/forecasts/${aliceNodeTestForecastId}/nodes`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(nodeDto)
        .expect(201);
      createdNodeId = response.body.id;
    });

    it('Alice should be able to list all nodes for her forecast', async () => {
      const response = await request(app.getHttpServer())
        .get(`/forecasts/${aliceNodeTestForecastId}/nodes`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      const foundNode = response.body.find((node: any) => node.id === createdNodeId);
      expect(foundNode).toBeDefined();
      if (foundNode) {
        expect(foundNode.kind).toBe(ForecastNodeKind.OPERATOR);
      }
    });

    it('Alice should be able to read a specific node in her forecast', async () => {
      const response = await request(app.getHttpServer())
        .get(`/forecasts/${aliceNodeTestForecastId}/nodes/${createdNodeId}`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .expect(200);

      expect(response.body.id).toBe(createdNodeId);
      expect(response.body.kind).toBe(ForecastNodeKind.OPERATOR);
    });

    it('Charlie should get 404 when trying to list nodes from Alice\'s forecast', async () => {
      await request(app.getHttpServer())
        .get(`/forecasts/${aliceNodeTestForecastId}/nodes`)
        .set('Authorization', `Bearer ${charlieAuthToken}`)
        .expect(404);
    });

    it('Charlie should get 404 when trying to read a specific node from Alice\'s forecast', async () => {
      await request(app.getHttpServer())
        .get(`/forecasts/${aliceNodeTestForecastId}/nodes/${createdNodeId}`)
        .set('Authorization', `Bearer ${charlieAuthToken}`)
        .expect(404);
    });

    it('Alice should get 404 when trying to read a non-existent node in her forecast', async () => {
      await request(app.getHttpServer())
        .get(`/forecasts/${aliceNodeTestForecastId}/nodes/${uuidv4()}`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .expect(404);
    });
  });

  // Node Update Tests
  describe('Node Update (PATCH /forecasts/:forecastId/nodes/:nodeId)', () => {
    let nodeToUpdateId: string;

    beforeEach(async () => {
      const createNodeDto: CreateForecastNodeDto = {
        forecastId: aliceNodeTestForecastId,
        kind: ForecastNodeKind.CONSTANT,
        attributes: { value: 555 },
        position: { x: 10, y: 10 },
      };
      const response = await request(app.getHttpServer())
        .post(`/forecasts/${aliceNodeTestForecastId}/nodes`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(createNodeDto)
        .expect(201);
      nodeToUpdateId = response.body.id;
    });

    it('Alice should be able to update her node\'s attributes and position', async () => {
      const updateNodeDto: UpdateForecastNodeDto = {
        attributes: { value: 777 },
        position: { x: 15, y: 25 },
      };
      await request(app.getHttpServer())
        .patch(`/forecasts/${aliceNodeTestForecastId}/nodes/${nodeToUpdateId}`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(updateNodeDto)
        .expect(204);

      const verifyResponse = await request(app.getHttpServer())
        .get(`/forecasts/${aliceNodeTestForecastId}/nodes/${nodeToUpdateId}`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .expect(200);
      expect(verifyResponse.body.attributes).toEqual({ value: 777 });
      expect(verifyResponse.body.position).toEqual({ x: 15, y: 25 });
    });

    it('Charlie should get 404 when trying to update a node in Alice\'s forecast', async () => {
      const updateNodeDto: UpdateForecastNodeDto = { attributes: { value: 999 } }; 
      await request(app.getHttpServer())
        .patch(`/forecasts/${aliceNodeTestForecastId}/nodes/${nodeToUpdateId}`)
        .set('Authorization', `Bearer ${charlieAuthToken}`)
        .send(updateNodeDto)
        .expect(404);
    });

    it('Alice should get 404 when trying to update a non-existent node in her forecast', async () => {
      const updateNodeDto: UpdateForecastNodeDto = { attributes: { value: 111 } }; 
      await request(app.getHttpServer())
        .patch(`/forecasts/${aliceNodeTestForecastId}/nodes/${uuidv4()}`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(updateNodeDto)
        .expect(404);
    });
  });

  // Node Deletion Tests
  describe('Node Deletion (DELETE /forecasts/:forecastId/nodes/:nodeId)', () => {
    it('Alice should be able to delete her node', async () => {
      const createNodeDto: CreateForecastNodeDto = {
        forecastId: aliceNodeTestForecastId,
        kind: ForecastNodeKind.METRIC,
        attributes: { label: 'To Delete', budgetVariableId: uuidv4(), historicalVariableId: uuidv4() },
        position: { x: 200, y: 200 },
      };
      const response = await request(app.getHttpServer())
        .post(`/forecasts/${aliceNodeTestForecastId}/nodes`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(createNodeDto)
        .expect(201);
      const nodeToDeleteId = response.body.id;

      await request(app.getHttpServer())
        .delete(`/forecasts/${aliceNodeTestForecastId}/nodes/${nodeToDeleteId}`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/forecasts/${aliceNodeTestForecastId}/nodes/${nodeToDeleteId}`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .expect(404);
    });

    it('Charlie should get 404 when trying to delete a node in Alice\'s forecast', async () => {
      const createNodeDto: CreateForecastNodeDto = {
        forecastId: aliceNodeTestForecastId,
        kind: ForecastNodeKind.SEED,
        attributes: { sourceMetricId: uuidv4() }, 
        position: { x: 210, y: 210 },
      };
      const response = await request(app.getHttpServer())
        .post(`/forecasts/${aliceNodeTestForecastId}/nodes`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(createNodeDto)
        .expect(201);
      const alicesNodeId = response.body.id;

      await request(app.getHttpServer())
        .delete(`/forecasts/${aliceNodeTestForecastId}/nodes/${alicesNodeId}`)
        .set('Authorization', `Bearer ${charlieAuthToken}`)
        .expect(404);
    });

    it('Alice should get 404 when trying to delete a non-existent node', async () => {
      await request(app.getHttpServer())
        .delete(`/forecasts/${aliceNodeTestForecastId}/nodes/${uuidv4()}`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .expect(404);
    });
  });
}); 