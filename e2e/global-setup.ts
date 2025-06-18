import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up E2E test environment...');
  
  // Set environment variables for testing
  process.env.NODE_ENV = 'test';
  process.env.VITE_API_BASE_URL = 'http://localhost:5173';
  
  // Ensure browsers are installed
  try {
    const browser = await chromium.launch({ headless: true });
    await browser.close();
    console.log('✅ Browser installation verified');
  } catch (error) {
    console.error('❌ Browser setup failed:', error);
    throw error;
  }
  
  // Wait for development server to be ready
  const maxRetries = 30;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const response = await fetch('http://localhost:5173', { 
        signal: AbortSignal.timeout(5000) 
      });
      if (response.ok) {
        console.log('✅ Development server is ready');
        break;
      }
    } catch (error) {
      retries++;
      if (retries === maxRetries) {
        console.error('❌ Development server failed to start');
        throw new Error('Development server not ready after 30 retries');
      }
      console.log(`⏳ Waiting for dev server... (${retries}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('✅ E2E environment setup complete');
}

export default globalSetup;