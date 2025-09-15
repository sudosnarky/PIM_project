/**
 * Environment configuration for E2E tests
 * Contains test environment variables and settings
 */

export const testConfig = {
  // Base URL for the application
  baseUrl: process.env.BASE_URL || 'http://localhost:8000',
  
  // Test database configuration
  database: {
    testDbPath: process.env.TEST_DB_PATH || './test_pim.db',
    resetBeforeTests: process.env.RESET_DB !== 'false'
  },
  
  // Default test credentials
  defaultUser: {
    username: process.env.TEST_USERNAME || 'testuser',
    password: process.env.TEST_PASSWORD || 'testpass123'
  },
  
  // Test timeouts
  timeouts: {
    short: 5000,
    medium: 10000, 
    long: 30000,
    veryLong: 60000
  },
  
  // Test data settings
  testData: {
    maxNotesPerTest: 10,
    cleanupAfterTests: process.env.CLEANUP_TEST_DATA !== 'false',
    useFixtures: process.env.USE_FIXTURES !== 'false'
  },
  
  // Browser settings
  browser: {
    headless: process.env.HEADLESS !== 'false',
    slowMo: parseInt(process.env.SLOW_MO) || 0,
    devtools: process.env.DEVTOOLS === 'true'
  },
  
  // Test execution settings
  execution: {
    parallel: process.env.PARALLEL_TESTS !== 'false',
    retries: parseInt(process.env.TEST_RETRIES) || 2,
    timeout: parseInt(process.env.TEST_TIMEOUT) || 30000
  },
  
  // Logging and debugging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    captureScreenshots: process.env.CAPTURE_SCREENSHOTS !== 'false',
    captureVideo: process.env.CAPTURE_VIDEO !== 'false',
    captureTrace: process.env.CAPTURE_TRACE !== 'false'
  }
};