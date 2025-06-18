import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up E2E test environment...');
  
  // Clean up any temporary files or test artifacts
  try {
    // Clear any test data from localStorage/sessionStorage
    // This will be handled by individual tests, but good to have as backup
    
    // Reset environment variables
    delete process.env.VITE_API_BASE_URL;
    
    console.log('✅ E2E environment cleanup complete');
  } catch (error) {
    console.error('⚠️ Cleanup warning:', error);
    // Don't fail the entire test run for cleanup issues
  }
}

export default globalTeardown;