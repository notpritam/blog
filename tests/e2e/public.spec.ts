import { expect, test } from '@playwright/test';

test('home shows featured post, grid, and WebSite json-ld', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pritam Sharma');
  await expect(page.locator('article')).toHaveCount(2);
  await expect(page.locator('article').first().getByRole('link', { name: 'Second post' })).toBeVisible();
  const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(ld).toContain('"@type":"WebSite"');
  await expect(page.locator('html')).toHaveAttribute('data-theme', /light|dark/);
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

test('drafts are hidden and unknown slugs 404', async ({ page }) => {
  expect((await page.goto('/hidden-draft'))?.status()).toBe(404);
  expect((await page.goto('/nope-nope'))?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('isn’t here');
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
