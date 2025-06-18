import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'coverage-optimized',
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/e2e/**',
      '**/__tests__/fixtures/**',
      '**/__tests__/mocks/**',
      '**/test-utils/**'
    ],
    
    // Coverage configuration
    coverage: {
      enabled: true,
      provider: 'v8',
      
      // Report formats
      reporter: [
        'text',
        'text-summary', 
        'json',
        'json-summary',
        'html',
        'lcov',
        'clover',
        'cobertura'
      ],
      
      // Output directory
      reportsDirectory: './coverage',
      
      // Files to include in coverage
      include: [
        'src/**/*.{js,jsx,ts,tsx}',
        '!src/**/*.d.ts',
        '!src/vite-env.d.ts'
      ],
      
      // Files to exclude from coverage
      exclude: [
        // Test files
        '**/*.{test,spec}.{js,jsx,ts,tsx}',
        '**/__tests__/**',
        '**/test/**',
        
        // Configuration files
        '**/vite.config.*',
        '**/vitest.config.*',
        '**/tailwind.config.*',
        '**/postcss.config.*',
        
        // Build and development files
        '**/dist/**',
        '**/build/**',
        '**/coverage/**',
        '**/node_modules/**',
        
        // Specific exclusions
        'src/main.tsx',              // Entry point
        'src/App.tsx',               // App component (mostly routing)
        'src/index.css',             // CSS files
        'src/test-setup.ts',         // Test setup
        
        // Type definitions and interfaces
        'src/types/**',
        'src/**/*.types.ts',
        
        // Mock files and test utilities
        'src/**/__mocks__/**',
        'src/test-utils/**',
        'src/mocks/**',
        
        // Storybook files (if any)
        'src/**/*.stories.{js,jsx,ts,tsx}',
        
        // Constants that don't need testing
        'src/constants/**',
        
        // Third-party integrations that are hard to test
        'src/lib/external/**'
      ],
      
      // Coverage thresholds
      thresholds: {
        global: {
          branches: 75,
          functions: 80,
          lines: 80,
          statements: 80
        },
        
        // Per-file thresholds for critical components
        'src/components/ResumePreview.tsx': {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90
        },
        
        'src/components/ContentPreview.tsx': {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90
        },
        
        'src/components/InteractiveResumeEditor.tsx': {
          branches: 80,
          functions: 85,
          lines: 85,
          statements: 85
        },
        
        'src/hooks/**': {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90
        },
        
        'src/utils/**': {
          branches: 90,
          functions: 95,
          lines: 95,
          statements: 95
        }
      },
      
      // Additional coverage options
      all: true,                    // Include all files, even untested ones
      clean: true,                  // Clean coverage directory before running
      skipFull: false,              // Don't skip files with 100% coverage
      perFile: true,                // Show per-file coverage
      watermarks: {
        statements: [75, 90],
        functions: [75, 90],
        branches: [70, 85],
        lines: [75, 90]
      }
    },
    
    // Test execution configuration
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    
    // Performance optimizations
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1
      }
    },
    
    // Globals for testing
    globals: true,
    
    // Watch configuration
    watch: false,
    
    // Reporter configuration
    reporter: ['verbose', 'json', 'html'],
    outputFile: {
      json: './coverage/test-results.json',
      html: './coverage/test-report.html'
    },
    
    // Inline dependencies that may cause issues
    deps: {
      inline: [
        '@tiptap/react',
        '@tiptap/starter-kit',
        'docx',
        'mammoth',
        'diff',
        'react-markdown'
      ]
    }
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/hooks': resolve(__dirname, './src/hooks'),
      '@/utils': resolve(__dirname, './src/utils'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/types': resolve(__dirname, './src/types'),
      '@/constants': resolve(__dirname, './src/constants')
    }
  },
  
  define: {
    'import.meta.vitest': undefined
  }
});