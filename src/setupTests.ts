// Import jest-dom matchers
import '@testing-library/jest-dom';
import { Logger } from '@nestjs/common';

// src/setupTests.ts
// No need to import crypto or encoding polyfills - now handled by jest-globals-setup.js

const isVerboseSetup = process.env.TEST_SETUP_VERBOSE === 'true';

const setupLog = (...args: unknown[]) => {
  if (isVerboseSetup) {
    console.log(...args);
  }
};

const setupWarn = (...args: unknown[]) => {
  if (isVerboseSetup) {
    console.warn(...args);
  }
};

// Only try to import 'undici' if required and not running in Jest environment
// If fetch is already available globally, we don't need undici's fetch
if (typeof global.fetch === 'undefined') {
  try {
    // Import from undici conditionally  
    const { fetch, Request, Response, Headers, FormData } = require('undici');
    
    // Add to global scope
    global.fetch = fetch as any;
    global.Request = Request as any;
    global.Response = Response as any;
    global.Headers = Headers as any;
    global.FormData = FormData as any;
    
    setupLog('Polyfilled fetch APIs from undici');
  } catch (e) {
    // Create minimal fetch implementation if undici isn't available
    setupWarn('Unable to load undici, using minimal fetch polyfill');
    
    // Add absolutely minimal implementations to prevent errors
    // These won't actually work, but will prevent "not defined" errors
    
    // @ts-ignore
    global.fetch = async (url: string) => {
      setupWarn('Fetch polyfill called - not actually fetching', url);
      return {
        ok: false,
        status: 404,
        json: async () => ({}),
        text: async () => '',
      };
    };
    
    // @ts-ignore
    global.Request = class Request {};
    // @ts-ignore
    global.Response = class Response {};
    // @ts-ignore
    global.Headers = class Headers {};
    // @ts-ignore
    global.FormData = class FormData {};
  }
}

// If your test needs to import undici components directly, ensure they're mocked
jest.mock('undici', () => {
  // If real undici is available, use it, otherwise use a mock
  try {
    return jest.requireActual('undici');
  } catch (e) {
    return {
      fetch: global.fetch,
      Request: global.Request,
      Response: global.Response, 
      Headers: global.Headers,
      FormData: global.FormData,
    };
  }
}, { virtual: true });

// Note: If MSW still has issues, consider installing and configuring:
// npm install --save-dev web-streams-polyfill node-domexception

// If you are using Jest with JSDOM environment, you might not need all of these,
// but for Vitest's default Node.js environment, they are often necessary for MSW v2+. 

// Keep backend test output focused on assertion failures instead of framework logs.
if (process.env.TEST_SHOW_NEST_LOGS !== 'true') {
  Logger.overrideLogger(false);
  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'verbose').mockImplementation(() => undefined);
}

setupLog('Test setup complete');