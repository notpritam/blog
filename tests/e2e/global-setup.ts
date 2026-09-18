import fs from 'node:fs';
import path from 'node:path';
import { openDb } from '../../lib/db/client';
import { posts, redirects } from '../../lib/db/schema';
import { upsertPost } from '../../lib/posts/write';

export default async function globalSetup() {
  const dir = path.join(process.cwd(), '.e2e-data');
  fs.rmSync(path.join(dir, 'uploads'), { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'uploads'), { recursive: true });
  process.env.BLOG_DATA_DIR = dir;
  const db = openDb(path.join(dir, 'blog.db'));
  // Playwright starts `webServer` (see playwright.config.ts) before running this
  // global setup, and the app's getDb() memoizes its sqlite connection on
  // globalThis on first request. So by the time we get here, the dev server's
  // readiness probe has already opened (and cached) a connection to this same
  // file. Deleting/recreating the file (the naive approach) would leave that
  // cached connection pointing at a deleted inode, invisible to every later
  // request. Instead, clear rows in place so writes land in the file the
  // running server already has open. `posts` cascades to post_tags/revisions.
  db.delete(posts).run();
  db.delete(redirects).run();
  await upsertPost(db, { slug: 'first-post', title: 'First post about llamas', subtitle: 'A subtitle', bodyMd: '## Why llamas\n\nLlamas are great.\n\n```ts\nconst x = 1\n```\n\n## Conclusion\n\nDone.', tags: ['animals'], status: 'published', publishedAt: '2026-01-01T00:00:00.000Z' });
  await upsertPost(db, { slug: 'second-post', title: 'Second post', bodyMd: 'Alpacas too.', tags: ['animals', 'tools'], status: 'published', publishedAt: '2026-02-01T00:00:00.000Z' });
  await upsertPost(db, { slug: 'hidden-draft', title: 'Hidden', bodyMd: 'secret llamas', status: 'draft' });
  db.insert(redirects).values({ fromPath: '/old-llamas', toPath: '/first-post', code: 301 }).run();
  db.$sqlite.close();
}
