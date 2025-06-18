import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config.ci';

// WSL-specific optimizations
export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    // Reduce concurrency for WSL file system performance
    maxConcurrency: 1,
    // Use forks with minimal parallelism
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        isolate: true,
        minForks: 1,
        maxForks: 1
      }
    },
    // Increase timeouts for slower WSL file operations
    testTimeout: 45000,
    hookTimeout: 45000,
    // Disable coverage during normal test runs
    coverage: {
      ...baseConfig.test?.coverage,
      enabled: false
    },
    // More aggressive failure handling
    bail: 1,
    // Reduce reporter output
    reporters: ['basic'],
    // Disable file watching
    watch: false,
    // Clear cache between runs
    clearMocks: true,
    restoreMocks: true,
    mockReset: true
  }
});