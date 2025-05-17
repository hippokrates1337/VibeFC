/** @type {import('jest').Config} */
const config = {
  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,

  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,

  // The directory where Jest should output its coverage files
  coverageDirectory: "coverage",

  // An array of regexp pattern strings used to skip coverage collection
  coveragePathIgnorePatterns: [
    "/node_modules/"
  ],

  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: "v8", // or "babel"

  // A list of global variables that need to be available in all test environments
  globals: {
    // Note: TextEncoder and TextDecoder are now provided by globalSetup
    // but we'll keep them here for redundancy
    TextEncoder: require('util').TextEncoder,
    TextDecoder: require('util').TextDecoder,
  },

  // The global setup, which runs before any test environment is created or any module imported
  globalSetup: '<rootDir>/jest-globals-setup.js',

  // A list of reporter names that Jest uses when writing coverage reports
  coverageReporters: [
    "json",
    "text",
    "lcov",
    "clover"
  ],

  // The test environment that will be used for testing
  // Use 'jsdom' for tests involving DOM APIs (like React Testing Library)
  // Use 'node' for backend/Node.js tests
  testEnvironment: "jsdom", // Assuming frontend tests based on dependencies, adjust if needed
  testEnvironmentOptions: {
    /**
     * @note Handle `TextEncoder` and `TextDecoder` polyfills required by `undici`
     * @see https://github.com/nodejs/undici/issues/2044
     */
    customExportConditions: ['node', 'node-addons'], // Added to help jsdom resolve Node modules
    url: "http://localhost", // Add base URL for the test environment
  },

  // The glob patterns Jest uses to detect test files
  testMatch: [
    "**/__tests__/**/*.[jt]s?(x)",
    "**/?(*.)+(spec|test).[tj]s?(x)"
  ],

  // A list of paths to modules that run some code to configure or set up the testing environment
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],

  // Module name mapper for handling CSS Modules, assets, etc.
  moduleNameMapper: {
    // Handle CSS imports (if using CSS modules)
    "\\.(css|less|sass|scss)$": "identity-obj-proxy",
    // Handle image imports
    // https://jestjs.io/docs/webpack#handling-static-assets
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$/': '<rootDir>/__mocks__/fileMock.js',
    // Handle path aliases from tsconfig.json
    "^@/(.*)$": "<rootDir>/src/$1"
  },

  // If using TypeScript, you might need ts-jest or babel-jest configured
  transform: {
    // Use babel-jest to transpile tests with our custom babel config
    // This ensures private methods and properties are properly handled
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { 
      configFile: './babel.config.js'
    }],
  },

  // An array of regexp pattern strings that are matched against all source file paths before transformation.
  // If the file path matches any of the patterns, it will not be transformed.
  transformIgnorePatterns: [
    // Allow transformations for all files outside node_modules
    // and specific ones inside node_modules like undici and msw
    '/node_modules/(?!(undici|msw|@mswjs)/).+\\.[jt]sx?$',
    // If you have CSS modules handled by identity-obj-proxy, ensure they are ignored here too:
    // '\\.module\\.(css|sass|scss)$',
  ],
  // Since babel-jest is in devDependencies, Jest might pick it up automatically
  // If you have specific Babel config (.babelrc, babel.config.js), ensure it's compatible with Jest
};

module.exports = config; 