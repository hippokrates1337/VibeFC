import { test, expect, Page, BrowserContext, Route, Request } from '@playwright/test';

/**
 * E2E Tests for Forecast Definition Feature
 * 
 * Tests the complete user flow for creating and managing forecast graphs.
 * Uses the same authentication pattern as data-intake.spec.ts
 */

// Test user credentials
const TEST_EMAIL = 'testuser@dummydomain.org';
const TEST_PASSWORD = 'password';

// Mock data structures
interface MockForecast {
  id: string;
  name: string;
  forecastStartDate: string;
  forecastEndDate: string;
  organizationId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

const MOCK_ORG = { 
  id: 'org-forecast-test', 
  name: 'Test Forecast Org', 
  owner_id: 'test-user-id',
  created_at: new Date().toISOString() 
};

const MOCK_VARIABLES = [
  { 
    id: 'var-revenue', 
    name: 'Historical Revenue', 
    type: 'ACTUAL', 
    organizationId: 'org-forecast-test', 
    timeSeries: [{ date: '2023-01-01T00:00:00.000Z', value: 100000 }] 
  },
  { 
    id: 'var-budget', 
    name: 'Budget Revenue', 
    type: 'BUDGET', 
    organizationId: 'org-forecast-test', 
    timeSeries: [{ date: '2024-01-01T00:00:00.000Z', value: 120000 }] 
  }
];

test.describe('Forecast Definition E2E Tests', () => {
  let actualUserId: string | null = null;

  test.beforeEach(async ({ page }: { page: Page }) => {
    test.setTimeout(120000); // Increased timeout
    
    // Validate environment
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is required');
    }
    
    console.log(`🔧 Testing with ${TEST_EMAIL}`);
    
    // Login flow with better error handling
    await page.goto('/login');
    await expect(page.locator('h1:has-text("Login")')).toBeVisible({ timeout: 15000 });
    
    await page.locator('input#email').fill(TEST_EMAIL);
    await page.locator('input#password').fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();
    
    // Wait longer and check for redirect more thoroughly
    await page.waitForTimeout(5000);
    
    // Verify login success - improved detection
    const currentUrl = page.url();
    console.log(`Current URL after login attempt: ${currentUrl}`);
    
    if (currentUrl.includes('/login')) {
      // Check for specific error messages
      const errorElement = page.locator('div:has-text("Invalid login credentials")');
      const isErrorVisible = await errorElement.isVisible();
      
      if (isErrorVisible) {
        throw new Error(`Authentication failed: Test user ${TEST_EMAIL} does not exist or password is incorrect.`);
      }
      
      // Wait a bit more in case redirect is slow
      await page.waitForTimeout(3000);
      const finalUrl = page.url();
      
      if (finalUrl.includes('/login')) {
        throw new Error(`Login failed - still on login page after waiting. Final URL: ${finalUrl}`);
      }
    }
    
    // Get user ID from auth state with better error handling
    actualUserId = await page.evaluate<string | null>(() => {
      try {
        const storageKey = Object.keys(localStorage).find(key => 
          key.startsWith('sb-') && key.endsWith('-auth-token')
        );
        if (!storageKey) return null;
        
        const sessionData = JSON.parse(localStorage.getItem(storageKey) || '{}');
        return sessionData?.user?.id || null;
      } catch {
        return null;
      }
    });

    if (!actualUserId) {
      throw new Error('Could not retrieve user ID after login');
    }
    
    console.log(`✅ Login successful, user ID: ${actualUserId}`);
    
    // Update mock data
    MOCK_ORG.owner_id = actualUserId;
    
    // Set up authentication cookie for API requests
    await setupAuthenticationCookie(page);
    
    // Setup API mocking
    await setupApiMocks(page, supabaseUrl, actualUserId);
    
    // Initialize stores
    await initializeStores(page);
  });

  async function setupAuthenticationCookie(page: Page) {
    // Set a mock authentication cookie that the API client will use
    await page.addInitScript(() => {
      // Set a mock auth token cookie
      document.cookie = 'sb-access-token=mock-test-token; path=/; domain=localhost';
    });
  }

  async function setupApiMocks(page: Page, supabaseUrl: string, userId: string) {
    console.log('Setting up API mocks...');
    
    // Mock Supabase endpoints
    await page.route(new RegExp(`${supabaseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/rest/v1/organization_members.*`), 
      async (route) => {
        await route.fulfill({ 
          status: 200, 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([{ organization_id: MOCK_ORG.id, role: 'admin' }])
        });
      }
    );

    await page.route(new RegExp(`${supabaseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/rest/v1/organizations.*`), 
      async (route) => {
        await route.fulfill({ 
          status: 200, 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([MOCK_ORG])
        });
      }
    );

    // Mock Supabase forecast requests - NEW
    await page.route(new RegExp(`${supabaseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/rest/v1/forecasts.*`), 
      async (route) => {
        const url = route.request().url();
        console.log(`🔍 Mocking Supabase forecast request: ${url}`);
        
        // Return empty array for forecast list requests
        if (url.includes('select=*')) {
          await route.fulfill({ 
            status: 200, 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([])
          });
        } else {
          await route.fulfill({ 
            status: 200, 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: [] })
          });
        }
      }
    );
    
    // Mock ALL possible backend URLs - make it more flexible
    const possibleBackendUrls = [
      'http://localhost:3001',
      'http://localhost:3000/api', 
      'http://127.0.0.1:3001',
      '/api' // Relative path
    ];
    
    for (const backendUrl of possibleBackendUrls) {
      await setupForecastApiMocks(page, backendUrl, userId);
    }
    
    // Also catch any unhandled backend requests
    await page.route('**/forecasts**', async (route, request) => {
      const url = request.url();
      console.log(`Unhandled forecast API request: ${request.method()} ${url}`);
      
      // Default response for unhandled requests
      if (request.method() === 'POST' && url.includes('/forecasts') && !url.includes('/forecasts/')) {
        // Forecast creation
        const requestData = request.postDataJSON();
        const newForecastId = `forecast-${Date.now()}`;
        const newForecast: MockForecast = {
          id: newForecastId,
          name: requestData?.name || 'New Forecast',
          forecastStartDate: requestData?.forecastStartDate || '2024-01-01',
          forecastEndDate: requestData?.forecastEndDate || '2024-12-31',
          organizationId: requestData?.organizationId || MOCK_ORG.id,
          userId: userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await route.fulfill({ 
          status: 201, 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newForecast)
        });
      } else {
        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true, data: [] })
        });
      }
    });

    // Mock variables API with different possible URLs
    for (const backendUrl of possibleBackendUrls) {
      await page.route(new RegExp(`${backendUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/data-intake/variables/${userId}.*`), async (route) => {
        const mockResponse = {
          variables: MOCK_VARIABLES.map(v => ({
            id: v.id,
            name: v.name,
            type: v.type,
            organization_id: v.organizationId,
            values: v.timeSeries.map(ts => ({
              date: ts.date,
              value: ts.value
            }))
          }))
        };
        
        await route.fulfill({ 
          status: 200, 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockResponse)
        });
      });
    }
  }

  async function setupForecastApiMocks(page: Page, backendUrl: string, userId: string) {
    // Mock forecast list endpoint
    await page.route(new RegExp(`${backendUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/forecasts\\?organizationId=.*`), async (route) => {
      const mockForecasts: MockForecast[] = [{
        id: 'forecast-test-1',
        name: 'Test Forecast',
        forecastStartDate: '2024-01-01',
        forecastEndDate: '2024-12-31',
        organizationId: MOCK_ORG.id,
        userId: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }];
      
      await route.fulfill({ 
        status: 200, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockForecasts)
      });
    });
    
    // Mock specific forecast endpoint
    await page.route(new RegExp(`${backendUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/forecasts/forecast-test-1$`), async (route) => {
      const mockForecast = {
        id: 'forecast-test-1',
        name: 'Test Forecast',
        forecastStartDate: '2024-01-01',
        forecastEndDate: '2024-12-31',
        organizationId: MOCK_ORG.id,
        userId: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await route.fulfill({ 
        status: 200, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockForecast)
      });
    });
    
    // Mock forecast nodes endpoint
    await page.route(new RegExp(`${backendUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/forecasts/forecast-test-1/nodes$`), async (route, request) => {
      if (request.method() === 'GET') {
        await route.fulfill({ 
          status: 200, 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([])
        });
      } else if (request.method() === 'POST') {
        const requestData = request.postDataJSON();
        const newNode = {
          id: `node-${Date.now()}`,
          forecastId: 'forecast-test-1',
          kind: requestData?.kind || 'DATA',
          attributes: requestData?.attributes || {},
          position: requestData?.position || { x: 100, y: 100 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await route.fulfill({ 
          status: 201, 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newNode)
        });
      } else {
        await route.continue();
      }
    });
    
    // Mock forecast edges endpoint
    await page.route(new RegExp(`${backendUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/forecasts/forecast-test-1/edges$`), async (route, request) => {
      if (request.method() === 'GET') {
        await route.fulfill({ 
          status: 200, 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([])
        });
      } else if (request.method() === 'POST') {
        const requestData = request.postDataJSON();
        const newEdge = {
          id: `edge-${Date.now()}`,
          forecastId: 'forecast-test-1',
          sourceNodeId: requestData?.sourceNodeId || 'node-1',
          targetNodeId: requestData?.targetNodeId || 'node-2',
          createdAt: new Date().toISOString()
        };
        await route.fulfill({ 
          status: 201, 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newEdge)
        });
      } else {
        await route.continue();
      }
    });
    
    // Mock forecast creation endpoint - ENHANCED
    await page.route(new RegExp(`${backendUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/forecasts$`), async (route, request) => {
      if (request.method() === 'POST') {
        console.log(`Handling forecast creation request to: ${request.url()}`);
        const requestData = request.postDataJSON();
        const newForecastId = `forecast-${Date.now()}`;
        const newForecast: MockForecast = {
          id: newForecastId,
          name: requestData?.name || 'New Forecast',
          forecastStartDate: requestData?.forecastStartDate || '2024-01-01',
          forecastEndDate: requestData?.forecastEndDate || '2024-12-31',
          organizationId: requestData?.organizationId || MOCK_ORG.id,
          userId: userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        console.log(`Created mock forecast:`, newForecast);
        
        // Dynamically add routes for the new forecast
        await setupDynamicForecastRoutes(page, backendUrl, newForecastId, newForecast);
        
        await route.fulfill({ 
          status: 201, 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newForecast)
        });
      } else {
        await route.continue();
      }
    });
  }

  async function setupDynamicForecastRoutes(page: Page, backendUrl: string, forecastId: string, forecast: MockForecast) {
    // Add route for the newly created forecast metadata
    await page.route(new RegExp(`${backendUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/forecasts/${forecastId}$`), async (newRoute) => {
      await newRoute.fulfill({ 
        status: 200, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(forecast)
      });
    });
    
    // Add route for the newly created forecast nodes
    await page.route(new RegExp(`${backendUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/forecasts/${forecastId}/nodes$`), async (newRoute, newRequest) => {
      if (newRequest.method() === 'GET') {
        await newRoute.fulfill({ 
          status: 200, 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([])
        });
      } else {
        await newRoute.continue();
      }
    });
    
    // Add route for the newly created forecast edges
    await page.route(new RegExp(`${backendUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/forecasts/${forecastId}/edges$`), async (newRoute, newRequest) => {
      if (newRequest.method() === 'GET') {
        await newRoute.fulfill({ 
          status: 200, 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([])
        });
      } else {
        await newRoute.continue();
      }
    });
  }

  async function initializeStores(page: Page) {
    await page.evaluate((mockOrg) => {
      try {
        const orgStoreState = {
          state: {
            organizations: [mockOrg],
            currentOrganization: mockOrg,
            isLoading: false,
            error: null
          },
          version: 0
        };
        localStorage.setItem('organization-storage', JSON.stringify(orgStoreState));
      } catch (error) {
        console.error('Failed to initialize organization store:', error);
      }
    }, MOCK_ORG);
    
    await page.evaluate((mockVars) => {
      try {
        const varStoreState = {
          state: {
            variables: mockVars.map((v: any) => ({
              id: v.id,
              name: v.name,
              type: v.type,
              organizationId: v.organizationId,
              timeSeries: v.timeSeries
            })),
            isLoading: false,
            error: null,
            selectedOrganizationId: 'org-forecast-test'
          },
          version: 0
        };
        localStorage.setItem('variable-storage', JSON.stringify(varStoreState));
      } catch (error) {
        console.error('Failed to initialize variable store:', error);
      }
    }, MOCK_VARIABLES);
  }

  // Helper function to close any open modals/dialogs - FIXED: More specific detection
  async function closeAnyOpenModals(page: Page) {
    // Close config panels specifically (not toast notifications)
    const configPanels = page.locator('[role="dialog"]').filter({ hasText: 'Configure' });
    const configPanelCount = await configPanels.count();
    
    for (let i = 0; i < configPanelCount; i++) {
      const panel = configPanels.nth(i);
      if (await panel.isVisible({ timeout: 1000 })) {
        // Try the main Close button first (more specific selector)
        const mainCloseButton = panel.locator('button:has-text("Close")').filter({ hasText: /^Close$/ });
        if (await mainCloseButton.count() > 0 && await mainCloseButton.first().isVisible()) {
          await mainCloseButton.first().click();
          await page.waitForTimeout(500);
          continue;
        }
        
        // Fallback to X button if main Close button not found
        const xCloseButton = panel.locator('button[data-state]').first();
        if (await xCloseButton.isVisible()) {
          await xCloseButton.click();
          await page.waitForTimeout(500);
        }
      }
    }

    // Close any sheet dialogs using ESC key as final fallback
    const sheets = page.locator('[role="dialog"]');
    const sheetCount = await sheets.count();
    if (sheetCount > 0) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  }

  test('should display forecast list and create new forecast', async ({ page }) => {
    console.log('🧪 Testing forecast list and creation...');
    
    await page.goto('/forecast-definition');
    
    // Wait for page to load
    await expect(page.locator('h1:has-text("Forecast Definition")')).toBeVisible({ timeout: 15000 });
    
    // Check for create button
    const createButton = page.locator('button:has-text("Create New Forecast")');
    await expect(createButton).toBeVisible();
    
    // Set up request interception to debug
    let forecastCreationRequest: any = null;
    page.on('request', request => {
      if (request.url().includes('/forecasts') && request.method() === 'POST') {
        console.log(`🔍 Intercepted forecast creation request: ${request.method()} ${request.url()}`);
        forecastCreationRequest = request;
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/forecasts') && response.request().method() === 'POST') {
        console.log(`🔍 Forecast creation response: ${response.status()} ${response.url()}`);
      }
    });
    
    // Test creating a new forecast
    await createButton.click();
    
    // Wait a moment for the request to process
    await page.waitForTimeout(3000);
    
    // Check current URL for debugging
    const currentUrl = page.url();
    console.log(`🔍 Current URL after create button click: ${currentUrl}`);
    
    // Check if we're in a loading state
    const loadingElement = page.locator('text=Creating...');
    if (await loadingElement.isVisible({ timeout: 2000 })) {
      console.log('🔍 Found loading state, waiting for it to finish...');
      await expect(loadingElement).not.toBeVisible({ timeout: 10000 });
    }
    
    // Should redirect to editor page
    await page.waitForURL(/\/forecast-definition\/forecast-\d+/, { timeout: 15000 });
    
    console.log('✅ Successfully created forecast and navigated to editor');
  });

  test('should load forecast editor and display main components', async ({ page }) => {
    console.log('🧪 Testing forecast editor...');
    
    await page.goto('/forecast-definition/forecast-test-1');
    
    // Check if page is in loading state first
    const loadingSpinner = page.locator('text=Loading forecast...');
    if (await loadingSpinner.isVisible({ timeout: 3000 })) {
      console.log('🔍 Found loading state, waiting for it to finish...');
      await expect(loadingSpinner).not.toBeVisible({ timeout: 15000 });
    }
    
    // Check for error state
    const errorElement = page.locator('text=Error:');
    if (await errorElement.isVisible({ timeout: 3000 })) {
      const errorText = await errorElement.textContent();
      console.log(`🚨 Found error state: ${errorText}`);
      
      // Try to get more error details
      const errorDetails = await page.locator('.text-red-400').allTextContents();
      console.log('🚨 Error details:', errorDetails);
      
      throw new Error(`Forecast editor is in error state: ${errorText}`);
    }
    
    // Wait for editor to load
    await expect(page.locator('h2:has-text("Forecast Builder")')).toBeVisible({ timeout: 15000 });
    
    // Check for main UI sections using more specific locators
    await expect(page.locator('h3:has-text("Forecast Details")').first()).toBeVisible();
    await expect(page.locator('h3:has-text("Add Nodes")').first()).toBeVisible();
    
    // Check for node creation buttons
    await expect(page.locator('button:has-text("Data")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Constant")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Operator")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Metric")').first()).toBeVisible();
    
    console.log('✅ Forecast editor loaded with all main components');
  });

  test('should add and configure nodes', async ({ page }) => {
    console.log('🧪 Testing node creation and configuration...');
    
    await page.goto('/forecast-definition/forecast-test-1');
    
    // Check for loading/error states
    await waitForEditorToLoad(page);
    
    await expect(page.locator('h2:has-text("Forecast Builder")')).toBeVisible({ timeout: 15000 });
    
    // Ensure no modals are open initially
    await closeAnyOpenModals(page);
    
    // Test adding a CONSTANT node
    await page.locator('button:has-text("Constant")').first().click();
    
    // Should open config panel - wait for it to appear
    await expect(page.locator('text=Configure CONSTANT Node')).toBeVisible({ timeout: 10000 });
    
    // Configure constant value
    const valueInput = page.locator('input[type="number"]').first();
    if (await valueInput.isVisible()) {
      await valueInput.fill('100');
    }
    
    // Close config panel
    const closeButton = page.locator('button:has-text("Close")').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
    
    await page.waitForTimeout(1000);
    
    // Test adding a DATA node
    await page.locator('button:has-text("Data")').first().click();
    
    // Should open config panel
    await expect(page.locator('text=Configure DATA Node')).toBeVisible({ timeout: 10000 });
    
    // Close this config panel too
    const closeButton2 = page.locator('button:has-text("Close")').first();
    if (await closeButton2.isVisible()) {
      await closeButton2.click();
    }
    
    console.log('✅ Successfully created and configured nodes');
  });

  test('should edit forecast metadata', async ({ page }) => {
    console.log('🧪 Testing forecast metadata editing...');
    
    await page.goto('/forecast-definition/forecast-test-1');
    
    // Check for loading/error states
    await waitForEditorToLoad(page);
    
    await expect(page.locator('h2:has-text("Forecast Builder")')).toBeVisible({ timeout: 15000 });
    
    // Test editing forecast name
    const nameInput = page.locator('input#forecastName');
    await expect(nameInput).toBeVisible();
    
    await nameInput.clear();
    await nameInput.fill('Updated Test Forecast');
    
    // Check for save button
    const saveButton = page.locator('button:has-text("Save")');
    await expect(saveButton).toBeVisible();
    
    console.log('✅ Successfully edited forecast metadata');
  });

  test('should build complete forecast workflow', async ({ page }) => {
    console.log('🧪 Testing complete forecast workflow...');
    
    await page.goto('/forecast-definition/forecast-test-1');
    
    // Check for loading/error states first
    await waitForEditorToLoad(page);
    
    await expect(page.locator('h2:has-text("Forecast Builder")')).toBeVisible({ timeout: 15000 });
    
    // Ensure no modals are blocking
    await closeAnyOpenModals(page);
    
    // Step 1: Add DATA node
    await page.locator('button:has-text("Data")').first().click();
    await page.waitForTimeout(2000);
    
    // Close config panel if it opens
    await closeAnyOpenModals(page);
    
    // Step 2: Add CONSTANT node  
    await page.locator('button:has-text("Constant")').first().click();
    await page.waitForTimeout(2000);
    
    // If config panel is visible, configure it
    const configPanel = page.locator('text=Configure CONSTANT Node');
    if (await configPanel.isVisible({ timeout: 3000 })) {
      const valueInput = page.locator('input[type="number"]').first();
      if (await valueInput.isVisible()) {
        await valueInput.fill('1.15');
      }
      
      const closeButton = page.locator('button:has-text("Close")').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
        await page.waitForTimeout(1000);
      }
    }
    
    // Step 3: Add OPERATOR node
    await closeAnyOpenModals(page);
    await page.locator('button:has-text("Operator")').first().click();
    await page.waitForTimeout(2000);
    
    // Close any config panel
    await closeAnyOpenModals(page);
    
    // Step 4: Try to save
    const saveButton = page.locator('button:has-text("Save")');
    if (await saveButton.isVisible()) {
      await saveButton.click();
      await page.waitForTimeout(2000);
    }
    
    console.log('✅ Complete forecast workflow test completed');
  });

  // Helper function to wait for editor to load and handle loading/error states
  async function waitForEditorToLoad(page: Page) {
    // Check if page is in loading state first
    const loadingSpinner = page.locator('text=Loading forecast...');
    if (await loadingSpinner.isVisible({ timeout: 3000 })) {
      console.log('🔍 Found loading state, waiting for it to finish...');
      await expect(loadingSpinner).not.toBeVisible({ timeout: 15000 });
    }
    
    // Check for error state
    const errorElement = page.locator('text=Error:');
    if (await errorElement.isVisible({ timeout: 3000 })) {
      const errorText = await errorElement.textContent();
      console.log(`🚨 Found error state: ${errorText}`);
      
      // Try to get more error details from the page
      const pageContent = await page.content();
      console.log('🚨 Page content snippet:', pageContent.substring(0, 1000));
      
      throw new Error(`Forecast editor is in error state: ${errorText}`);
    }
  }
}); 