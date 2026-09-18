import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:8799', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8799',
    reuseExistingServer: false,
    timeout: 60_000,
    env: { BLOG_DATA_DIR: `${process.cwd()}/.e2e-data`, SITE_URL: 'http://localhost:8799' },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
