/**
 * Run under several time zones; the engine must give identical results in each:
 *   TZ=UTC npx jest -c packages/forecast-engine/jest.config.js
 *   TZ=Europe/Berlin npx jest -c packages/forecast-engine/jest.config.js
 * (time-zone.test.ts also switches process.env.TZ itself.)
 */
/** @type {import('jest').Config} */
module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
};
