/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/services/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};