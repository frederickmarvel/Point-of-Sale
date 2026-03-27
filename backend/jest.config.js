/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { 
      tsconfig: {
        strict: true,
        esModuleInterop: true,
        types: ['jest', 'node'],
      }
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)',
  ],
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts'],
  coverageDirectory: 'coverage',
  testTimeout: 30000,
};
