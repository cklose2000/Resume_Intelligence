import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-junit.xml' }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.WSL_DISTRO_NAME 
      ? 'http://localhost:5173' 
      : 'http://localhost:5173',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',

    /* Timeout for actions */
    actionTimeout: 30000,

    /* Timeout for navigation */
    navigationTimeout: 60000,

    /* Visual comparison settings */
    expect: {
      // Global threshold for all visual comparisons
      threshold: 0.2,
      // Time to wait for screenshot comparison
      timeout: 10000
    }
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium-visual',
      testMatch: '**/visual-regression.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        // Optimized for visual testing
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--font-render-hinting=none', // Consistent font rendering
            '--disable-font-subpixel-positioning',
            '--disable-lcd-text'
          ]
        },
        // Stable viewport for visual tests
        viewport: { width: 1280, height: 720 },
        // Disable animations for consistent screenshots
        reducedMotion: 'reduce'
      },
    },
    {
      name: 'chromium',
      testIgnore: '**/visual-regression.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        // Better performance in WSL2
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        }
      },
    },

    {
      name: 'firefox',
      testIgnore: '**/visual-regression.spec.ts',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      testIgnore: '**/visual-regression.spec.ts',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      testIgnore: '**/visual-regression.spec.ts',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      testIgnore: '**/visual-regression.spec.ts',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      NODE_ENV: 'test'
    }
  },

  /* Global test timeout */
  timeout: 60000,

  /* Test output directory */
  outputDir: 'test-results/',

  /* Global setup and teardown */
  globalSetup: require.resolve('./e2e/global-setup.ts'),
  globalTeardown: require.resolve('./e2e/global-teardown.ts'),

  /* Expect options for visual comparisons */
  expect: {
    // Screenshot comparison settings
    toHaveScreenshot: {
      threshold: 0.2,
      mode: 'non-zero-diff'
    },
    toMatchSnapshot: {
      threshold: 0.1
    }
  }
});