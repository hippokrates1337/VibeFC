import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { CreateForecastDto, UpdateForecastDto } from '../src/forecast/dto/forecast.dto';
import { CreateForecastNodeDto, UpdateForecastNodeDto, ForecastNodeKind } from '../src/forecast/dto/forecast-node.dto';
import { CreateForecastEdgeDto } from '../src/forecast/dto/forecast-edge.dto';
import { v4 as uuidv4 } from 'uuid';

// Import Response from supertest for typing
import { Response } from 'supertest';
const request = require('supertest');

// Set longer timeout for all tests in this file since we're connecting to a real database
jest.setTimeout(30000);

/**
 * These tests connect to the real Supabase instance and perform actual database operations.
 * They are true integration tests that verify the full stack from API to database, including RLS.
 */
describe('Forecast Module Integration Tests (RLS Focused)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;

  // Dynamically generated IDs for test entities
  let dynamicAliceId: string;
  let dynamicCharlieId: string;
  let dynamicOrgAId: string;
  
  // Test User Credentials
  const aliceCredentials = {
    email: `testuser.alice.${uuidv4()}@example.com`, // Ensure unique email for each run
    password: 'password123',
  };
  let aliceAuthToken: string = '';

  const charlieCredentials = {
    email: `testuser.charlie.${uuidv4()}@example.com`, // Ensure unique email for each run
    password: 'password123',
  };
  let charlieAuthToken: string = '';
  // --- End Test User Credentials ---
  
  // Store created IDs for cleanup
  const createdForecastIds: string[] = [];

  // Helper function to get Supabase Admin Client (using service role key)
  // This should be used ONLY for setup/teardown, NOT for test requests.
  const getSupabaseAdminClient = () => {
      const { createClient } = require('@supabase/supabase-js');
      const dotenv = require('dotenv');
    dotenv.config({ path: 'backend/.env' }); // Ensure your .env loads SUPABASE_SERVICE_ROLE_KEY
      
      const supabaseUrl = process.env.SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        'Supabase URL or Service Role Key is not defined. Check backend/.env'
      );
    }
    return createClient(supabaseUrl, serviceRoleKey);
  };
  
  // Placeholder for a function to obtain JWTs.
  // In a real scenario, this would call Supabase auth.signInWithPassword()
  // For now, we expect tokens to be manually provided above.
  async function authenticateTestUser(email: string, password: string): Promise<string> {
    const { createClient } = require('@supabase/supabase-js');
    const dotenv = require('dotenv');
    dotenv.config({ path: 'backend/.env' }); // Ensure .env is loaded for SUPABASE_URL and SUPABASE_ANON_KEY

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase URL or Anon Key missing. Check backend/.env');
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (error) {
      console.error(`Failed to authenticate ${email}:`, error);
      throw new Error(`Failed to authenticate ${email}: ${error.message}`);
    }
    if (!data.session) {
      throw new Error(`No session returned for ${email} upon authentication.`);
    }
    return data.session.access_token;
  }

  beforeAll(async () => {
    const dotenv = require('dotenv');
    dotenv.config({ path: 'backend/.env' });
    
    const adminClient = getSupabaseAdminClient();

    // Generate dynamic IDs
    dynamicOrgAId = uuidv4();

    try {
      // 1. Create Users
      console.log(`Creating test user Alice (${aliceCredentials.email})...`);
      const { data: aliceUser, error: aliceErr } = await adminClient.auth.admin.createUser({
        email: aliceCredentials.email,
        password: aliceCredentials.password,
        email_confirm: true, // Auto-confirm email for testing
      });
      if (aliceErr) throw new Error(`Failed to create Alice: ${aliceErr.message}`);
      if (!aliceUser || !aliceUser.user) throw new Error('Alice user data not returned after creation.');
      dynamicAliceId = aliceUser.user.id;
      console.log(`Alice (ID: ${dynamicAliceId}) created successfully.`);

      console.log(`Creating test user Charlie (${charlieCredentials.email})...`);
      const { data: charlieUser, error: charlieErr } = await adminClient.auth.admin.createUser({
        email: charlieCredentials.email,
        password: charlieCredentials.password,
        email_confirm: true, // Auto-confirm email for testing
      });
      if (charlieErr) throw new Error(`Failed to create Charlie: ${charlieErr.message}`);
      if (!charlieUser || !charlieUser.user) throw new Error('Charlie user data not returned after creation.');
      dynamicCharlieId = charlieUser.user.id;
      console.log(`Charlie (ID: ${dynamicCharlieId}) created successfully.`);

      // 2. Authenticate Users to get JWTs
      console.log('Attempting to authenticate Alice...');
      aliceAuthToken = await authenticateTestUser(aliceCredentials.email, aliceCredentials.password);
      console.log('Alice authenticated, token obtained.');
      
      console.log('Attempting to authenticate Charlie...');
      charlieAuthToken = await authenticateTestUser(charlieCredentials.email, charlieCredentials.password);
      console.log('Charlie authenticated, token obtained.');

      if (!aliceAuthToken || !charlieAuthToken) {
        throw new Error('Failed to obtain JWTs for test users.');
      }

      // 3. Create Organization and Membership
      console.log(`Creating Test Organization OrgA (ID: ${dynamicOrgAId}) with owner ${dynamicAliceId}...`);
      const { data: orgData, error: orgErr } = await adminClient
        .from('organizations')
        .insert({ id: dynamicOrgAId, name: 'Test Org A for RLS', owner_id: dynamicAliceId })
        .select();

      if (orgErr) throw new Error(`Failed to create OrgA: ${orgErr.message}`);
      console.log('Test Organization OrgA created:', orgData);

      console.log(`Ensuring Alice (User ID: ${dynamicAliceId}) is an admin member of OrgA (ID: ${dynamicOrgAId})...`);
      const { error: memberErr } = await adminClient
        .from('organization_members')
        .upsert({ organization_id: dynamicOrgAId, user_id: dynamicAliceId, role: 'admin' }, 
                { onConflict: 'organization_id, user_id' })
        .select(); 

      if (memberErr) throw new Error(`Could not make Alice admin in OrgA: ${memberErr.message}`);
      console.log('Alice ensured as admin member of OrgA.');
      
      // Verify membership (optional but good for sanity check)
      const { data: memberCheck, error: memberCheckErr } = await adminClient
        .from('organization_members')
        .select('user_id')
        .eq('user_id', dynamicAliceId)
        .eq('organization_id', dynamicOrgAId)
        .maybeSingle();

      if (memberCheckErr || !memberCheck) {
        throw new Error(`FATAL: Alice's membership in OrgA could not be confirmed. Setup cannot continue. Error: ${memberCheckErr?.message}`);
      }
      console.log('Alice membership in OrgA confirmed.');

    } catch (error) {
      console.error('Error in beforeAll DB setup:', error);
      // Attempt cleanup of created users if setup fails partially
      if (dynamicAliceId) {
        const { error: aliceDelErr } = await adminClient.auth.admin.deleteUser(dynamicAliceId);
        if (aliceDelErr) console.error('Cleanup error for Alice during beforeAll catch:', aliceDelErr.message);
      }
      if (dynamicCharlieId) {
        const { error: charlieDelErr } = await adminClient.auth.admin.deleteUser(dynamicCharlieId);
        if (charlieDelErr) console.error('Cleanup error for Charlie during beforeAll catch:', charlieDelErr.message);
      }
      if (dynamicOrgAId) { // if org was created, try to delete members and org
        const { error: memberDelErr } = await adminClient.from('organization_members').delete().eq('organization_id', dynamicOrgAId);
        if (memberDelErr) console.error('Cleanup error for org members during beforeAll catch:', memberDelErr.message);
        
        const { error: orgDelErr } = await adminClient.from('organizations').delete().eq('id', dynamicOrgAId);
        if (orgDelErr) console.error('Cleanup error for org during beforeAll catch:', orgDelErr.message);
      }
      throw error;
    }
    
      moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      })
      .compile();

      app = moduleFixture.createNestApplication();
      app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }));
      
      await app.init();
  }, 60000); // Increased timeout for setup

  afterAll(async () => {
    const adminClient = getSupabaseAdminClient();
    try {
      // 1. Clean up forecasts
      if (createdForecastIds.length > 0) {
        console.log(`Cleaning up ${createdForecastIds.length} forecasts`);
        const { error } = await adminClient
          .from('forecasts')
            .delete()
          .in('id', createdForecastIds);
        if (error) console.error('Error cleaning up forecasts:', error.message);
      }
      
      // 2. Clean up organization memberships (related to dynamicOrgAId)
      if (dynamicOrgAId) {
        console.log(`Cleaning up memberships for OrgA (${dynamicOrgAId})`);
        const { error: memberDelErr } = await adminClient
          .from('organization_members')
          .delete()
          .eq('organization_id', dynamicOrgAId);
        if (memberDelErr) console.error('Error cleaning up organization members:', memberDelErr.message);
      }

      // 3. Clean up the organization
      if (dynamicOrgAId) {
        console.log(`Cleaning up OrgA (${dynamicOrgAId})`);
        const { error: orgDelErr } = await adminClient
          .from('organizations')
          .delete()
          .eq('id', dynamicOrgAId);
        if (orgDelErr) console.error('Error cleaning up organization:', orgDelErr.message);
      }

      // 4. Clean up users
      if (dynamicAliceId) {
        console.log(`Cleaning up user Alice (ID: ${dynamicAliceId})`);
        const { error: aliceDelErr } = await adminClient.auth.admin.deleteUser(dynamicAliceId);
        if (aliceDelErr) console.error('Error cleaning up Alice:', aliceDelErr.message);
      }
      if (dynamicCharlieId) {
        console.log(`Cleaning up user Charlie (ID: ${dynamicCharlieId})`);
        const { error: charlieDelErr } = await adminClient.auth.admin.deleteUser(dynamicCharlieId);
        if (charlieDelErr) console.error('Error cleaning up Charlie:', charlieDelErr.message);
      }

      console.log('DB cleanup in afterAll completed.');

      } catch (error) {
      console.error('Error in afterAll DB cleanup:', error);
      }
    await app.close();
  }, 30000);
      
  describe('Forecast Creation (RLS)', () => {
    it('Alice (member of OrgA) should be able to create a forecast in OrgA', async () => {
      const createForecastDto: CreateForecastDto = {
        name: `Alice's RLS Test Forecast ${new Date().toISOString()}`,
        forecastStartDate: '2024-01-01',
        forecastEndDate: '2024-12-31',
        organizationId: dynamicOrgAId, // Use dynamic OrgA ID
      };
      
      console.log('Payload for Alice in specific test:', JSON.stringify(createForecastDto));

      const response = await request(app.getHttpServer())
        .post('/forecasts')
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(createForecastDto)
        // .expect(201); // Temporarily relax this to see the actual error if it persists

      // If the test fails with 500, log the body for more details
      if (response.status !== 201) {
        console.error('Create forecast response error (Alice):', response.body);
      }
      expect(response.status).toBe(201); // Re-assert after logging


      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(createForecastDto.name);
      expect(response.body.organizationId).toBe(dynamicOrgAId); // Use dynamic OrgA ID
      // Check if the service populates userId from the token
      // This is a strong expectation for an RLS-enabled system.
      expect(response.body).toHaveProperty('userId');
      expect(response.body.userId).toBe(dynamicAliceId); // Use dynamic Alice ID

      createdForecastIds.push(response.body.id);
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
        .set('Authorization', `Bearer ${charlieAuthToken}`)
        .send(createForecastDto)
        // .expect(process.env.RLS_DENY_BEHAVIOR === '403' ? 403 : 404); // Temporarily relax
      
      // If the test fails with 500, log the body for more details
      if (response.status === 500) {
        console.error('Create forecast response error (Charlie - expected RLS deny):', response.body);
      }
      // Depending on RLS, this might be an empty list (200) if the org itself is visible but items are filtered,
      // or a 404/403 if access to query by that organizationId is denied outright.
      // A common RLS pattern is to return an empty list if the user can't see any items.
      expect([403, 404]).toContain(response.status); // Re-assert after logging

    });
  });

  describe('Forecast Reading (RLS)', () => {
    let aliceForecastId: string;

    beforeAll(async () => {
      const createForecastDto: CreateForecastDto = {
        name: `Alice's Readable Forecast ${new Date().toISOString()}`,
        forecastStartDate: '2024-01-01',
        forecastEndDate: '2024-12-31',
        organizationId: dynamicOrgAId, // Use dynamic OrgA ID
        // userId should NOT be in DTO, it must be derived from token by backend
      };

      // Attempt to create the forecast needed for read tests
      // This will use Alice's token, which should have permissions
      const response = await request(app.getHttpServer())
        .post('/forecasts')
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(createForecastDto);

      if (response.status !== 201) {
        console.error(
          "Failed to create Alice's readable forecast in beforeAll for Read Tests:", 
          response.body
        );
        // It's important to throw here if setup fails, as other tests depend on it.
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
      createdForecastIds.push(aliceForecastId);
      console.log(`Successfully created forecast ${aliceForecastId} for read tests.`);
    });

    it('Alice (member of OrgA) should be able to read her forecast in OrgA', async () => {
      const response = await request(app.getHttpServer())
        .get(`/forecasts/${aliceForecastId}`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .expect(200);

      expect(response.body.id).toBe(aliceForecastId);
      expect(response.body.organizationId).toBe(dynamicOrgAId); // Use dynamic OrgA ID
      // This is a strong expectation for an RLS-enabled system.
      expect(response.body).toHaveProperty('userId');
      expect(response.body.userId).toBe(dynamicAliceId); // Use dynamic Alice ID
    });

    it('Charlie (NOT a member of OrgA) should NOT be able to read Alice\'s forecast from OrgA', async () => {
      // RLS should ensure Charlie gets a 404, as if the forecast doesn't exist for him.
      await request(app.getHttpServer())
        .get(`/forecasts/${aliceForecastId}`)
        .set('Authorization', `Bearer ${charlieAuthToken}`) // Use Charlie's token
        .expect(404);
    });

    it('Alice should get 404 when trying to read a non-existent forecast', async () => {
      await request(app.getHttpServer())
        .get(`/forecasts/${uuidv4()}`) // Use a random non-existent UUID
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .expect(404);
    });

    it('Alice (member of OrgA) should be able to list forecasts for OrgA (and see hers)', async () => {
      await request(app.getHttpServer())
        .get('/forecasts')
        .query({ organizationId: dynamicOrgAId }) // Use dynamic OrgA ID
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .expect(200)
        .then((response: Response) => { // Added Response type
          expect(Array.isArray(response.body)).toBe(true);
          const found = response.body.find((f: any) => f.id === aliceForecastId);
          expect(found).toBeDefined();
          if (found) { // Type guard for found
            expect(found.name).toContain("Alice's Readable Forecast");
          }
    });
  });

    it('Charlie (NOT a member of OrgA) should NOT be able to list forecasts for OrgA (or get an empty list/404)', async () => {
      // Depending on RLS, this might be an empty list (200) if the org itself is visible but items are filtered,
      // or a 404/403 if access to query by that organizationId is denied outright.
      // A common RLS pattern is to return an empty list if the user can't see any items.
      const response = await request(app.getHttpServer())
        .get('/forecasts')
        .query({ organizationId: dynamicOrgAId }) // Use dynamic OrgA ID
        .set('Authorization', `Bearer ${charlieAuthToken}`);
        
      // Check for 200 with empty array OR 403/404 depending on RLS implementation
      if (response.status === 200) {
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(0); // Charlie sees no forecasts in OrgA
      } else {
        expect([403, 404]).toContain(response.status);
      }
    });
  }); // This closes Forecast Reading (RLS)

  describe('Forecast Update (RLS)', () => {
    let forecastToUpdateId: string;

    beforeEach(async () => {
      // Alice creates a forecast to be used for update tests in this block
      const createDto: CreateForecastDto = {
        name: `Forecast For Update Test - ${new Date().toISOString()}`,
        forecastStartDate: '2024-01-01',
        forecastEndDate: '2024-12-31',
        organizationId: dynamicOrgAId, // Use dynamic OrgA ID
      };
      const response = await request(app.getHttpServer())
        .post('/forecasts')
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(createDto)
        .expect(201);
      forecastToUpdateId = response.body.id;
      createdForecastIds.push(forecastToUpdateId); // Ensure it's cleaned up
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

      // Optional: Verify the update
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
        .expect(404); // RLS on findOne in service should lead to 404
    });
  }); // This closes Forecast Update (RLS)

  describe('Forecast Deletion (RLS)', () => {
    it('Alice should be able to delete her own forecast', async () => {
      // Create a forecast specifically for this deletion test
      const tempCreateDto: CreateForecastDto = {
        name: `Forecast To Be Deleted - ${new Date().toISOString()}`,
        forecastStartDate: '2024-01-01',
        forecastEndDate: '2024-12-31',
        organizationId: dynamicOrgAId, // Use dynamic OrgA ID
      };
      const createResponse = await request(app.getHttpServer())
        .post('/forecasts')
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(tempCreateDto)
        .expect(201);
      const forecastIdToDelete = createResponse.body.id;

      await request(app.getHttpServer())
        .delete(`/forecasts/${forecastIdToDelete}`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .expect(204);

      // Verify it's gone
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
      // Alice creates a forecast first
      const tempCreateDto: CreateForecastDto = {
        name: `Alice\'s Forecast For Charlie Delete Attempt - ${new Date().toISOString()}`,
        forecastStartDate: '2024-01-01',
        forecastEndDate: '2024-12-31',
        organizationId: dynamicOrgAId, // Use dynamic OrgA ID
      };
      const createResponse = await request(app.getHttpServer())
        .post('/forecasts')
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(tempCreateDto)
        .expect(201);
      const alicesForecastId = createResponse.body.id;
      createdForecastIds.push(alicesForecastId); // Add to cleanup in case Charlie's delete fails as expected

      await request(app.getHttpServer())
        .delete(`/forecasts/${alicesForecastId}`)
        .set('Authorization', `Bearer ${charlieAuthToken}`)
        .expect(404);
    });
  }); // This closes Forecast Deletion (RLS)

  describe('Forecast Node Operations (RLS)', () => {
    let aliceNodeTestForecastId: string;

    beforeAll(async () => {
      // Alice creates a forecast specifically for node operations in this block
      const createDto: CreateForecastDto = {
        name: `Node Test Forecast - ${new Date().toISOString()}`,
        forecastStartDate: '2024-01-01',
        forecastEndDate: '2024-12-31',
        organizationId: dynamicOrgAId, // Use dynamic OrgA ID
      };
      const response = await request(app.getHttpServer())
        .post('/forecasts')
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(createDto)
        .expect(201);
      aliceNodeTestForecastId = response.body.id;
      createdForecastIds.push(aliceNodeTestForecastId); // Ensure it's cleaned up
    });

    // Node Creation Tests
    describe('Node Creation (POST /forecasts/:forecastId/nodes)', () => {
      it('Alice should be able to create a node in her forecast', async () => {
        const nodeDto: CreateForecastNodeDto = {
          forecastId: aliceNodeTestForecastId, // Will be overridden by param, but good to have
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
          .expect(404); // Because Charlie can't access/find Alice's forecast
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
        // Alice creates a node to be used for reading tests
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
        // Nodes are part of a forecast, individual node IDs don't need separate global cleanup
        // as long as the parent forecast (aliceNodeTestForecastId) is cleaned up.
      });

      it('Alice should be able to list all nodes for her forecast', async () => {
        const response = await request(app.getHttpServer())
          .get(`/forecasts/${aliceNodeTestForecastId}/nodes`)
          .set('Authorization', `Bearer ${aliceAuthToken}`)
          .expect(200);
        
        expect(Array.isArray(response.body)).toBe(true);
        const foundNode = response.body.find((node: any) => node.id === createdNodeId);
        expect(foundNode).toBeDefined();
        expect(foundNode.kind).toBe(ForecastNodeKind.OPERATOR);
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
        // Alice creates a node to be used for update tests
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
          attributes: { value: 777 }, // Assuming it's a CONSTANT node
          position: { x: 15, y: 25 },
        };
        await request(app.getHttpServer())
          .patch(`/forecasts/${aliceNodeTestForecastId}/nodes/${nodeToUpdateId}`)
          .set('Authorization', `Bearer ${aliceAuthToken}`)
          .send(updateNodeDto)
          .expect(204);

        // Verify update
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
        // Create a node specifically for this deletion test
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

        // Verify it's gone by trying to get it
        await request(app.getHttpServer())
          .get(`/forecasts/${aliceNodeTestForecastId}/nodes/${nodeToDeleteId}`)
          .set('Authorization', `Bearer ${aliceAuthToken}`)
          .expect(404);
      });

      it('Charlie should get 404 when trying to delete a node in Alice\'s forecast', async () => {
        // Alice creates a node first
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
        // No need to add to global cleanup, this test expects it to be not deleted by Charlie
        // and if it were, the parent forecast cleanup would handle it.

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

  }); // This closes Forecast Node Operations (RLS)

  describe('Forecast Edge Operations (RLS)', () => {
    let aliceEdgeTestForecastId: string;
    let sourceNodeId: string;
    let targetNodeId: string;

    beforeAll(async () => {
      // Alice creates a forecast specifically for edge operations
      const createForecastDto: CreateForecastDto = {
        name: `Edge Test Forecast - ${new Date().toISOString()}`,
        forecastStartDate: '2024-01-01',
        forecastEndDate: '2024-12-31',
        organizationId: dynamicOrgAId, // Use dynamic OrgA ID
      };
      let response = await request(app.getHttpServer())
        .post('/forecasts')
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(createForecastDto)
        .expect(201);
      aliceEdgeTestForecastId = response.body.id;
      createdForecastIds.push(aliceEdgeTestForecastId);

      // Create source node
      const sourceNodeDto: CreateForecastNodeDto = {
        forecastId: aliceEdgeTestForecastId,
        kind: ForecastNodeKind.CONSTANT,
        attributes: { value: 1 },
        position: { x: 0, y: 0 },
      };
      response = await request(app.getHttpServer())
        .post(`/forecasts/${aliceEdgeTestForecastId}/nodes`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(sourceNodeDto)
        .expect(201);
      sourceNodeId = response.body.id;

      // Create target node
      const targetNodeDto: CreateForecastNodeDto = {
        forecastId: aliceEdgeTestForecastId,
        kind: ForecastNodeKind.CONSTANT,
        attributes: { value: 2 },
        position: { x: 100, y: 0 },
      };
      response = await request(app.getHttpServer())
        .post(`/forecasts/${aliceEdgeTestForecastId}/nodes`)
        .set('Authorization', `Bearer ${aliceAuthToken}`)
        .send(targetNodeDto)
        .expect(201);
      targetNodeId = response.body.id;
    });

    // Edge Creation Tests
    describe('Edge Creation (POST /forecasts/:forecastId/edges)', () => {
      it('Alice should be able to create an edge in her forecast', async () => {
        const edgeDto: CreateForecastEdgeDto = {
          forecastId: aliceEdgeTestForecastId, // Will be overridden by param
          sourceNodeId: sourceNodeId,
          targetNodeId: targetNodeId,
        };
        const response = await request(app.getHttpServer())
          .post(`/forecasts/${aliceEdgeTestForecastId}/edges`)
          .set('Authorization', `Bearer ${aliceAuthToken}`)
          .send(edgeDto)
          .expect(201);
        
        expect(response.body).toHaveProperty('id');
        expect(response.body.forecastId).toBe(aliceEdgeTestForecastId);
        expect(response.body.sourceNodeId).toBe(sourceNodeId);
        expect(response.body.targetNodeId).toBe(targetNodeId);
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
          .expect(404); // Because Charlie can't access Alice's forecast
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
        expect([400, 404]).toContain(response.status); // Service might throw 400 (FK constraint) or 404 (if node existence checked first)
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
    });

    // Placeholder for Edge Reading, Deletion tests

  }); // This closes Forecast Edge Operations (RLS)

}); // This closes the main 'Forecast Module Integration Tests (RLS Focused)' describe block 