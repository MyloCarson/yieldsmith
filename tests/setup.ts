/**
 * Jest Setup File
 * Runs before all tests
 */

// Mock environment variables for tests
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "error";
process.env.DEBUG = "false";

// Increase test timeout for API calls
jest.setTimeout(10000);

// Suppress console output in tests (except errors)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error,
};
