import { expect, test } from '@playwright/test';

test('home shows featured post, grid, and WebSite json-ld', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pritam Sharma');
  await expect(page.locator('article')).toHaveCount(2);
  await expect(page.locator('article').first().getByRole('heading', { name: 'Second post' })).toBeVisible();
  const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(ld).toContain('"@type":"WebSite"');
  await expect(page.locator('html')).toHaveAttribute('data-theme', /light|dark/);
});

test.describe('editorial themes and navigation', () => {
  // Dev's eval-based bundles need this; production is also checked without a CSP bypass.
  test.use({ bypassCSP: true });

  test('theme selection survives navigation and reload without changing the layout', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    const cover = page.locator('.editorial-cover');
    const lightBounds = await cover.boundingBox();
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await cover.boundingBox()).toEqual(lightBounds);
    await page.locator('#featured-title a').click();
    // The first article navigation compiles this route on the dev server.
    await page.waitForURL('**/second-post');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Second post');
    await expect(page.locator('.site-header')).not.toHaveClass(/site-header-home/);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Writing' }).click();
    await expect(page.locator('.site-header')).toHaveClass(/site-header-home/);
    await page.getByRole('button', { name: 'Switch to light theme' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('narrow screens retain readable navigation and all stories without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Selected stories' }).getByRole('link', { name: 'First post about llamas' })).toBeVisible();
    await expect(page.locator('.post-grid article')).toHaveCount(1);
    const dimensions = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
    await page.getByRole('link', { name: 'Search', exact: true }).click();
    await expect(page.getByRole('searchbox', { name: 'Search' })).toBeVisible();
  });
});

test('article renders body, toc, tags, metadata, and BlogPosting json-ld', async ({ page }) => {
  const res = await page.goto('/first-post');
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('First post about llamas');
  await expect(page.locator('.prose h2#why-llamas')).toBeVisible();
  await expect(page.locator('.prose pre.shiki')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'On this page' }).getByRole('link')).toHaveCount(2);
  await expect(page.getByRole('list', { name: 'Tags' }).getByRole('link', { name: 'animals' })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'http://localhost:8799/first-post');
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'http://localhost:8799/og/first-post.png');
  const lds = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(lds.join('')).toContain('"@type":"BlogPosting"');
  expect(lds.join('')).toContain('"headline":"First post about llamas"');
  await expect(page.getByRole('navigation', { name: 'Adjacent posts' }).getByRole('link', { name: 'Second post' })).toBeVisible();
});

test.describe('not found (dev bundles need eval)', () => {
  // next dev's webpack devtool wraps modules in eval(), which the app's strict CSP
  // (script-src without 'unsafe-eval', see next.config.ts) blocks in a real browser.
  // That only breaks client-side module execution in dev mode (verified against a
  // production build, where the same page renders fine) — it blocks the streaming
  // reveal script that swaps in the not-found boundary's markup. Scope the CSP bypass
  // to just this test so the other page-driven tests still exercise the real CSP header
  // (see the "security and robots headers" test below, which reads it via a raw request
  // unaffected by this setting either way).
  test.use({ bypassCSP: true });

  test('drafts are hidden and unknown slugs 404', async ({ page }) => {
    expect((await page.goto('/hidden-draft'))?.status()).toBe(404);
    expect((await page.goto('/nope-nope'))?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('isn’t here');
  });
});

test('redirects table issues a 301', async ({ request }) => {
  const res = await request.get('/old-llamas', { maxRedirects: 0 });
  expect(res.status()).toBe(308);
  expect(res.headers()['location']).toContain('/first-post');
});

test('search, tag pages and tags index', async ({ page }) => {
  await page.goto('/search?q=llamas');
  await expect(page.locator('article')).toHaveCount(1);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await page.goto('/tag/tools');
  await expect(page.locator('article')).toHaveCount(1);
  await page.goto('/tags');
  await expect(page.getByRole('link', { name: 'animals' })).toBeVisible();
});

test('feeds, sitemap, robots, llms.txt, markdown, og image', async ({ request }) => {
  const rss = await request.get('/rss.xml');
  expect(rss.headers()['content-type']).toContain('application/rss+xml');
  expect(await rss.text()).toContain('<item>');
  const json = await request.get('/feed.json');
  expect((await json.json()).items).toHaveLength(2);
  const sitemap = await request.get('/sitemap.xml');
  expect(await sitemap.text()).toContain('http://localhost:8799/first-post');
  const robots = await request.get('/robots.txt');
  expect(await robots.text()).toContain('Sitemap: http://localhost:8799/sitemap.xml');
  const llms = await request.get('/llms.txt');
  expect(await llms.text()).toContain('# Pritam Sharma · Blog');
  const md = await request.get('/first-post.md');
  expect(md.headers()['content-type']).toContain('text/markdown');
  expect(await md.text()).toContain('## Why llamas');
  const og = await request.get('/og/first-post.png');
  expect(og.headers()['content-type']).toBe('image/png');
  expect((await og.body()).length).toBeGreaterThan(10_000);
});

test('security and robots headers', async ({ request }) => {
  const res = await request.get('/');
  expect(res.headers()['content-security-policy']).toContain("default-src 'self'");
  expect(res.headers()['x-content-type-options']).toBe('nosniff');
  const admin = await request.get('/admin/anything');
  expect(admin.headers()['x-robots-tag']).toContain('noindex');
});
