import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// WSL2-optimized configuration for stable test execution
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next'],
    
    // WSL2 optimized timeouts - increased for stability
    testTimeout: 60000,
    hookTimeout: 60000,
    teardownTimeout: 20000,
    
    // Memory and performance optimizations for WSL2
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,  // Sequential execution for stability
        isolate: true,
        minForks: 1,
        maxForks: 1
      }
    },
    
    // Strict sequential execution to prevent resource conflicts
    maxConcurrency: 1,
    
    // Enhanced reporting for debugging issues
    reporters: ['verbose'],
    
    // Coverage disabled for WSL2 performance
    coverage: {
      enabled: false
    },
    
    // Aggressive failure handling
    bail: 1,
    
    // Performance monitoring
    logHeapUsage: true,
    passWithNoTests: false,
    
    // WSL2-specific dependency optimizations
    deps: {
      inline: [
        // Inline problematic dependencies that cause timeouts
        '@tiptap/react',
        '@tiptap/starter-kit',
        '@tiptap/extension-document',
        '@tiptap/extension-heading',
        '@tiptap/extension-bold',
        '@tiptap/extension-italic',
        'docx',
        'mammoth',
        'diff',
        'react-markdown',
        '@testing-library/react',
        '@testing-library/user-event'
      ]
    },
    
    // Environment variables for WSL2 optimization
    env: {
      NODE_ENV: 'test',
      NODE_OPTIONS: '--max-old-space-size=4096 --no-warnings',
      WSL_DISTRO_NAME: process.env.WSL_DISTRO_NAME || 'Ubuntu',
      VITEST_SEGFAULT_RETRY: '3'
    },
    
    // Disable file watching for stability
    watch: false,
    
    // Mock management
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    
    // Retry configuration for flaky tests
    retry: 2,
    
    // Optimize for WSL2 file system
    cache: {
      dir: '../node_modules/.vitest-wsl'
    }
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@assets': path.resolve(__dirname, '../attached_assets'),
    },
  },
  
  // ESBuild optimizations for WSL2
  esbuild: {
    target: 'node18',
    platform: 'node',
    keepNames: true
  }
});