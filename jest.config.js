export default {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.types.ts",
    "!src/index.ts",
    "!src/**/index.ts"
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  coverageReporters: ["text", "text-summary", "html", "lcov"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@core/(.*)$": "<rootDir>/src/core/$1",
    "^@types/(.*)$": "<rootDir>/src/types/$1",
    "^@markets/(.*)$": "<rootDir>/src/markets/$1",
    "^@data/(.*)$": "<rootDir>/src/data/$1",
    "^@criteria/(.*)$": "<rootDir>/src/criteria/$1",
    "^@strategies/(.*)$": "<rootDir>/src/strategies/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
    "^@ai/(.*)$": "<rootDir>/src/ai/$1",
    "^@notifications/(.*)$": "<rootDir>/src/notifications/$1",
    "^@utils/(.*)$": "<rootDir>/src/utils/$1",
    "^@config/(.*)$": "<rootDir>/config/$1"
  },
  globals: {
    "ts-jest": {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }
  },
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  testTimeout: 10000,
  verbose: true
};
