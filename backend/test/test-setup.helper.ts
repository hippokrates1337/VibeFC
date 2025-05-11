import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { v4 as uuidv4 } from 'uuid';
const request = require('supertest'); // Keep supertest here as it's used with 'app'

// Environment and Supabase
const dotenv = require('dotenv');

// Global variables to be shared across test files
export let app: INestApplication;
export let moduleFixture: TestingModule;
export let adminClient: any; // Type appropriately if you have Supabase admin client types

export let dynamicAliceId: string;
export let dynamicCharlieId: string;
export let dynamicOrgAId: string;

export const aliceCredentials = {
  email: `testuser.alice.helper.${uuidv4()}@example.com`, // Ensure unique email
  password: 'password123',
};
export let aliceAuthToken: string = '';

export const charlieCredentials = {
  email: `testuser.charlie.helper.${uuidv4()}@example.com`, // Ensure unique email
  password: 'password123',
};
export let charlieAuthToken: string = '';

export const createdForecastIds: string[] = [];

// Helper function to get Supabase Admin Client (using service role key)
export const getSupabaseAdminClient = () => {
  const { createClient } = require('@supabase/supabase-js');
  // dotenv.config({ path: 'backend/.env' }); // dotenv is loaded by jest setupFiles

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Supabase URL or Service Role Key is not defined. Check backend/.env and Jest setup.'
    );
  }
  return createClient(supabaseUrl, serviceRoleKey);
};

// Helper function to authenticate test users
export async function authenticateTestUser(email: string, password: string): Promise<string> {
  const { createClient } = require('@supabase/supabase-js');
  // dotenv.config({ path: 'backend/.env' }); // dotenv is loaded by jest setupFiles

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL or Anon Key missing. Check backend/.env and Jest setup.');
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

// Global beforeAll setup
export async function globalBeforeAll() {
  dotenv.config({ path: 'backend/.env' }); // Ensure .env is loaded
  adminClient = getSupabaseAdminClient();

  // Generate dynamic IDs
  dynamicOrgAId = uuidv4();
  // Alice and Charlie emails are already dynamic from their credential definitions

  try {
    // 1. Create Users
    console.log(`Creating test user Alice (${aliceCredentials.email})...`);
    const { data: aliceUser, error: aliceErr } = await adminClient.auth.admin.createUser({
      email: aliceCredentials.email,
      password: aliceCredentials.password,
      email_confirm: true,
    });
    if (aliceErr) throw new Error(`Failed to create Alice: ${aliceErr.message}`);
    if (!aliceUser || !aliceUser.user) throw new Error('Alice user data not returned after creation.');
    dynamicAliceId = aliceUser.user.id;
    console.log(`Alice (ID: ${dynamicAliceId}) created successfully.`);

    console.log(`Creating test user Charlie (${charlieCredentials.email})...`);
    const { data: charlieUser, error: charlieErr } = await adminClient.auth.admin.createUser({
      email: charlieCredentials.email,
      password: charlieCredentials.password,
      email_confirm: true,
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
      .upsert(
        { organization_id: dynamicOrgAId, user_id: dynamicAliceId, role: 'admin' },
        { onConflict: 'organization_id, user_id' }
      )
      .select();

    if (memberErr) throw new Error(`Could not make Alice admin in OrgA: ${memberErr.message}`);
    console.log('Alice ensured as admin member of OrgA.');

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
    console.error('Error in globalBeforeAll DB setup:', error);
    // Attempt cleanup if setup fails partially
    if (dynamicAliceId) {
      const { error: aliceDelErr } = await adminClient.auth.admin.deleteUser(dynamicAliceId);
      if (aliceDelErr) console.error('Cleanup error for Alice during globalBeforeAll catch:', aliceDelErr.message);
    }
    if (dynamicCharlieId) {
      const { error: charlieDelErr } = await adminClient.auth.admin.deleteUser(dynamicCharlieId);
      if (charlieDelErr) console.error('Cleanup error for Charlie during globalBeforeAll catch:', charlieDelErr.message);
    }
    if (dynamicOrgAId) {
      const { error: memberDelErr } = await adminClient.from('organization_members').delete().eq('organization_id', dynamicOrgAId);
      if (memberDelErr) console.error('Cleanup error for org members during globalBeforeAll catch:', memberDelErr.message);
      const { error: orgDelErr } = await adminClient.from('organizations').delete().eq('id', dynamicOrgAId);
      if (orgDelErr) console.error('Cleanup error for org during globalBeforeAll catch:', orgDelErr.message);
    }
    throw error; // Re-throw to fail tests if setup is broken
  }

  // NestJS App Setup
  moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  await app.init();
}

// Global afterAll cleanup
export async function globalAfterAll() {
  const cleanupAdminClient = getSupabaseAdminClient(); // Get a fresh client instance if needed, or reuse 'adminClient'

  try {
    // 1. Clean up forecasts
    if (createdForecastIds.length > 0) {
      console.log(`Cleaning up ${createdForecastIds.length} forecasts from global array:`, createdForecastIds);
      const { error } = await cleanupAdminClient
        .from('forecasts')
        .delete()
        .in('id', createdForecastIds);
      if (error) console.error('Error cleaning up forecasts:', error.message);
      createdForecastIds.length = 0; // Clear the array after attempting deletion
    }

    // 2. Clean up organization memberships
    if (dynamicOrgAId) {
      console.log(`Cleaning up memberships for OrgA (${dynamicOrgAId})`);
      const { error: memberDelErr } = await cleanupAdminClient
        .from('organization_members')
        .delete()
        .eq('organization_id', dynamicOrgAId);
      if (memberDelErr) console.error('Error cleaning up organization members:', memberDelErr.message);
    }

    // 3. Clean up the organization
    if (dynamicOrgAId) {
      console.log(`Cleaning up OrgA (${dynamicOrgAId})`);
      const { error: orgDelErr } = await cleanupAdminClient
        .from('organizations')
        .delete()
        .eq('id', dynamicOrgAId);
      if (orgDelErr) console.error('Error cleaning up organization:', orgDelErr.message);
    }

    // 4. Clean up users
    if (dynamicAliceId) {
      console.log(`Cleaning up user Alice (ID: ${dynamicAliceId})`);
      const { error: aliceDelErr } = await cleanupAdminClient.auth.admin.deleteUser(dynamicAliceId);
      if (aliceDelErr) console.error('Error cleaning up Alice:', aliceDelErr.message);
    }
    if (dynamicCharlieId) {
      console.log(`Cleaning up user Charlie (ID: ${dynamicCharlieId})`);
      const { error: charlieDelErr } = await cleanupAdminClient.auth.admin.deleteUser(dynamicCharlieId);
      if (charlieDelErr) console.error('Error cleaning up Charlie:', charlieDelErr.message);
    }

    console.log('Global DB cleanup in afterAll completed.');

  } catch (error) {
    console.error('Error in globalAfterAll DB cleanup:', error);
  }

  if (app) {
    await app.close();
  }
} 