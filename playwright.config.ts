import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  timeout: 30_000,
  // bypassCSP: next dev's webpack devtool wraps modules in eval(), which the app's
  // strict CSP (script-src without 'unsafe-eval', see next.config.ts) blocks in a real
  // browser. That only breaks client-side module execution in dev mode (verified against
  // a production build, where the same page renders fine) — it blocks the streaming
  // reveal script that swaps in the not-found boundary's markup, but not the CSP header
  // itself, which raw `request.get()` calls (used by the headers test) still see untouched.
  use: { baseURL: 'http://localhost:8799', trace: 'retain-on-failure', bypassCSP: true },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8799',
    reuseExistingServer: false,
    timeout: 60_000,
    env: { BLOG_DATA_DIR: `${process.cwd()}/.e2e-data`, SITE_URL: 'http://localhost:8799' },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
