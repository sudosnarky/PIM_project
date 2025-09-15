/**
 * Global teardown for Playwright tests
 * Runs once after all test files
 */

async function globalTeardown() {
  console.log('🧽 Starting global teardown for PIM E2E tests...');
  
  // Clean up test data, close connections, etc.
  console.log('🧹 Cleaning up test artifacts...');
  
  console.log('✅ Global teardown completed successfully');
}

export default globalTeardown;