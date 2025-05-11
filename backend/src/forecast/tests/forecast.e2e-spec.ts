import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../app.module';
import { CreateForecastDto, UpdateForecastDto } from '../dto/forecast.dto';
import { CreateForecastNodeDto, UpdateForecastNodeDto, ForecastNodeKind, ConstantNodeAttributes } from '../dto/forecast-node.dto';
import { CreateForecastEdgeDto, UpdateForecastEdgeDto } from '../dto/forecast-edge.dto';
import { v4 as uuidv4 } from 'uuid';
import * as request from 'supertest';
import { Response } from 'supertest';

let app: INestApplication;
let aliceAuthToken: string;
let charlieAuthToken: string;
let supabaseAdminClient: any;
let sourceNodeId: string;
let targetNodeId: string;
let aliceEdgeTestForecastId: string;

beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  await app.init();

  aliceAuthToken = 'test-alice-token';
  charlieAuthToken = 'test-charlie-token';
  supabaseAdminClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: {}, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  };
  sourceNodeId = uuidv4();
  targetNodeId = uuidv4();
  aliceEdgeTestForecastId = uuidv4();
});

afterAll(async () => {
  await app.close();
});

// Forecast Edge Operations (RLS)
describe('Forecast Edge Operations (RLS)', () => {
  let localAliceEdgeTestForecastId: string;
  let localSourceNodeId: string;
  let localTargetNodeId: string;
  // Use a different variable name for the edge created in Edge Reading's beforeAll
  // to avoid conflict if that beforeAll runs before this parent describe's beforeAll.
  // However, with Jest's execution order, parent beforeAll runs first.
  // let createdEdgeIdForReadTestsScoped: string; // This line might be an artifact of thought process, will remove if not needed.

  beforeAll(async () => {
    // 1. Alice creates a forecast for edge tests
    const forecastDto: CreateForecastDto = {
      name: 'Alice Edge Test Forecast',
      forecastStartDate: new Date().toISOString(),
      forecastEndDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(),
      organizationId: uuidv4(),
    };
    const forecastResponse = await request(app.getHttpServer())
      .post('/forecasts')
      .set('Authorization', `Bearer ${aliceAuthToken}`)
      .send(forecastDto)
      .expect(201);
    localAliceEdgeTestForecastId = forecastResponse.body.id;
    expect(localAliceEdgeTestForecastId).toBeDefined();

    // 2. Alice creates a source node in this forecast
    const sourceNodeDto: CreateForecastNodeDto = {
      forecastId: localAliceEdgeTestForecastId,
      kind: ForecastNodeKind.CONSTANT,
      position: { x: 0, y: 0 },
      attributes: { value: 10 } as ConstantNodeAttributes,
    };
    const sourceNodeResponse = await request(app.getHttpServer())
      .post(`/forecasts/${localAliceEdgeTestForecastId}/nodes`)
      .set('Authorization', `Bearer ${aliceAuthToken}`)
      .send(sourceNodeDto)
      .expect(201);
    localSourceNodeId = sourceNodeResponse.body.id;
    expect(localSourceNodeId).toBeDefined();

    // 3. Alice creates a target node in this forecast
    const targetNodeDto: CreateForecastNodeDto = {
      forecastId: localAliceEdgeTestForecastId,
      kind: ForecastNodeKind.CONSTANT,
      position: { x: 100, y: 0 },
      attributes: { value: 20 } as ConstantNodeAttributes,
    };
    const targetNodeResponse = await request(app.getHttpServer())
      .post(`/forecasts/${localAliceEdgeTestForecastId}/nodes`)
      .set('Authorization', `Bearer ${aliceAuthToken}`)
      .send(targetNodeDto)
      .expect(201);
    localTargetNodeId = targetNodeResponse.body.id;
    expect(localTargetNodeId).toBeDefined();
  });

  describe('Edge Creation', () => {
    it('Alice (forecast owner) should successfully create an edge in her forecast', async () => {
      const edgeDto: CreateForecastEdgeDto = {
        forecastId: localAliceEdgeTestForecastId,
        sourceNodeId: localSourceNodeId,
        targetNodeId: localTargetNodeId,
        attributes: { type: 'creation_test_alice' },
      };
      const response = await request(app.getHttpServer())
        .post(`/forecasts/${localAliceEdgeTestForecastId}/edges`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(edgeDto)
        .expect(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.sourceNodeId).toBe(localSourceNodeId);
      expect(response.body.targetNodeId).toBe(localTargetNodeId);
      expect(response.body.attributes.type).toBe('creation_test_alice');
      // TODO: Add this created edge ID to a list for potential cleanup if not covered by forecast deletion
    });

    it('Charlie (not forecast owner) should NOT be able to create an edge in Alice\'s forecast (403 Forbidden)', async () => {
      const edgeDto: CreateForecastEdgeDto = {
        forecastId: localAliceEdgeTestForecastId,
        sourceNodeId: localSourceNodeId,
        targetNodeId: localTargetNodeId,
        attributes: { type: 'creation_test_charlie_fail' },
      };
      await request(app.getHttpServer())
        .post(`/forecasts/${localAliceEdgeTestForecastId}/edges`)
        .set('Authorization', `Bearer ${charlieAuthToken}`)
        .send(edgeDto)
        .expect(403); // Or 404 if RLS hides the forecast itself
    });

    it('Alice should NOT be able to create an edge in a non-existent forecast (404 Not Found)', async () => {
      const nonExistentForecastId = uuidv4();
      const edgeDto: CreateForecastEdgeDto = {
        forecastId: nonExistentForecastId,
        sourceNodeId: localSourceNodeId, // These don't matter as forecast is non-existent
        targetNodeId: localTargetNodeId,
        attributes: { type: 'creation_test_non_existent_forecast' },
      };
      await request(app.getHttpServer())
        .post(`/forecasts/${nonExistentForecastId}/edges`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(edgeDto)
        .expect(404);
    });
    
    it('Alice should NOT be able to create an edge with a non-existent source node (404 Not Found)', async () => {
      const nonExistentSourceNodeId = uuidv4();
      const edgeDto: CreateForecastEdgeDto = {
        forecastId: localAliceEdgeTestForecastId,
        sourceNodeId: nonExistentSourceNodeId,
        targetNodeId: localTargetNodeId,
        attributes: { type: 'creation_test_non_existent_source' },
      };
      await request(app.getHttpServer())
        .post(`/forecasts/${localAliceEdgeTestForecastId}/edges`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(edgeDto)
        .expect(404); // Assuming service checks node existence and returns 404
    });

    it('Alice should NOT be able to create an edge with a non-existent target node (404 Not Found)', async () => {
      const nonExistentTargetNodeId = uuidv4();
      const edgeDto: CreateForecastEdgeDto = {
        forecastId: localAliceEdgeTestForecastId,
        sourceNodeId: localSourceNodeId,
        targetNodeId: nonExistentTargetNodeId,
        attributes: { type: 'creation_test_non_existent_target' },
      };
      await request(app.getHttpServer())
        .post(`/forecasts/${localAliceEdgeTestForecastId}/edges`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(edgeDto)
        .expect(404); // Assuming service checks node existence and returns 404
    });
  });

  describe('Edge Reading', () => {
    let createdEdgeIdForReadTests: string;
    // const edgeSourceNodeId = localSourceNodeId; // Use localSourceNodeId directly
    // const edgeTargetNodeId = localTargetNodeId; // Use localTargetNodeId directly

    beforeAll(async () => { // This beforeAll is for 'Edge Reading' specifically
      const edgeDto: CreateForecastEdgeDto = {
        forecastId: localAliceEdgeTestForecastId,
        sourceNodeId: localSourceNodeId, // Use the one created in parent beforeAll
        targetNodeId: localTargetNodeId, // Use the one created in parent beforeAll
        attributes: { type: 'standard_read_test' },
      };
      const response = await request(app.getHttpServer())
        .post(`/forecasts/${localAliceEdgeTestForecastId}/edges`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(edgeDto)
        .expect(201);
      createdEdgeIdForReadTests = response.body.id;
      expect(createdEdgeIdForReadTests).toBeDefined();
    });

    it('Alice (forecast owner) should be able to list edges for her forecast', async () => {
      const response = await request(app.getHttpServer())
        .get(`/forecasts/${localAliceEdgeTestForecastId}/edges`)
        .set('Authorization', `Bearer ${aliceAuthToken}`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      // Check if the specifically created edge for read tests is present,
      // and also any edge created by the 'Edge Creation' tests if tests run in order.
      expect(response.body.some((edge: any) => edge.id === createdEdgeIdForReadTests)).toBe(true);
    });

    it('Alice (forecast owner) should be able to get a specific edge by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/forecasts/${localAliceEdgeTestForecastId}/edges/${createdEdgeIdForReadTests}`)
        .set('Authorization', `Bearer ${aliceAuthToken}`);
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(createdEdgeIdForReadTests);
      expect(response.body.sourceNodeId).toBe(localSourceNodeId);
      expect(response.body.targetNodeId).toBe(localTargetNodeId);
    });

    it("Charlie (not forecast owner) should NOT be able to list edges for Alice\'s forecast (403 Forbidden)", async () => {
      const response = await request(app.getHttpServer())
        .get(`/forecasts/${localAliceEdgeTestForecastId}/edges`)
        .set('Authorization', `Bearer ${charlieAuthToken}`);
      expect(response.status).toBe(403);
    });

    it("Charlie (not forecast owner) should NOT be able to get a specific edge from Alice\'s forecast (403 Forbidden)", async () => {
      const response = await request(app.getHttpServer())
        .get(`/forecasts/${localAliceEdgeTestForecastId}/edges/${createdEdgeIdForReadTests}`)
        .set('Authorization', `Bearer ${charlieAuthToken}`);
      expect(response.status).toBe(403);
    });

    it('Unauthenticated user should NOT be able to list edges (401 Unauthorized)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/forecasts/${localAliceEdgeTestForecastId}/edges`);
      expect(response.status).toBe(401);
    });

    it('Unauthenticated user should NOT be able to get a specific edge (401 Unauthorized)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/forecasts/${localAliceEdgeTestForecastId}/edges/${createdEdgeIdForReadTests}`);
      expect(response.status).toBe(401);
    });

    it('Should return 404 when trying to get a non-existent edge', async () => {
      const nonExistentEdgeId = uuidv4();
      const response = await request(app.getHttpServer())
        .get(`/forecasts/${localAliceEdgeTestForecastId}/edges/${nonExistentEdgeId}`)
        .set('Authorization', `Bearer ${aliceAuthToken}`);
      expect(response.status).toBe(404);
    });
  });

  describe('Edge Updating', () => {
    let edgeToUpdateId: string;
    // const edgeSourceNodeId = localSourceNodeId; // Use localSourceNodeId directly
    // const edgeTargetNodeId = localTargetNodeId; // Use localTargetNodeId directly
    const initialEdgeAttributes = { type: 'initial_standard_update' }; // Changed to avoid conflict
    const updatedEdgeAttributes = { type: 'updated_standard_update' }; // Changed to avoid conflict

    beforeEach(async () => { // beforeEach is fine for update/delete tests needing a fresh edge
      const createEdgeDto: CreateForecastEdgeDto = {
        forecastId: localAliceEdgeTestForecastId,
        sourceNodeId: localSourceNodeId,
        targetNodeId: localTargetNodeId,
        attributes: initialEdgeAttributes,
      };
      const response = await request(app.getHttpServer())
        .post(`/forecasts/${localAliceEdgeTestForecastId}/edges`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(createEdgeDto)
        .expect(201);
      edgeToUpdateId = response.body.id;
      expect(edgeToUpdateId).toBeDefined();
    });

    it('Alice (forecast owner) should be able to update an edge in her forecast', async () => {
      const updateDto: UpdateForecastEdgeDto = {
        attributes: updatedEdgeAttributes,
      };
      const response = await request(app.getHttpServer())
        .patch(`/forecasts/${localAliceEdgeTestForecastId}/edges/${edgeToUpdateId}`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(updateDto);
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(edgeToUpdateId);
      expect(response.body.attributes.type).toBe(updatedEdgeAttributes.type);

      const { data: edge, error } = await supabaseAdminClient
        .from('forecast_edges')
        .select('attributes')
        .eq('id', edgeToUpdateId)
        .single();
      expect(error).toBeNull();
      expect(edge.attributes.type).toBe(updatedEdgeAttributes.type);
    });

    it("Charlie (not forecast owner) should NOT be able to update an edge in Alice\'s forecast (403 Forbidden)", async () => {
      const updateDto: UpdateForecastEdgeDto = {
        attributes: { type: 'charlie_update_attempt' },
      };
      const response = await request(app.getHttpServer())
        .patch(`/forecasts/${localAliceEdgeTestForecastId}/edges/${edgeToUpdateId}`)
        .set('Authorization', `Bearer ${charlieAuthToken}`)
        .send(updateDto);
      expect(response.status).toBe(403);
    });

    it('Unauthenticated user should NOT be able to update an edge (401 Unauthorized)', async () => {
      const updateDto: UpdateForecastEdgeDto = {
        attributes: { type: 'unauth_update_attempt' },
      };
      const response = await request(app.getHttpServer())
        .patch(`/forecasts/${localAliceEdgeTestForecastId}/edges/${edgeToUpdateId}`)
        .send(updateDto);
      expect(response.status).toBe(401);
    });

    it('Should return 404 when trying to update a non-existent edge', async () => {
      const nonExistentEdgeId = uuidv4();
      const updateDto: UpdateForecastEdgeDto = {
        attributes: { type: 'update_non_existent' },
      };
      const response = await request(app.getHttpServer())
        .patch(`/forecasts/${localAliceEdgeTestForecastId}/edges/${nonExistentEdgeId}`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(updateDto);
      expect(response.status).toBe(404);
    });
  });

  describe('Edge Deletion', () => {
    let edgeToDeleteId: string;
    // const edgeSourceNodeId = localSourceNodeId; // Use localSourceNodeId directly
    // const edgeTargetNodeId = localTargetNodeId; // Use localTargetNodeId directly

    beforeEach(async () => { // beforeEach is fine for delete tests
      const createEdgeDto: CreateForecastEdgeDto = {
        forecastId: localAliceEdgeTestForecastId,
        sourceNodeId: localSourceNodeId,
        targetNodeId: localTargetNodeId,
        attributes: { type: 'to_be_deleted_scoped' }, // Changed to avoid conflict
      };
      const response = await request(app.getHttpServer())
        .post(`/forecasts/${localAliceEdgeTestForecastId}/edges`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(createEdgeDto)
        .expect(201);
      edgeToDeleteId = response.body.id;
      expect(edgeToDeleteId).toBeDefined();
    });
    
    it('Alice (forecast owner) should be able to delete an edge in her forecast', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/forecasts/${localAliceEdgeTestForecastId}/edges/${edgeToDeleteId}`)
        .set('Authorization', `Bearer ${aliceAuthToken}`);
      expect(response.status).toBe(204);

      const { data: edge, error } = await supabaseAdminClient
        .from('forecast_edges')
        .select('id')
        .eq('id', edgeToDeleteId)
        .maybeSingle();
      expect(error).toBeNull();
      expect(edge).toBeNull();
    });

    it("Charlie (not forecast owner) should NOT be able to delete an edge in Alice\'s forecast (403 Forbidden)", async () => {
      const response = await request(app.getHttpServer())
        .delete(`/forecasts/${localAliceEdgeTestForecastId}/edges/${edgeToDeleteId}`)
        .set('Authorization', `Bearer ${charlieAuthToken}`);
      expect(response.status).toBe(403);
    });

    it('Unauthenticated user should NOT be able to delete an edge (401 Unauthorized)', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/forecasts/${localAliceEdgeTestForecastId}/edges/${edgeToDeleteId}`);
      expect(response.status).toBe(401);
    });

    it('Should return 404 when trying to delete a non-existent edge', async () => {
      const nonExistentEdgeId = uuidv4();
      const response = await request(app.getHttpServer())
        .delete(`/forecasts/${localAliceEdgeTestForecastId}/edges/${nonExistentEdgeId}`)
        .set('Authorization', `Bearer ${aliceAuthToken}`);
      expect(response.status).toBe(404);
    });

    it('Should return 404 when trying to delete an already deleted edge', async () => {
      await request(app.getHttpServer())
        .delete(`/forecasts/${localAliceEdgeTestForecastId}/edges/${edgeToDeleteId}`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .expect(204);

      const response = await request(app.getHttpServer())
        .delete(`/forecasts/${localAliceEdgeTestForecastId}/edges/${edgeToDeleteId}`)
        .set('Authorization', `Bearer ${aliceAuthToken}`);
      expect(response.status).toBe(404);
    });
  });
}); // End of Forecast Edge Operations (RLS)
// Make sure this is the last describe block or adjust accordingly if other tests follow.
// The original Edge Reading, Updating, Deletion describe blocks should be removed if they are now inside the new parent describe.
// The diff will handle this by replacing the old blocks. 