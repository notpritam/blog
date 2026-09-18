# Blog · Milestone 1 — Public site, Hashnode import, SEO surface — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A deployable, read-only blog at `blog.notpritam.in` that renders the four existing Hashnode posts in the blog.cloudflare.com look with complete SEO (metadata, JSON-LD, sitemap, feeds, OG images).

**Architecture:** One Next.js 15 App Router app. SQLite (better-sqlite3 + Drizzle) is the store; Markdown is the source of truth and rendered HTML/TOC/reading time are stored on write by a unified pipeline. All public routes are server components with `force-dynamic`; only theme toggle, TOC scroll-spy and copy buttons are client islands.

**Tech Stack:** Next.js 15.5.18, React 19.2, TypeScript 5.9, Tailwind 4.3 (tokens via CSS variables), better-sqlite3 13, drizzle-orm 0.45, unified/remark/rehype, @shikijs/rehype 4, next/font, next/og, sharp, vitest 5, Playwright 1.63.

**Spec:** `docs/superpowers/specs/2026-09-18-blog-platform-design.md` (sections 4, 5, 7, 10, 11 are implemented here; 6, 8, 9, 12 are later milestones).

## Global Constraints

- Work in `/home/pritam/personal/apps/blog`. Git identity is applied automatically (`notpritam <notpritamsharma@gmail.com>`); never set it per repo.
- Node is **24.20.0** at `/home/pritam/.nvm/versions/node/v24.20.0/bin`. The zsh nvm shim is broken in non-interactive shells, so every shell step starts with `export PATH=/home/pritam/.nvm/versions/node/v24.20.0/bin:$PATH`.
- Pin `next@15.5.18`, `react@19.2.6`, `react-dom@19.2.6`, `typescript@~5.9.3` (TypeScript 7 is not supported by Next 15).
- Ports: dev **8799**, prod **8798**. Nothing else.
- Data lives in `data/` (gitignored), overridable with `BLOG_DATA_DIR`. Tests use `:memory:` or a temp dir; never the real `data/`.
- `SITE_URL` defaults to `https://blog.notpritam.in`.
- Every public page: `export const dynamic = 'force-dynamic'`, no third-party scripts, semantic landmarks, `lang="en"`.
- Design tokens from spec §7: Inter Tight headings, Inter body 16/28, JetBrains Mono uppercase 12px dates (`letter-spacing: .3px`, `#707070`), `#111` headings, `#262626` body, dashed `1px #d4d4d4` hairlines, footer `#f6f6f7`, accent `#b64326`, page column 930px, article measure 715px, TOC rail 230px, header 72px.
- Commit at the end of every task with a conventional message; do not commit `data/`, `.env`, `node_modules`, `.next`.

## File map

```
package.json tsconfig.json next.config.ts postcss.config.mjs vitest.config.ts playwright.config.ts .gitignore .env.example README.md
app/layout.tsx                 fonts, theme init script, header/footer, root metadata
app/globals.css                tokens (light/dark), base, utilities (.page .eyebrow .dashed-*)
app/article.css                .prose typography, code, callouts, tables, figures
app/page.tsx                   home: hero + featured + grid + pagination
app/page/[n]/page.tsx          older pages
app/[slug]/page.tsx            article (+ redirect fallback)
app/tag/[tag]/page.tsx  app/tags/page.tsx  app/search/page.tsx  app/about/page.tsx  app/not-found.tsx
app/sitemap.ts app/robots.ts app/rss.xml/route.ts app/feed.json/route.ts app/llms.txt/route.ts
app/og/[slug]/route.tsx        1200×630 OG image per post (and `site`)
app/uploads/[...path]/route.ts serves data/uploads
components/site/{site-header,site-footer,theme-toggle,search-form}.tsx
components/posts/{post-date,author-chip,featured-post,post-card,post-grid,pagination}.tsx
components/article/{article-header,article-body,toc-nav,code-copy,share-row,prev-next,more-writing}.tsx
components/seo/json-ld.tsx
lib/db/{client,schema,migrate}.ts  lib/db/migrations/{index,0001_init}.ts
lib/markdown/{render,toc,callouts,images,reading-time,slugify}.ts
lib/posts/{types,queries,write}.ts
lib/media/store.ts
lib/seo/{jsonld,feeds,metadata}.ts
lib/settings.ts lib/format.ts
scripts/import-hashnode.ts scripts/hashnode.ts scripts/rerender.ts
tests/unit/*.test.ts tests/e2e/public.spec.ts tests/e2e/global-setup.ts
public/avatar.jpg
```

---

### Task 1: Scaffold the Next.js app

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `.gitignore`, `.env.example`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `tests/unit/smoke.test.ts`

**Interfaces:**
- Produces: the `@/*` path alias, `npm run dev|build|start|typecheck|test|verify`.

- [ ] **Step 1: Write package.json**

```json
{
  "name": "blog",
  "version": "0.1.0",
  "private": true,
  "engines": { "node": "24.x" },
  "scripts": {
    "dev": "next dev -p 8799",
    "build": "next build",
    "start": "next start -p 8798",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "import:hashnode": "tsx scripts/import-hashnode.ts",
    "rerender": "tsx scripts/rerender.ts",
    "verify": "npm run typecheck && npm test && npm run build && npm run test:e2e"
  },
  "dependencies": {
    "@fontsource/inter-tight": "^5.3.0",
    "@fontsource/jetbrains-mono": "^5.3.0",
    "@shikijs/rehype": "^4.4.3",
    "better-sqlite3": "^13.0.3",
    "drizzle-orm": "^0.45.2",
    "github-slugger": "^2.0.0",
    "hast-util-to-string": "^3.0.1",
    "mdast-util-to-string": "^4.0.0",
    "next": "15.5.18",
    "react": "19.2.6",
    "react-dom": "19.2.6",
    "rehype-autolink-headings": "^7.1.0",
    "rehype-raw": "^7.0.0",
    "rehype-slug": "^6.0.0",
    "rehype-stringify": "^10.0.1",
    "remark-gfm": "^4.0.1",
    "remark-parse": "^11.0.0",
    "remark-rehype": "^11.1.2",
    "sharp": "^0.35.4",
    "shiki": "^4.4.3",
    "unified": "^11.0.5",
    "unist-util-visit": "^5.1.0",
    "zod": "^4.6.5"
  },
  "devDependencies": {
    "@playwright/test": "^1.63.0",
    "@tailwindcss/postcss": "^4.3.3",
    "@types/better-sqlite3": "^9.6.0",
    "@types/node": "^24.0.0",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "postcss": "^8.5.28",
    "tailwindcss": "^4.3.3",
    "tsx": "^4.23.13",
    "typescript": "~5.9.3",
    "vitest": "^5.0.1"
  }
}
```

- [ ] **Step 2: Write tsconfig.json, next.config.ts, postcss.config.mjs, vitest.config.ts**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", ".next", "data", "playwright-report", "test-results"]
}
```

`next.config.ts`:
```ts
import type { NextConfig } from 'next';

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'shiki', '@shikijs/rehype'],
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [390, 640, 768, 1024, 1280, 1440, 1920],
    imageSizes: [28, 36, 64, 128, 256, 465, 715],
  },
  async headers() {
    return [
      {
        source: '/:prefix(admin|api|preview)/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

`postcss.config.mjs`:
```js
export default { plugins: { '@tailwindcss/postcss': {} } };
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
  resolve: { alias: { '@': new URL('.', import.meta.url).pathname } },
});
```

- [ ] **Step 3: Write .gitignore, .env.example, minimal app files**

`.gitignore`:
```
node_modules
.next
out
data
.e2e-data
.env
*.tsbuildinfo
next-env.d.ts
test-results
playwright-report
```

`.env.example`:
```
SITE_URL=https://blog.notpritam.in
# BLOG_DATA_DIR=/home/pritam/personal/apps/blog/data
```

`app/globals.css` (placeholder, replaced in Task 6):
```css
@import "tailwindcss";
```

`app/layout.tsx` (placeholder, replaced in Task 6):
```tsx
import './globals.css';
import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`app/page.tsx` (placeholder, replaced in Task 7):
```tsx
export default function Home() {
  return <main>Blog scaffold</main>;
}
```

`tests/unit/smoke.test.ts`:
```ts
import { it, expect } from 'vitest';

it('runs', () => {
  expect(1 + 1).toBe(2);
});
```

- [ ] **Step 4: Install and verify**

Run:
```bash
export PATH=/home/pritam/.nvm/versions/node/v24.20.0/bin:$PATH
cd /home/pritam/personal/apps/blog && npm install && npm run typecheck && npm test && npm run build
```
Expected: install succeeds (better-sqlite3 uses a prebuilt binary for Node 24; if it compiles from source that is also fine), typecheck clean, 1 test passes, build prints the route table with `/`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: scaffold Next.js 15 app with pinned toolchain"
```

---

### Task 2: Database — schema, migration, client

**Files:**
- Create: `lib/db/migrations/0001_init.ts`, `lib/db/migrations/index.ts`, `lib/db/migrate.ts`, `lib/db/schema.ts`, `lib/db/client.ts`
- Test: `tests/unit/db.test.ts`

**Interfaces:**
- Produces: `openDb(file: string): Db`, `getDb(): Db`, `dataDir(): string`, Drizzle tables `posts, postTags, revisions, comments, ideas, media, apiTokens, redirects, agentRuns, settings`, FTS table `posts_fts` kept in sync by triggers.

- [ ] **Step 1: Write the failing test**

`tests/unit/db.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { openDb } from '@/lib/db/client';
import { posts, postTags, settings } from '@/lib/db/schema';

describe('db', () => {
  it('migrates, inserts, and keeps the FTS index in sync', () => {
    const db = openDb(':memory:');
    const inserted = db
      .insert(posts)
      .values({ slug: 'hello-world', title: 'Hello world', bodyMd: 'Some searchable prose about llamas.' })
      .returning({ id: posts.id })
      .get();
    expect(inserted.id).toBe(1);
    db.insert(postTags).values({ postId: inserted.id, tag: 'intro' }).run();

    const hit = db.$sqlite
      .prepare('SELECT p.slug FROM posts_fts f JOIN posts p ON p.id = f.rowid WHERE posts_fts MATCH ?')
      .get('llamas') as { slug: string } | undefined;
    expect(hit?.slug).toBe('hello-world');

    db.update(posts).set({ bodyMd: 'Now about alpacas.' }).where(eq(posts.id, inserted.id)).run();
    const miss = db.$sqlite.prepare('SELECT count(*) AS n FROM posts_fts WHERE posts_fts MATCH ?').get('llamas') as { n: number };
    expect(miss.n).toBe(0);
    const hit2 = db.$sqlite.prepare('SELECT count(*) AS n FROM posts_fts WHERE posts_fts MATCH ?').get('alpacas') as { n: number };
    expect(hit2.n).toBe(1);
  });

  it('is idempotent across re-open of the same file', () => {
    const db = openDb(':memory:');
    const rows = db.$sqlite.prepare('SELECT name FROM _migrations').all() as { name: string }[];
    expect(rows.map((r) => r.name)).toEqual(['0001_init']);
    db.insert(settings).values({ key: 'site_title', value: 'X' }).run();
    expect(db.select().from(settings).all()).toEqual([{ key: 'site_title', value: 'X' }]);
    expect(db.$sqlite.pragma('foreign_keys', { simple: true })).toBe(1);
  });

  it('rejects an invalid status', () => {
    const db = openDb(':memory:');
    expect(() =>
      db.$sqlite.prepare("INSERT INTO posts (slug, title, status) VALUES ('a', 'A', 'bogus')").run(),
    ).toThrow(/CHECK constraint failed/);
    expect(db.$sqlite.prepare('SELECT 1').get()).toEqual({ '1': 1 });
    void sql;
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/db.test.ts`
Expected: FAIL — cannot resolve `@/lib/db/client`.

- [ ] **Step 3: Write the migration SQL**

`lib/db/migrations/0001_init.ts`:
```ts
export const name = '0001_init';
export const sql = `
CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  body_md TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL DEFAULT '',
  toc_json TEXT NOT NULL DEFAULT '[]',
  excerpt TEXT NOT NULL DEFAULT '',
  cover_path TEXT,
  cover_alt TEXT NOT NULL DEFAULT '',
  cover_width INTEGER,
  cover_height INTEGER,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','in_review','changes_requested','approved','published','archived')),
  reading_minutes INTEGER NOT NULL DEFAULT 1,
  word_count INTEGER NOT NULL DEFAULT 0,
  featured INTEGER NOT NULL DEFAULT 0,
  noindex INTEGER NOT NULL DEFAULT 0,
  seo_title TEXT,
  seo_description TEXT,
  canonical_url TEXT,
  created_by TEXT NOT NULL DEFAULT 'human',
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX posts_status_published_idx ON posts(status, published_at DESC);

CREATE TABLE post_tags (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (post_id, tag)
);
CREATE INDEX post_tags_tag_idx ON post_tags(tag);

CREATE TABLE revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  body_md TEXT NOT NULL,
  author TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX revisions_post_idx ON revisions(post_id, created_at DESC);

CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  revision_id INTEGER REFERENCES revisions(id) ON DELETE SET NULL,
  parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  anchor_quote TEXT,
  anchor_prefix TEXT,
  anchor_suffix TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  resolved_at TEXT,
  resolved_by TEXT
);
CREATE INDEX comments_post_idx ON comments(post_id, status);

CREATE TABLE ideas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  priority INTEGER NOT NULL DEFAULT 2 CHECK (priority IN (1,2,3)),
  status TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog','picked','drafted','dropped')),
  post_id INTEGER REFERENCES posts(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL UNIQUE,
  alt TEXT NOT NULL DEFAULT '',
  width INTEGER,
  height INTEGER,
  bytes INTEGER NOT NULL,
  mime TEXT NOT NULL,
  created_by TEXT NOT NULL DEFAULT 'human',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE api_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  hash TEXT NOT NULL UNIQUE,
  scopes TEXT NOT NULL DEFAULT 'read',
  last_used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  revoked_at TEXT
);

CREATE TABLE redirects (
  from_path TEXT PRIMARY KEY,
  to_path TEXT NOT NULL,
  code INTEGER NOT NULL DEFAULT 301 CHECK (code IN (301,302)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE agent_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER REFERENCES posts(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('send_to_claude','scheduled','publish_hook')),
  bb_thread_id TEXT,
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started','finished','failed')),
  summary TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  finished_at TEXT
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE VIRTUAL TABLE posts_fts USING fts5(
  title, subtitle, excerpt, body_md,
  content='posts', content_rowid='id', tokenize='porter unicode61'
);
CREATE TRIGGER posts_ai AFTER INSERT ON posts BEGIN
  INSERT INTO posts_fts(rowid, title, subtitle, excerpt, body_md)
  VALUES (new.id, new.title, new.subtitle, new.excerpt, new.body_md);
END;
CREATE TRIGGER posts_ad AFTER DELETE ON posts BEGIN
  INSERT INTO posts_fts(posts_fts, rowid, title, subtitle, excerpt, body_md)
  VALUES ('delete', old.id, old.title, old.subtitle, old.excerpt, old.body_md);
END;
CREATE TRIGGER posts_au AFTER UPDATE ON posts BEGIN
  INSERT INTO posts_fts(posts_fts, rowid, title, subtitle, excerpt, body_md)
  VALUES ('delete', old.id, old.title, old.subtitle, old.excerpt, old.body_md);
  INSERT INTO posts_fts(rowid, title, subtitle, excerpt, body_md)
  VALUES (new.id, new.title, new.subtitle, new.excerpt, new.body_md);
END;
`;
```

`lib/db/migrations/index.ts`:
```ts
import * as m0001 from './0001_init';

export const migrations: { name: string; sql: string }[] = [m0001];
```

- [ ] **Step 4: Write the migrator, schema, and client**

`lib/db/migrate.ts`:
```ts
import type Database from 'better-sqlite3';
import { migrations } from './migrations';

export function migrate(sqlite: Database.Database): string[] {
  sqlite.exec('CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
  const applied = new Set(
    (sqlite.prepare('SELECT name FROM _migrations').all() as { name: string }[]).map((r) => r.name),
  );
  const ran: string[] = [];
  const insert = sqlite.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)');
  for (const m of migrations) {
    if (applied.has(m.name)) continue;
    sqlite.transaction(() => {
      sqlite.exec(m.sql);
      insert.run(m.name, new Date().toISOString());
    })();
    ran.push(m.name);
  }
  return ran;
}
```

`lib/db/schema.ts`:
```ts
import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const POST_STATUSES = ['draft', 'in_review', 'changes_requested', 'approved', 'published', 'archived'] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const posts = sqliteTable(
  'posts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    subtitle: text('subtitle').notNull().default(''),
    bodyMd: text('body_md').notNull().default(''),
    bodyHtml: text('body_html').notNull().default(''),
    tocJson: text('toc_json').notNull().default('[]'),
    excerpt: text('excerpt').notNull().default(''),
    coverPath: text('cover_path'),
    coverAlt: text('cover_alt').notNull().default(''),
    coverWidth: integer('cover_width'),
    coverHeight: integer('cover_height'),
    status: text('status', { enum: POST_STATUSES }).notNull().default('draft'),
    readingMinutes: integer('reading_minutes').notNull().default(1),
    wordCount: integer('word_count').notNull().default(0),
    featured: integer('featured', { mode: 'boolean' }).notNull().default(false),
    noindex: integer('noindex', { mode: 'boolean' }).notNull().default(false),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    canonicalUrl: text('canonical_url'),
    createdBy: text('created_by').notNull().default('human'),
    publishedAt: text('published_at'),
    createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  },
  (t) => [index('posts_status_published_idx').on(t.status, t.publishedAt)],
);

export const postTags = sqliteTable(
  'post_tags',
  {
    postId: integer('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
    tag: text('tag').notNull(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tag] }), index('post_tags_tag_idx').on(t.tag)],
);

export const revisions = sqliteTable('revisions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  subtitle: text('subtitle').notNull().default(''),
  excerpt: text('excerpt').notNull().default(''),
  bodyMd: text('body_md').notNull(),
  author: text('author').notNull(),
  note: text('note').notNull().default(''),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const comments = sqliteTable('comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  revisionId: integer('revision_id').references(() => revisions.id, { onDelete: 'set null' }),
  parentId: integer('parent_id'),
  author: text('author').notNull(),
  body: text('body').notNull(),
  anchorQuote: text('anchor_quote'),
  anchorPrefix: text('anchor_prefix'),
  anchorSuffix: text('anchor_suffix'),
  status: text('status', { enum: ['open', 'resolved'] }).notNull().default('open'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  resolvedAt: text('resolved_at'),
  resolvedBy: text('resolved_by'),
});

export const ideas = sqliteTable('ideas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  notes: text('notes').notNull().default(''),
  priority: integer('priority').notNull().default(2),
  status: text('status', { enum: ['backlog', 'picked', 'drafted', 'dropped'] }).notNull().default('backlog'),
  postId: integer('post_id').references(() => posts.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const media = sqliteTable('media', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  path: text('path').notNull().unique(),
  alt: text('alt').notNull().default(''),
  width: integer('width'),
  height: integer('height'),
  bytes: integer('bytes').notNull(),
  mime: text('mime').notNull(),
  createdBy: text('created_by').notNull().default('human'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const apiTokens = sqliteTable('api_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  hash: text('hash').notNull().unique(),
  scopes: text('scopes').notNull().default('read'),
  lastUsedAt: text('last_used_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  revokedAt: text('revoked_at'),
});

export const redirects = sqliteTable('redirects', {
  fromPath: text('from_path').primaryKey(),
  toPath: text('to_path').notNull(),
  code: integer('code').notNull().default(301),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const agentRuns = sqliteTable('agent_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id').references(() => posts.id, { onDelete: 'set null' }),
  kind: text('kind', { enum: ['send_to_claude', 'scheduled', 'publish_hook'] }).notNull(),
  bbThreadId: text('bb_thread_id'),
  status: text('status', { enum: ['started', 'finished', 'failed'] }).notNull().default('started'),
  summary: text('summary').notNull().default(''),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  finishedAt: text('finished_at'),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
```

`lib/db/client.ts`:
```ts
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from './migrate';
import * as schema from './schema';

export type Db = BetterSQLite3Database<typeof schema> & { $sqlite: Database.Database };

export function dataDir(): string {
  return process.env.BLOG_DATA_DIR ?? path.join(process.cwd(), 'data');
}

export function uploadsDir(): string {
  return path.join(dataDir(), 'uploads');
}

export function openDb(file: string): Db {
  const sqlite = new Database(file);
  if (file !== ':memory:') sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');
  migrate(sqlite);
  const db = drizzle(sqlite, { schema }) as Db;
  db.$sqlite = sqlite;
  return db;
}

const g = globalThis as unknown as { __blogDb?: Db };

export function getDb(): Db {
  if (!g.__blogDb) {
    fs.mkdirSync(uploadsDir(), { recursive: true });
    g.__blogDb = openDb(path.join(dataDir(), 'blog.db'));
  }
  return g.__blogDb;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/unit/db.test.ts`
Expected: 3 passed.

- [ ] **Step 6: Typecheck and commit**

```bash
npm run typecheck && git add -A && git commit -m "feat(db): sqlite schema, migrator, fts5 index, client"
```

---

### Task 3: Markdown pipeline

**Files:**
- Create: `lib/markdown/slugify.ts`, `lib/markdown/reading-time.ts`, `lib/markdown/callouts.ts`, `lib/markdown/toc.ts`, `lib/markdown/images.ts`, `lib/markdown/render.ts`
- Test: `tests/unit/markdown.test.ts`

**Interfaces:**
- Produces: `renderMarkdown(md: string): Promise<Rendered>` where `Rendered = { html: string; toc: TocItem[]; wordCount: number; readingMinutes: number; excerpt: string; firstImage: string | null }`, `TocItem = { depth: 2 | 3; id: string; text: string }`, `slugify(input: string, maxLength?: number): string`, `countWords(text): number`, `readingMinutes(words): number`.

- [ ] **Step 1: Write the failing tests**

`tests/unit/markdown.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '@/lib/markdown/render';
import { slugify } from '@/lib/markdown/slugify';
import { countWords, readingMinutes } from '@/lib/markdown/reading-time';

describe('slugify', () => {
  it('lowercases, hyphenates and trims', () => {
    expect(slugify("  I got tired of Claude's ASCII diagrams. So I built claude-canvas!  ")).toBe(
      'i-got-tired-of-claudes-ascii-diagrams-so-i-built-claude-canvas',
    );
  });
  it('cuts at a word boundary under maxLength', () => {
    expect(slugify('alpha beta gamma delta', 12)).toBe('alpha-beta');
  });
});

describe('reading time', () => {
  it('counts words and rounds minutes with a floor of 1', () => {
    expect(countWords("It's a 3-word sentence, isn't it?")).toBe(6);
    expect(readingMinutes(10)).toBe(1);
    expect(readingMinutes(460)).toBe(2);
    expect(readingMinutes(1265)).toBe(6);
  });
});

describe('renderMarkdown', () => {
  it('slugs headings and collects a toc of h2/h3 only', async () => {
    const r = await renderMarkdown('# Title\n\n## Getting started\n\ntext\n\n### Sub step\n\n#### Deep\n\n## Wrap up');
    expect(r.toc).toEqual([
      { depth: 2, id: 'getting-started', text: 'Getting started' },
      { depth: 3, id: 'sub-step', text: 'Sub step' },
      { depth: 2, id: 'wrap-up', text: 'Wrap up' },
    ]);
    expect(r.html).toContain('<h2 id="getting-started">');
    expect(r.html).toContain('class="heading-anchor"');
  });

  it('renders gfm tables, strikethrough and footnotes', async () => {
    const r = await renderMarkdown('| a | b |\n|---|---|\n| 1 | 2 |\n\n~~gone~~ text[^1]\n\n[^1]: The note.');
    expect(r.html).toContain('<table>');
    expect(r.html).toContain('<del>gone</del>');
    expect(r.html).toContain('data-footnotes');
  });

  it('highlights code with dual themes and survives unknown languages', async () => {
    const r = await renderMarkdown('```ts\nconst a = 1\n```\n\n```whatever\nplain\n```');
    expect(r.html).toContain('class="shiki');
    expect(r.html).toContain('--shiki-dark');
    expect(r.html).toContain('<pre');
    expect(r.html).toContain('plain');
  });

  it('turns [!NOTE] blockquotes into callouts', async () => {
    const r = await renderMarkdown('> [!WARNING]\n> Mind the gap.\n\n> plain quote');
    expect(r.html).toContain('<aside class="callout callout-warning" data-kind="warning">');
    expect(r.html).toContain('<p class="callout-title">Warning</p>');
    expect(r.html).toContain('Mind the gap.');
    expect(r.html).toContain('<blockquote>');
  });

  it('keeps raw html', async () => {
    const r = await renderMarkdown('<div align="center">hi</div>');
    expect(r.html).toContain('<div align="center">hi</div>');
  });

  it('wraps standalone images in figures, lazy-loads them, captions from title', async () => {
    const r = await renderMarkdown('![Alt text](/uploads/a.png "A caption")\n\nInline ![i](/x.png) here');
    expect(r.html).toContain('<figure><img src="/uploads/a.png" alt="Alt text" loading="lazy" decoding="async"><figcaption>A caption</figcaption></figure>');
    expect(r.html).toContain('<p>Inline <img src="/x.png" alt="i" loading="lazy" decoding="async"> here</p>');
    expect(r.firstImage).toBe('/uploads/a.png');
  });

  it('computes words, reading time and excerpt from the first paragraph', async () => {
    const words = Array.from({ length: 460 }, (_, i) => `w${i}`).join(' ');
    const r = await renderMarkdown(`## Heading\n\nFirst paragraph here.\n\n${words}`);
    expect(r.wordCount).toBe(464);
    expect(r.readingMinutes).toBe(2);
    expect(r.excerpt).toBe('First paragraph here.');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/markdown.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the helpers**

`lib/markdown/slugify.ts`:
```ts
import GithubSlugger from 'github-slugger';

export function slugify(input: string, maxLength = 80): string {
  const s = new GithubSlugger().slug(input.trim()).replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (s.length <= maxLength) return s;
  return s.slice(0, maxLength).replace(/-[^-]*$/, '');
}
```

`lib/markdown/reading-time.ts`:
```ts
export const WORDS_PER_MINUTE = 230;

export function countWords(text: string): number {
  return (text.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) ?? []).length;
}

export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
```

`lib/markdown/callouts.ts`:
```ts
import type { Blockquote, Paragraph, Root } from 'mdast';
import { visit } from 'unist-util-visit';

const RE = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*(?:\r?\n|$)/i;

/** GitHub-style `> [!NOTE]` blockquotes become `<aside class="callout callout-note">`. */
export function remarkCallouts() {
  return (tree: Root) => {
    visit(tree, 'blockquote', (node: Blockquote) => {
      const first = node.children[0];
      if (!first || first.type !== 'paragraph') return;
      const text = first.children[0];
      if (!text || text.type !== 'text') return;
      const m = RE.exec(text.value);
      if (!m) return;
      const kind = m[1].toLowerCase();
      text.value = text.value.slice(m[0].length);
      if (text.value === '') first.children.shift();
      if (first.children.length === 0) node.children.shift();
      node.data = {
        ...node.data,
        hName: 'aside',
        hProperties: { className: ['callout', `callout-${kind}`], 'data-kind': kind },
      };
      const title: Paragraph = {
        type: 'paragraph',
        data: { hName: 'p', hProperties: { className: ['callout-title'] } },
        children: [{ type: 'text', value: kind[0].toUpperCase() + kind.slice(1) }],
      };
      node.children.unshift(title);
    });
  };
}
```

`lib/markdown/toc.ts`:
```ts
import type { Element, Root } from 'hast';
import { toString } from 'hast-util-to-string';
import { visit } from 'unist-util-visit';

export interface TocItem {
  depth: 2 | 3;
  id: string;
  text: string;
}

/** Collects h2/h3 ids into `sink`. Must run after rehype-slug and before rehype-autolink-headings. */
export function rehypeCollectToc(sink: TocItem[]) {
  return () => (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'h2' && node.tagName !== 'h3') return;
      const id = node.properties?.id;
      if (typeof id !== 'string') return;
      sink.push({ depth: node.tagName === 'h2' ? 2 : 3, id, text: toString(node).trim() });
    });
  };
}
```

`lib/markdown/images.ts`:
```ts
import type { Element, Root, RootContent } from 'hast';
import { visit } from 'unist-util-visit';

/** Lazy-load every image; a paragraph holding only one image becomes a <figure> (caption = title). */
export function rehypeImages() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName === 'img') {
        node.properties = { ...node.properties, loading: 'lazy', decoding: 'async' };
        return;
      }
      if (node.tagName !== 'p' || !parent || typeof index !== 'number') return;
      const kids = node.children.filter((c) => !(c.type === 'text' && c.value.trim() === ''));
      if (kids.length !== 1 || kids[0].type !== 'element' || kids[0].tagName !== 'img') return;
      const img = kids[0];
      const title = typeof img.properties?.title === 'string' ? img.properties.title : '';
      delete img.properties?.title;
      img.properties = { ...img.properties, loading: 'lazy', decoding: 'async' };
      const children: RootContent[] = [img];
      if (title) {
        children.push({ type: 'element', tagName: 'figcaption', properties: {}, children: [{ type: 'text', value: title }] });
      }
      (parent.children as RootContent[])[index] = { type: 'element', tagName: 'figure', properties: {}, children };
    });
  };
}
```

- [ ] **Step 4: Write the renderer**

`lib/markdown/render.ts`:
```ts
import rehypeShiki from '@shikijs/rehype';
import type { Root as MdastRoot } from 'mdast';
import { toString as mdastToString } from 'mdast-util-to-string';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { remarkCallouts } from './callouts';
import { rehypeImages } from './images';
import { countWords, readingMinutes } from './reading-time';
import { rehypeCollectToc, type TocItem } from './toc';

export type { TocItem };

export interface Rendered {
  html: string;
  toc: TocItem[];
  wordCount: number;
  readingMinutes: number;
  excerpt: string;
  firstImage: string | null;
}

export const EXCERPT_LENGTH = 200;

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n).replace(/\s+\S*$/, '') + '…';
}

export async function renderMarkdown(markdown: string): Promise<Rendered> {
  const toc: TocItem[] = [];
  let plain = '';
  let excerpt = '';
  let firstImage: string | null = null;

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm, { singleTilde: false })
    .use(remarkCallouts)
    .use(() => (tree: MdastRoot) => {
      plain = mdastToString(tree);
      for (const node of tree.children) {
        if (node.type !== 'paragraph') continue;
        const t = mdastToString(node).trim();
        if (t) { excerpt = t; break; }
      }
      visit(tree, 'image', (img) => { if (!firstImage) firstImage = img.url; });
    })
    .use(remarkRehype, { allowDangerousHtml: true, footnoteLabel: 'Footnotes', clobberPrefix: '' })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeCollectToc(toc))
    .use(rehypeAutolinkHeadings, {
      behavior: 'append',
      properties: { className: ['heading-anchor'], ariaLabel: 'Link to this section' },
      content: { type: 'text', value: '#' },
    })
    .use(rehypeImages)
    .use(rehypeShiki, {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
      fallbackLanguage: 'text',
      addLanguageClass: true,
    })
    .use(rehypeStringify, { allowDangerousHtml: true });

  const file = await processor.process(markdown);
  const wordCount = countWords(plain);
  return {
    html: String(file),
    toc,
    wordCount,
    readingMinutes: readingMinutes(wordCount),
    excerpt: truncate(excerpt, EXCERPT_LENGTH),
    firstImage,
  };
}
```

- [ ] **Step 5: Run tests until green**

Run: `npx vitest run tests/unit/markdown.test.ts`
Expected: all pass. If the figure assertion differs only by attribute order, adjust the test to the actual (stable) order printed by rehype-stringify and keep the semantic checks.

- [ ] **Step 6: Commit**

```bash
npm run typecheck && git add -A && git commit -m "feat(markdown): unified pipeline with toc, callouts, figures, shiki"
```

---

### Task 4: Settings, post types, read queries, write path

**Files:**
- Create: `lib/settings.ts`, `lib/format.ts`, `lib/posts/types.ts`, `lib/posts/queries.ts`, `lib/posts/write.ts`
- Test: `tests/unit/posts.test.ts`

**Interfaces:**
- Produces:
  - `getSettings(db?): Settings`, `setSetting(db, key, value)`, `siteUrl(): string`, `SETTING_DEFAULTS`.
  - `formatDate(iso): string` → `September 15, 2026`; `isoDate(iso): string` → `2026-09-15`.
  - Types `PostSummary`, `PostFull`, `PostStatus`.
  - `listPublished(db, { page?, perPage?, tag? }) → { posts, total, page, pages }`, `getPublishedBySlug(db, slug) → PostFull | null`, `getAdjacent(db, post) → { older, newer }`, `listRelated(db, post, limit?) → PostSummary[]`, `listTags(db) → { tag, count }[]`, `searchPublished(db, q, limit?) → PostSummary[]`, `listAllPublished(db) → PostFull[]`, `getRedirect(db, fromPath) → { toPath, code } | null`.
  - `upsertPost(db, input: PostInput, opts?) → Promise<number>`; `PostInput = { slug, title, bodyMd, subtitle?, excerpt?, coverPath?, coverAlt?, coverWidth?, coverHeight?, tags?, status?, publishedAt?, seoTitle?, seoDescription?, canonicalUrl?, createdBy?, featured?, noindex? }`, `opts = { author?: string; note?: string }`.

- [ ] **Step 1: Write the failing test**

`tests/unit/posts.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, type Db } from '@/lib/db/client';
import { upsertPost } from '@/lib/posts/write';
import { getAdjacent, getPublishedBySlug, getRedirect, listPublished, listRelated, listTags, searchPublished } from '@/lib/posts/queries';
import { redirects } from '@/lib/db/schema';
import { getSettings, setSetting } from '@/lib/settings';
import { formatDate, isoDate } from '@/lib/format';

let db: Db;
beforeEach(async () => {
  db = openDb(':memory:');
  await upsertPost(db, { slug: 'a', title: 'Alpha', bodyMd: '## One\n\nalpha body about llamas', tags: ['tools'], status: 'published', publishedAt: '2026-01-01T00:00:00.000Z' });
  await upsertPost(db, { slug: 'b', title: 'Beta', bodyMd: 'beta body', tags: ['tools', 'agents'], status: 'published', publishedAt: '2026-02-01T00:00:00.000Z' });
  await upsertPost(db, { slug: 'c', title: 'Gamma', bodyMd: 'gamma body', tags: ['agents'], status: 'published', publishedAt: '2026-03-01T00:00:00.000Z' });
  await upsertPost(db, { slug: 'd', title: 'Draft', bodyMd: 'llamas everywhere', status: 'draft' });
});

describe('upsertPost', () => {
  it('renders markdown, stores toc/reading time, writes a revision, and updates by slug', async () => {
    const id = await upsertPost(db, { slug: 'a', title: 'Alpha 2', bodyMd: '## Two\n\nchanged' }, { author: 'agent:test', note: 'edit' });
    const p = getPublishedBySlug(db, 'a');
    expect(id).toBe(1);
    expect(p?.title).toBe('Alpha 2');
    expect(p?.toc).toEqual([{ depth: 2, id: 'two', text: 'Two' }]);
    expect(p?.bodyHtml).toContain('<h2 id="two">');
    expect(p?.readingMinutes).toBe(1);
    expect(p?.excerpt).toBe('changed');
    const revs = db.$sqlite.prepare('SELECT author, note FROM revisions WHERE post_id = 1 ORDER BY id').all();
    expect(revs).toEqual([{ author: 'human', note: '' }, { author: 'agent:test', note: 'edit' }]);
  });
});

describe('queries', () => {
  it('lists published newest first with tags and pagination', () => {
    const page1 = listPublished(db, { page: 1, perPage: 2 });
    expect(page1.posts.map((p) => p.slug)).toEqual(['c', 'b']);
    expect(page1.total).toBe(3);
    expect(page1.pages).toBe(2);
    expect(page1.posts[1].tags).toEqual(['agents', 'tools']);
    expect(listPublished(db, { page: 2, perPage: 2 }).posts.map((p) => p.slug)).toEqual(['a']);
    expect(listPublished(db, { tag: 'agents' }).posts.map((p) => p.slug)).toEqual(['c', 'b']);
  });
  it('hides drafts', () => {
    expect(getPublishedBySlug(db, 'd')).toBeNull();
  });
  it('finds older/newer neighbours', () => {
    const b = getPublishedBySlug(db, 'b')!;
    const adj = getAdjacent(db, b);
    expect(adj.older?.slug).toBe('a');
    expect(adj.newer?.slug).toBe('c');
  });
  it('relates by shared tag first, then recency, excluding self', () => {
    const a = getPublishedBySlug(db, 'a')!;
    expect(listRelated(db, a, 3).map((p) => p.slug)).toEqual(['b', 'c']);
  });
  it('counts tags over published posts only', () => {
    expect(listTags(db)).toEqual([{ tag: 'agents', count: 2 }, { tag: 'tools', count: 2 }]);
  });
  it('searches published posts with FTS and tolerates quotes', () => {
    expect(searchPublished(db, 'llamas').map((p) => p.slug)).toEqual(['a']);
    expect(searchPublished(db, 'alph"a OR').map((p) => p.slug)).toEqual(['a']);
    expect(searchPublished(db, '')).toEqual([]);
  });
  it('resolves redirects', () => {
    db.insert(redirects).values({ fromPath: '/old', toPath: '/a', code: 301 }).run();
    expect(getRedirect(db, '/old')).toEqual({ toPath: '/a', code: 301 });
    expect(getRedirect(db, '/nope')).toBeNull();
  });
});

describe('settings and format', () => {
  it('merges defaults with stored values', () => {
    expect(getSettings(db).site_title).toBe('Pritam Sharma');
    setSetting(db, 'site_title', 'Custom');
    expect(getSettings(db).site_title).toBe('Custom');
  });
  it('formats dates', () => {
    expect(formatDate('2026-09-15T10:00:00.000Z')).toBe('September 15, 2026');
    expect(isoDate('2026-09-15T10:00:00.000Z')).toBe('2026-09-15');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/posts.test.ts` — Expected: FAIL, modules not found.

- [ ] **Step 3: Write settings and format helpers**

`lib/settings.ts`:
```ts
import { getDb, type Db } from '@/lib/db/client';
import { settings } from '@/lib/db/schema';

export const SETTING_DEFAULTS = {
  site_title: 'Pritam Sharma',
  site_tagline: 'Notes on building products, developer tools and AI agents.',
  site_description:
    'Writing by Pritam Sharma on building products, developer tools and AI agents, with the code and the reasoning behind it.',
  author_name: 'Pritam Sharma',
  author_bio:
    'Software engineer and founding engineer at Emergent. I build developer tools, browser extensions and agent workflows, and write down what I learn.',
  author_avatar: '/avatar.jpg',
  author_url: 'https://notpritam.in',
  social_github: 'https://github.com/notpritam',
  social_linkedin: 'https://www.linkedin.com/in/notpritamsharma/',
  social_x: '',
  social_youtube: '',
  accent: '#b64326',
  google_site_verification: '',
  indexnow_key: '',
  posts_per_page: '10',
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type Settings = Record<SettingKey, string>;

export function getSettings(db: Db = getDb()): Settings {
  const out = { ...SETTING_DEFAULTS } as Settings;
  for (const row of db.select().from(settings).all()) {
    if (row.key in out) out[row.key as SettingKey] = row.value;
  }
  return out;
}

export function setSetting(db: Db, key: SettingKey, value: string): void {
  db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } }).run();
}

export function siteUrl(): string {
  return (process.env.SITE_URL ?? 'https://blog.notpritam.in').replace(/\/$/, '');
}
```

`lib/format.ts`:
```ts
const LONG = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export function formatDate(iso: string): string {
  return LONG.format(new Date(iso));
}

export function isoDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}
```

- [ ] **Step 4: Write types and queries**

`lib/posts/types.ts`:
```ts
import type { TocItem } from '@/lib/markdown/toc';
import type { PostStatus } from '@/lib/db/schema';

export type { PostStatus, TocItem };

export interface PostSummary {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  coverPath: string | null;
  coverAlt: string;
  coverWidth: number | null;
  coverHeight: number | null;
  tags: string[];
  readingMinutes: number;
  publishedAt: string;
  updatedAt: string;
  featured: boolean;
}

export interface PostFull extends PostSummary {
  bodyMd: string;
  bodyHtml: string;
  toc: TocItem[];
  wordCount: number;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  noindex: boolean;
  status: PostStatus;
  createdAt: string;
}
```

`lib/posts/queries.ts`:
```ts
import { and, asc, count, desc, eq, gt, inArray, lt, ne } from 'drizzle-orm';
import type { Db } from '@/lib/db/client';
import { postTags, posts, redirects } from '@/lib/db/schema';
import type { PostFull, PostSummary } from './types';

type Row = typeof posts.$inferSelect;

function tagsFor(db: Db, ids: number[]): Map<number, string[]> {
  const map = new Map<number, string[]>();
  if (ids.length === 0) return map;
  const rows = db.select().from(postTags).where(inArray(postTags.postId, ids)).orderBy(asc(postTags.tag)).all();
  for (const r of rows) map.set(r.postId, [...(map.get(r.postId) ?? []), r.tag]);
  return map;
}

function toSummary(r: Row, tags: string[]): PostSummary {
  return {
    id: r.id, slug: r.slug, title: r.title, subtitle: r.subtitle, excerpt: r.excerpt,
    coverPath: r.coverPath, coverAlt: r.coverAlt, coverWidth: r.coverWidth, coverHeight: r.coverHeight,
    tags, readingMinutes: r.readingMinutes, publishedAt: r.publishedAt ?? r.createdAt, updatedAt: r.updatedAt, featured: r.featured,
  };
}

export function toFull(r: Row, tags: string[]): PostFull {
  return {
    ...toSummary(r, tags),
    bodyMd: r.bodyMd, bodyHtml: r.bodyHtml, toc: JSON.parse(r.tocJson), wordCount: r.wordCount,
    seoTitle: r.seoTitle, seoDescription: r.seoDescription, canonicalUrl: r.canonicalUrl,
    noindex: r.noindex, status: r.status, createdAt: r.createdAt,
  };
}

function summaries(db: Db, rows: Row[]): PostSummary[] {
  const tags = tagsFor(db, rows.map((r) => r.id));
  return rows.map((r) => toSummary(r, tags.get(r.id) ?? []));
}

const published = eq(posts.status, 'published');

export function listPublished(db: Db, opts: { page?: number; perPage?: number; tag?: string } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const perPage = Math.max(1, opts.perPage ?? 10);
  let idsInTag: number[] | null = null;
  if (opts.tag) {
    idsInTag = db.select({ id: postTags.postId }).from(postTags).where(eq(postTags.tag, opts.tag)).all().map((r) => r.id);
    if (idsInTag.length === 0) return { posts: [], total: 0, page, pages: 0 };
  }
  const where = idsInTag ? and(published, inArray(posts.id, idsInTag)) : published;
  const total = db.select({ n: count() }).from(posts).where(where).get()?.n ?? 0;
  const rows = db.select().from(posts).where(where).orderBy(desc(posts.publishedAt), desc(posts.id)).limit(perPage).offset((page - 1) * perPage).all();
  return { posts: summaries(db, rows), total, page, pages: Math.ceil(total / perPage) };
}

export function getPublishedBySlug(db: Db, slug: string): PostFull | null {
  const r = db.select().from(posts).where(and(eq(posts.slug, slug), published)).get();
  if (!r) return null;
  return toFull(r, tagsFor(db, [r.id]).get(r.id) ?? []);
}

export function getAdjacent(db: Db, post: PostSummary): { older: PostSummary | null; newer: PostSummary | null } {
  const older = db.select().from(posts).where(and(published, lt(posts.publishedAt, post.publishedAt))).orderBy(desc(posts.publishedAt)).limit(1).get();
  const newer = db.select().from(posts).where(and(published, gt(posts.publishedAt, post.publishedAt))).orderBy(asc(posts.publishedAt)).limit(1).get();
  return { older: older ? summaries(db, [older])[0] : null, newer: newer ? summaries(db, [newer])[0] : null };
}

export function listRelated(db: Db, post: PostSummary, limit = 3): PostSummary[] {
  const picked: Row[] = [];
  if (post.tags.length) {
    const ids = new Set(db.select({ id: postTags.postId }).from(postTags).where(inArray(postTags.tag, post.tags)).all().map((r) => r.id));
    ids.delete(post.id);
    if (ids.size) picked.push(...db.select().from(posts).where(and(published, inArray(posts.id, [...ids]))).orderBy(desc(posts.publishedAt)).limit(limit).all());
  }
  if (picked.length < limit) {
    const exclude = [post.id, ...picked.map((r) => r.id)];
    picked.push(...db.select().from(posts).where(and(published, ne(posts.id, post.id))).orderBy(desc(posts.publishedAt)).limit(limit + exclude.length).all().filter((r) => !exclude.includes(r.id)).slice(0, limit - picked.length));
  }
  return summaries(db, picked);
}

export function listTags(db: Db): { tag: string; count: number }[] {
  return db.$sqlite.prepare(
    `SELECT t.tag AS tag, count(*) AS count FROM post_tags t JOIN posts p ON p.id = t.post_id WHERE p.status = 'published' GROUP BY t.tag ORDER BY count DESC, tag ASC`,
  ).all() as { tag: string; count: number }[];
}

export function ftsQuery(q: string): string {
  return q.split(/\s+/).map((t) => t.replace(/["*]/g, '')).filter(Boolean).map((t) => `"${t}"*`).join(' ');
}

export function searchPublished(db: Db, q: string, limit = 20): PostSummary[] {
  const match = ftsQuery(q);
  if (!match) return [];
  const rows = db.$sqlite.prepare(
    `SELECT p.* FROM posts_fts f JOIN posts p ON p.id = f.rowid WHERE posts_fts MATCH ? AND p.status = 'published' ORDER BY bm25(posts_fts, 10, 5, 3, 1) LIMIT ?`,
  ).all(match, limit) as Record<string, unknown>[];
  const ids = rows.map((r) => r.id as number);
  if (!ids.length) return [];
  const byId = new Map(db.select().from(posts).where(inArray(posts.id, ids)).all().map((r) => [r.id, r]));
  return summaries(db, ids.map((id) => byId.get(id)!).filter(Boolean));
}

export function listAllPublished(db: Db): PostFull[] {
  const rows = db.select().from(posts).where(published).orderBy(desc(posts.publishedAt)).all();
  const tags = tagsFor(db, rows.map((r) => r.id));
  return rows.map((r) => toFull(r, tags.get(r.id) ?? []));
}

export function getRedirect(db: Db, fromPath: string): { toPath: string; code: number } | null {
  const r = db.select({ toPath: redirects.toPath, code: redirects.code }).from(redirects).where(eq(redirects.fromPath, fromPath)).get();
  return r ?? null;
}
```

- [ ] **Step 5: Write the write path**

`lib/posts/write.ts`:
```ts
import { eq } from 'drizzle-orm';
import type { Db } from '@/lib/db/client';
import { postTags, posts, revisions, type PostStatus } from '@/lib/db/schema';
import { renderMarkdown } from '@/lib/markdown/render';

export interface PostInput {
  slug: string;
  title: string;
  bodyMd: string;
  subtitle?: string;
  excerpt?: string;
  coverPath?: string | null;
  coverAlt?: string;
  coverWidth?: number | null;
  coverHeight?: number | null;
  tags?: string[];
  status?: PostStatus;
  publishedAt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  createdBy?: string;
  featured?: boolean;
  noindex?: boolean;
}

export interface WriteOpts { author?: string; note?: string }

/** Insert or update a post by slug. Renders markdown, writes tags and a revision. Returns the post id. */
export async function upsertPost(db: Db, input: PostInput, opts: WriteOpts = {}): Promise<number> {
  const rendered = await renderMarkdown(input.bodyMd);
  const now = new Date().toISOString();
  const existing = db.select({ id: posts.id }).from(posts).where(eq(posts.slug, input.slug)).get();
  const values = {
    title: input.title,
    subtitle: input.subtitle ?? '',
    bodyMd: input.bodyMd,
    bodyHtml: rendered.html,
    tocJson: JSON.stringify(rendered.toc),
    excerpt: input.excerpt?.trim() || rendered.excerpt,
    readingMinutes: rendered.readingMinutes,
    wordCount: rendered.wordCount,
    updatedAt: now,
    ...(input.coverPath !== undefined && { coverPath: input.coverPath }),
    ...(input.coverAlt !== undefined && { coverAlt: input.coverAlt }),
    ...(input.coverWidth !== undefined && { coverWidth: input.coverWidth }),
    ...(input.coverHeight !== undefined && { coverHeight: input.coverHeight }),
    ...(input.status !== undefined && { status: input.status }),
    ...(input.publishedAt !== undefined && { publishedAt: input.publishedAt }),
    ...(input.seoTitle !== undefined && { seoTitle: input.seoTitle }),
    ...(input.seoDescription !== undefined && { seoDescription: input.seoDescription }),
    ...(input.canonicalUrl !== undefined && { canonicalUrl: input.canonicalUrl }),
    ...(input.featured !== undefined && { featured: input.featured }),
    ...(input.noindex !== undefined && { noindex: input.noindex }),
  };
  const id = db.transaction((tx) => {
    let id: number;
    if (existing) {
      tx.update(posts).set(values).where(eq(posts.id, existing.id)).run();
      id = existing.id;
    } else {
      id = tx.insert(posts).values({ slug: input.slug, createdBy: input.createdBy ?? 'human', ...values }).returning({ id: posts.id }).get().id;
    }
    if (input.tags) {
      tx.delete(postTags).where(eq(postTags.postId, id)).run();
      const clean = [...new Set(input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
      if (clean.length) tx.insert(postTags).values(clean.map((tag) => ({ postId: id, tag }))).run();
    }
    tx.insert(revisions).values({
      postId: id, title: values.title, subtitle: values.subtitle, excerpt: values.excerpt, bodyMd: input.bodyMd,
      author: opts.author ?? 'human', note: opts.note ?? '',
    }).run();
    return id;
  });
  return id;
}
```

- [ ] **Step 6: Run tests until green, then commit**

Run: `npx vitest run tests/unit/posts.test.ts` — Expected: all pass.

```bash
npm run typecheck && git add -A && git commit -m "feat(posts): settings, queries, fts search, upsert with revisions"
```

---

### Task 5: Media store and uploads route

**Files:**
- Create: `lib/media/store.ts`, `app/uploads/[...path]/route.ts`
- Test: `tests/unit/media.test.ts`

**Interfaces:**
- Produces: `saveUpload(db, { buffer, filename, alt?, createdBy? }) → Promise<StoredMedia>`, `fetchToUpload(db, url, { alt?, createdBy? }) → Promise<StoredMedia>`, `StoredMedia = { id, path, width, height, bytes, mime }` where `path` is a public URL path like `/uploads/2026/09/ab12cd34-cover.png`.

- [ ] **Step 1: Write the failing test**

`tests/unit/media.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { openDb, type Db } from '@/lib/db/client';
import { saveUpload } from '@/lib/media/store';

let dir: string;
let db: Db;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-media-'));
  process.env.BLOG_DATA_DIR = dir;
  db = openDb(':memory:');
});
afterEach(() => {
  delete process.env.BLOG_DATA_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('saveUpload', () => {
  it('stores the file under uploads/YYYY/MM with a hashed name and records dimensions', async () => {
    const buffer = await sharp({ create: { width: 40, height: 30, channels: 3, background: '#fff' } }).png().toBuffer();
    const m = await saveUpload(db, { buffer, filename: 'My Cover (final).PNG', alt: 'A cover' });
    expect(m.path).toMatch(/^\/uploads\/\d{4}\/\d{2}\/[0-9a-f]{8}-my-cover-final\.png$/);
    expect(m.width).toBe(40);
    expect(m.height).toBe(30);
    expect(m.mime).toBe('image/png');
    expect(fs.existsSync(path.join(dir, m.path.replace(/^\//, '')))).toBe(true);
    const row = db.$sqlite.prepare('SELECT path, alt, width FROM media').get();
    expect(row).toEqual({ path: m.path, alt: 'A cover', width: 40 });
  });

  it('dedupes identical bytes', async () => {
    const buffer = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#000' } }).png().toBuffer();
    const a = await saveUpload(db, { buffer, filename: 'a.png' });
    const b = await saveUpload(db, { buffer, filename: 'b.png' });
    expect(b.path).toBe(a.path);
  });

  it('rejects unsupported types', async () => {
    await expect(saveUpload(db, { buffer: Buffer.from('hello'), filename: 'x.exe' })).rejects.toThrow(/Unsupported/);
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run tests/unit/media.test.ts` → FAIL (module not found).

- [ ] **Step 3: Write the store**

`lib/media/store.ts`:
```ts
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { uploadsDir, type Db } from '@/lib/db/client';
import { media } from '@/lib/db/schema';

export interface StoredMedia { id: number; path: string; width: number | null; height: number | null; bytes: number; mime: string }

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.avif': 'image/avif', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf',
};
export const MEDIA_MIME = MIME_BY_EXT;

function safeBase(filename: string): { base: string; ext: string } {
  const ext = path.extname(filename).toLowerCase();
  const base = path.basename(filename, path.extname(filename)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'file';
  return { base, ext };
}

export async function saveUpload(
  db: Db,
  input: { buffer: Buffer; filename: string; alt?: string; createdBy?: string },
): Promise<StoredMedia> {
  const { base, ext } = safeBase(input.filename);
  const mime = MIME_BY_EXT[ext];
  if (!mime) throw new Error(`Unsupported file type: ${ext || '(none)'}`);
  const hash = crypto.createHash('sha256').update(input.buffer).digest('hex').slice(0, 8);
  const now = new Date();
  const rel = path.posix.join(String(now.getUTCFullYear()), String(now.getUTCMonth() + 1).padStart(2, '0'), `${hash}-${base}${ext}`);
  const publicPath = `/uploads/${rel}`;

  const existing = db.select().from(media).where(eq(media.path, publicPath)).get();
  if (existing) return { id: existing.id, path: existing.path, width: existing.width, height: existing.height, bytes: existing.bytes, mime: existing.mime };

  let width: number | null = null;
  let height: number | null = null;
  if (mime.startsWith('image/') && mime !== 'image/svg+xml') {
    const meta = await sharp(input.buffer).metadata();
    width = meta.width ?? null;
    height = meta.height ?? null;
  }
  const abs = path.join(uploadsDir(), rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, input.buffer);
  const row = db.insert(media).values({ path: publicPath, alt: input.alt ?? '', width, height, bytes: input.buffer.length, mime, createdBy: input.createdBy ?? 'human' }).returning().get();
  return { id: row.id, path: row.path, width: row.width, height: row.height, bytes: row.bytes, mime: row.mime };
}

export async function fetchToUpload(db: Db, url: string, opts: { alt?: string; createdBy?: string } = {}): Promise<StoredMedia> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch ${url} failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  let filename = path.basename(new URL(url).pathname) || 'file';
  if (!path.extname(filename)) {
    const type = res.headers.get('content-type')?.split(';')[0] ?? '';
    const ext = Object.entries(MIME_BY_EXT).find(([, m]) => m === type)?.[0] ?? '.png';
    filename += ext;
  }
  return saveUpload(db, { buffer, filename, alt: opts.alt, createdBy: opts.createdBy });
}
```

- [ ] **Step 4: Write the uploads route**

`app/uploads/[...path]/route.ts`:
```ts
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { uploadsDir } from '@/lib/db/client';
import { MEDIA_MIME } from '@/lib/media/store';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params;
  const root = path.resolve(uploadsDir());
  const file = path.resolve(root, ...parts);
  if (!file.startsWith(root + path.sep)) return new Response('Not found', { status: 404 });
  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(file);
  } catch {
    return new Response('Not found', { status: 404 });
  }
  if (!stat.isFile()) return new Response('Not found', { status: 404 });
  const type = MEDIA_MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
  const body = Readable.toWeb(fs.createReadStream(file)) as ReadableStream;
  return new Response(body, {
    headers: {
      'Content-Type': type,
      'Content-Length': String(stat.size),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
```

- [ ] **Step 5: Run tests, typecheck, commit**

Run: `npx vitest run tests/unit/media.test.ts` → 3 passed.
```bash
npm run typecheck && git add -A && git commit -m "feat(media): hashed upload store with dimensions and uploads route"
```

---

### Task 6: Design tokens, fonts, root layout, header, footer, theme toggle

**Files:**
- Create: `app/globals.css`, `app/layout.tsx` (replace), `components/site/site-header.tsx`, `components/site/site-footer.tsx`, `components/site/theme-toggle.tsx`, `components/site/search-form.tsx`, `lib/seo/metadata.ts`

**Interfaces:**
- Consumes: `getSettings`, `siteUrl`.
- Produces: CSS variables and utility classes used by every later task (`.page`, `.page-wide`, `.eyebrow`, `.h-display`, `.dashed-t/.dashed-b/.dashed-r`, `.btn-accent`), fonts via `--font-inter`, `--font-inter-tight`, `--font-jetbrains-mono`; `rootMetadata(settings): Metadata`.

- [ ] **Step 1: Write globals.css**

`app/globals.css`:
```css
@import "tailwindcss";

:root {
  --bg: #ffffff;
  --bg-muted: #f6f6f7;
  --ink: #111111;
  --text: #262626;
  --text-soft: rgba(38, 38, 38, 0.72);
  --meta: #707070;
  --line: #d4d4d4;
  --line-soft: #e8e8e8;
  --accent: #b64326;
  --accent-ink: #ffffff;
  --code-bg: #ffffff;
  --code-border: #d4d4d4;
  --inline-code-bg: #f3f3f4;
  --font-sans: var(--font-inter), system-ui, -apple-system, sans-serif;
  --font-display: var(--font-inter-tight), var(--font-sans);
  --font-mono: var(--font-jetbrains-mono), ui-monospace, "SFMono-Regular", monospace;
  --page: 930px;
  --page-wide: 1200px;
  --measure: 715px;
  --rail: 230px;
  --header-h: 72px;
  color-scheme: light;
}

[data-theme="dark"] {
  --bg: #0e0e0f;
  --bg-muted: #161618;
  --ink: #f4f4f4;
  --text: #d9d9d9;
  --text-soft: rgba(217, 217, 217, 0.72);
  --meta: #8f8f8f;
  --line: #36363a;
  --line-soft: #26262a;
  --accent: #e0664a;
  --accent-ink: #111111;
  --code-bg: #121214;
  --code-border: #36363a;
  --inline-code-bg: #1d1d20;
  color-scheme: dark;
}

@theme inline {
  --color-bg: var(--bg);
  --color-bg-muted: var(--bg-muted);
  --color-ink: var(--ink);
  --color-text: var(--text);
  --color-text-soft: var(--text-soft);
  --color-meta: var(--meta);
  --color-line: var(--line);
  --color-line-soft: var(--line-soft);
  --color-accent: var(--accent);
  --color-accent-ink: var(--accent-ink);
  --font-sans: var(--font-sans);
  --font-display: var(--font-display);
  --font-mono: var(--font-mono);
}

html { scroll-behavior: smooth; scroll-padding-top: calc(var(--header-h) + 24px); }
body { margin: 0; background: var(--bg); color: var(--text); font-family: var(--font-sans); -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
a { color: inherit; text-decoration: none; }
img { max-width: 100%; height: auto; display: block; }
button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 2px; }
h1, h2, h3, h4, p { margin: 0; }

.page { max-width: var(--page); margin: 0 auto; padding: 0 24px; }
.page-wide { max-width: var(--page-wide); margin: 0 auto; padding: 0 24px; }
.eyebrow { font-family: var(--font-mono); font-size: 12px; line-height: 1.4; letter-spacing: 0.3px; text-transform: uppercase; color: var(--meta); }
.h-display { font-family: var(--font-display); color: var(--ink); letter-spacing: -0.012em; }
.dashed-t { border-top: 1px dashed var(--line); }
.dashed-b { border-bottom: 1px dashed var(--line); }
.dashed-r { border-right: 1px dashed var(--line); }
.btn-accent { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 16px; border-radius: 9999px; background: var(--accent); color: var(--accent-ink); font-weight: 600; font-size: 14px; }
.btn-accent:hover { opacity: 0.9; }
.link-hover:hover { color: var(--accent); }
.skip-link { position: fixed; top: -100px; left: 16px; z-index: 100; padding: 12px 16px; background: var(--ink); color: var(--bg); border-radius: 6px; }
.skip-link:focus { top: 12px; }
```

- [ ] **Step 2: Write metadata helper**

`lib/seo/metadata.ts`:
```ts
import type { Metadata } from 'next';
import { siteUrl, type Settings } from '@/lib/settings';

export function rootMetadata(s: Settings): Metadata {
  const base = siteUrl();
  return {
    metadataBase: new URL(base),
    title: { default: `${s.site_title} · Blog`, template: `%s · ${s.site_title}` },
    description: s.site_description,
    applicationName: s.site_title,
    authors: [{ name: s.author_name, url: s.author_url }],
    creator: s.author_name,
    alternates: {
      canonical: '/',
      types: {
        'application/rss+xml': [{ url: `${base}/rss.xml`, title: `${s.site_title} · RSS` }],
        'application/feed+json': [{ url: `${base}/feed.json`, title: `${s.site_title} · JSON Feed` }],
      },
    },
    openGraph: { type: 'website', siteName: s.site_title, url: base, title: `${s.site_title} · Blog`, description: s.site_description, images: [{ url: `${base}/og/site.png`, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title: `${s.site_title} · Blog`, description: s.site_description, images: [`${base}/og/site.png`] },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
    ...(s.google_site_verification && { verification: { google: s.google_site_verification } }),
  };
}
```

- [ ] **Step 3: Write the theme toggle, search form, header, footer**

`components/site/theme-toggle.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  }, []);
  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch {}
    setTheme(next);
  }
  return (
    <button type="button" onClick={toggle} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} className="link-hover inline-flex h-9 w-9 items-center justify-center rounded-full">
      {theme === 'dark' ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>
      )}
    </button>
  );
}
```

`components/site/search-form.tsx`:
```tsx
export function SearchForm({ defaultValue = '', autoFocus = false }: { defaultValue?: string; autoFocus?: boolean }) {
  return (
    <form action="/search" method="get" role="search" className="flex w-full items-center gap-2 border border-dashed border-line px-3 py-2">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input type="search" name="q" defaultValue={defaultValue} placeholder="Search writing…" aria-label="Search" autoFocus={autoFocus} className="w-full bg-transparent text-[15px] outline-none placeholder:text-meta" />
    </form>
  );
}
```

`components/site/site-header.tsx`:
```tsx
import Image from 'next/image';
import Link from 'next/link';
import type { Settings } from '@/lib/settings';
import { ThemeToggle } from './theme-toggle';

const NAV = [
  { href: '/', label: 'Writing' },
  { href: '/tags', label: 'Tags' },
  { href: '/about', label: 'About' },
];

export function SiteHeader({ settings: s }: { settings: Settings }) {
  return (
    <header className="dashed-b sticky top-0 z-40 bg-bg" style={{ height: 'var(--header-h)' }}>
      <div className="page-wide flex h-full items-center justify-between">
        <Link href="/" className="flex items-center gap-3" aria-label={`${s.site_title} home`}>
          <Image src={s.author_avatar} alt="" width={28} height={28} className="rounded-full" priority />
          <span className="h-display text-[18px] font-medium">{s.site_title}</span>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="link-hover px-2 py-2 text-[14px] sm:px-3">{n.label}</Link>
          ))}
          <Link href="/search" aria-label="Search" className="link-hover inline-flex h-9 w-9 items-center justify-center rounded-full">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </Link>
          <a href="/rss.xml" aria-label="RSS feed" className="link-hover inline-flex h-9 w-9 items-center justify-center rounded-full">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="19" r="2" /><path d="M3 10a11 11 0 0 1 11 11h-3a8 8 0 0 0-8-8v-3Zm0-7a18 18 0 0 1 18 18h-3A15 15 0 0 0 3 6V3Z" /></svg>
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
```

`components/site/site-footer.tsx`:
```tsx
import Link from 'next/link';
import type { Settings } from '@/lib/settings';

export function SiteFooter({ settings: s }: { settings: Settings }) {
  const links = [
    s.social_github && { href: s.social_github, label: 'GitHub' },
    s.social_linkedin && { href: s.social_linkedin, label: 'LinkedIn' },
    s.social_x && { href: s.social_x, label: 'X' },
    s.social_youtube && { href: s.social_youtube, label: 'YouTube' },
    { href: s.author_url, label: 'Portfolio' },
  ].filter(Boolean) as { href: string; label: string }[];
  return (
    <footer className="dashed-t mt-24 bg-bg-muted">
      <div className="page-wide grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="h-display text-[20px] font-medium">{s.site_title}</p>
          <p className="mt-2 max-w-[42ch] text-[15px] leading-6 text-text-soft">{s.site_tagline}</p>
        </div>
        <div>
          <p className="eyebrow mb-3">Elsewhere</p>
          <ul className="space-y-2 text-[15px]">
            {links.map((l) => (
              <li key={l.href}><a href={l.href} className="link-hover" rel="me noopener" target="_blank">{l.label}</a></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-3">Follow</p>
          <ul className="space-y-2 text-[15px]">
            <li><a href="/rss.xml" className="link-hover">RSS</a></li>
            <li><a href="/feed.json" className="link-hover">JSON Feed</a></li>
            <li><a href="/sitemap.xml" className="link-hover">Sitemap</a></li>
            <li><Link href="/tags" className="link-hover">All tags</Link></li>
          </ul>
        </div>
      </div>
      <div className="dashed-t">
        <div className="page-wide flex flex-wrap items-center justify-between gap-2 py-5 text-[13px] text-meta">
          <span>© {new Date().getFullYear()} {s.author_name}</span>
          <span>Written by hand, with some help from agents.</span>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: Replace the root layout**

`app/layout.tsx`:
```tsx
import type { Metadata } from 'next';
import { Inter, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';
import { rootMetadata } from '@/lib/seo/metadata';
import { getSettings } from '@/lib/settings';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const interTight = Inter_Tight({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-inter-tight', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jetbrains-mono', display: 'swap' });

const THEME_INIT = `(function(){try{var t=localStorage.getItem('theme');if(t!=='dark'&&t!=='light'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}})()`;

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  return rootMetadata(getSettings());
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const settings = getSettings();
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${interTight.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        {settings.accent !== '#b64326' && <style>{`:root{--accent:${settings.accent}}`}</style>}
      </head>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <SiteHeader settings={settings} />
        <main id="main">{children}</main>
        <SiteFooter settings={settings} />
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Add the avatar asset now so the header renders**

```bash
cd /home/pritam/personal/apps/blog && mkdir -p public && curl -sL 'https://cdn.hashnode.com/res/hashnode/image/upload/v1707826325245/aaca6e6d-a6b6-4e87-813e-ff6ebcbb997e.jpeg' -o public/avatar.jpg && file public/avatar.jpg
```
Expected: `JPEG image data`. If the download fails, copy `/home/pritam/personal/apps/portfolio-v2/public/assets/profile.jpg` to `public/avatar.jpg` instead.

- [ ] **Step 6: Build, run, inspect**

```bash
npm run typecheck && npm run build && (BLOG_DATA_DIR=/tmp/blog-t6 npm run dev > /tmp/blog-dev.log 2>&1 &) && sleep 6 && curl -s localhost:8799 | grep -o '<header[^>]*>' && curl -s localhost:8799 | grep -c 'data-theme' ; pkill -f 'next dev -p 8799'
```
Expected: header markup present; theme script present in `<head>`. Fonts must be self-hosted: `curl -s localhost:8799 | grep -c fonts.googleapis` prints `0`.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(site): tokens, fonts, layout, header, footer, theme toggle"
```

---

### Task 7: Home page, post cards, pagination

**Files:**
- Create: `components/posts/post-date.tsx`, `components/posts/author-chip.tsx`, `components/posts/featured-post.tsx`, `components/posts/post-card.tsx`, `components/posts/post-grid.tsx`, `components/posts/pagination.tsx`, `app/page.tsx` (replace), `app/page/[n]/page.tsx`, `components/seo/json-ld.tsx`, `lib/seo/jsonld.ts`
- Test: `tests/unit/jsonld.test.ts`

**Interfaces:**
- Consumes: `listPublished`, `getSettings`, `formatDate`, `PostSummary`.
- Produces: `<PostDate iso readingMinutes? />`, `<AuthorChip settings size? />`, `<FeaturedPost post settings />`, `<PostCard post settings />`, `<PostGrid posts settings />`, `<Pagination page pages basePath />`, `<JsonLd data />`, `websiteJsonLd(s)`, `personJsonLd(s)`, `blogPostingJsonLd(post, s)`, `breadcrumbJsonLd(items)`, `collectionPageJsonLd(name, url, posts, s)`.

- [ ] **Step 1: Write the JSON-LD test**

`tests/unit/jsonld.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { blogPostingJsonLd, breadcrumbJsonLd, personJsonLd, websiteJsonLd } from '@/lib/seo/jsonld';
import { SETTING_DEFAULTS } from '@/lib/settings';
import type { PostFull } from '@/lib/posts/types';

const s = { ...SETTING_DEFAULTS };
const post: PostFull = {
  id: 1, slug: 'hello', title: 'Hello', subtitle: 'Sub', excerpt: 'Excerpt', coverPath: '/uploads/2026/09/aa-cover.png', coverAlt: 'c',
  coverWidth: 1200, coverHeight: 630, tags: ['tools', 'agents'], readingMinutes: 4, publishedAt: '2026-05-21T19:45:54.777Z',
  updatedAt: '2026-06-01T00:00:00.000Z', featured: false, bodyMd: '', bodyHtml: '', toc: [], wordCount: 800, seoTitle: null,
  seoDescription: 'SEO desc', canonicalUrl: null, noindex: false, status: 'published', createdAt: '2026-05-21T19:45:54.777Z',
};

describe('jsonld', () => {
  it('builds a BlogPosting with absolute urls and author', () => {
    const j = blogPostingJsonLd(post, s, 'https://blog.notpritam.in');
    expect(j['@type']).toBe('BlogPosting');
    expect(j.headline).toBe('Hello');
    expect(j.description).toBe('SEO desc');
    expect(j.image).toEqual(['https://blog.notpritam.in/uploads/2026/09/aa-cover.png', 'https://blog.notpritam.in/og/hello.png']);
    expect(j.datePublished).toBe('2026-05-21T19:45:54.777Z');
    expect(j.dateModified).toBe('2026-06-01T00:00:00.000Z');
    expect(j.author).toEqual({ '@type': 'Person', name: 'Pritam Sharma', url: 'https://notpritam.in' });
    expect(j.keywords).toBe('tools, agents');
    expect(j.wordCount).toBe(800);
    expect(j.mainEntityOfPage).toBe('https://blog.notpritam.in/hello');
  });
  it('builds WebSite, Person and BreadcrumbList', () => {
    expect(websiteJsonLd(s, 'https://x.dev')['@type']).toBe('WebSite');
    expect(personJsonLd(s).sameAs).toEqual(['https://github.com/notpritam', 'https://www.linkedin.com/in/notpritamsharma/', 'https://notpritam.in']);
    const b = breadcrumbJsonLd([{ name: 'Home', url: 'https://x.dev/' }, { name: 'Hello', url: 'https://x.dev/hello' }]);
    expect(b.itemListElement[1]).toEqual({ '@type': 'ListItem', position: 2, name: 'Hello', item: 'https://x.dev/hello' });
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run tests/unit/jsonld.test.ts` → FAIL.

- [ ] **Step 3: Write JSON-LD builders and component**

`lib/seo/jsonld.ts`:
```ts
import type { PostFull, PostSummary } from '@/lib/posts/types';
import type { Settings } from '@/lib/settings';

type Json = Record<string, unknown>;

export function personJsonLd(s: Settings): Json & { sameAs: string[] } {
  const sameAs = [s.social_github, s.social_linkedin, s.social_x, s.social_youtube, s.author_url].filter(Boolean);
  return { '@type': 'Person', '@id': `${s.author_url}#person`, name: s.author_name, url: s.author_url, description: s.author_bio, sameAs };
}

export function websiteJsonLd(s: Settings, base: string): Json {
  return {
    '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${base}#website`, name: `${s.site_title} · Blog`, url: base,
    description: s.site_description, inLanguage: 'en', author: personJsonLd(s),
    potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${base}/search?q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
  };
}

export function blogPostingJsonLd(post: PostFull, s: Settings, base: string): Json & Record<'headline' | 'description' | 'datePublished' | 'dateModified' | 'keywords' | 'mainEntityOfPage', string> & { image: string[]; author: Json; wordCount: number } {
  const url = `${base}/${post.slug}`;
  const image = [post.coverPath ? `${base}${post.coverPath}` : null, `${base}/og/${post.slug}.png`].filter(Boolean) as string[];
  return {
    '@context': 'https://schema.org', '@type': 'BlogPosting', '@id': `${url}#article`,
    headline: post.seoTitle ?? post.title, alternativeHeadline: post.subtitle || undefined,
    description: post.seoDescription ?? post.excerpt, image, url, mainEntityOfPage: url,
    datePublished: post.publishedAt, dateModified: post.updatedAt > post.publishedAt ? post.updatedAt : post.publishedAt,
    author: { '@type': 'Person', name: s.author_name, url: s.author_url },
    publisher: { '@type': 'Person', name: s.author_name, url: s.author_url },
    keywords: post.tags.join(', '), wordCount: post.wordCount, inLanguage: 'en', isAccessibleForFree: true,
    timeRequired: `PT${post.readingMinutes}M`,
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]): Json & { itemListElement: Json[] } {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })) };
}

export function collectionPageJsonLd(name: string, url: string, posts: PostSummary[], s: Settings, base: string): Json {
  return {
    '@context': 'https://schema.org', '@type': 'CollectionPage', name, url, isPartOf: { '@id': `${base}#website` },
    author: personJsonLd(s),
    mainEntity: { '@type': 'ItemList', itemListElement: posts.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${base}/${p.slug}`, name: p.title })) },
  };
}
```

`components/seo/json-ld.tsx`:
```tsx
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
```

- [ ] **Step 4: Write the post components**

`components/posts/post-date.tsx`:
```tsx
import { formatDate } from '@/lib/format';

export function PostDate({ iso, readingMinutes }: { iso: string; readingMinutes?: number }) {
  return (
    <p className="eyebrow">
      <time dateTime={iso}>{formatDate(iso)}</time>
      {readingMinutes ? <span> · {readingMinutes} min read</span> : null}
    </p>
  );
}
```

`components/posts/author-chip.tsx`:
```tsx
import Image from 'next/image';
import type { Settings } from '@/lib/settings';

export function AuthorChip({ settings: s, size = 28 }: { settings: Settings; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-[14px] text-ink">
      <Image src={s.author_avatar} alt="" width={size} height={size} className="rounded-full" />
      <span>{s.author_name}</span>
    </span>
  );
}
```

`components/posts/featured-post.tsx`:
```tsx
import Image from 'next/image';
import Link from 'next/link';
import type { PostSummary } from '@/lib/posts/types';
import type { Settings } from '@/lib/settings';
import { AuthorChip } from './author-chip';
import { PostDate } from './post-date';

export function FeaturedPost({ post, settings }: { post: PostSummary; settings: Settings }) {
  return (
    <article className="dashed-b grid gap-8 py-12 md:grid-cols-[minmax(0,1fr)_465px] md:items-center">
      <div>
        <PostDate iso={post.publishedAt} />
        <h2 className="h-display mt-4 text-[28px] font-medium leading-[1.25]">
          <Link href={`/${post.slug}`} className="link-hover">{post.title}</Link>
        </h2>
        <p className="mt-4 text-[18px] leading-[27px] text-text-soft">{post.subtitle || post.excerpt}</p>
        <div className="mt-6"><AuthorChip settings={settings} /></div>
      </div>
      {post.coverPath && (
        <Link href={`/${post.slug}`} aria-hidden="true" tabIndex={-1} className="block">
          <Image src={post.coverPath} alt={post.coverAlt} width={465} height={248} sizes="(min-width: 768px) 465px, 100vw" className="aspect-[1.88] w-full object-cover" priority />
        </Link>
      )}
    </article>
  );
}
```

`components/posts/post-card.tsx`:
```tsx
import Link from 'next/link';
import type { PostSummary } from '@/lib/posts/types';
import type { Settings } from '@/lib/settings';
import { AuthorChip } from './author-chip';
import { PostDate } from './post-date';

export function PostCard({ post, settings }: { post: PostSummary; settings: Settings }) {
  return (
    <article className="flex h-full flex-col py-10 md:px-8 md:first:pl-0 md:[&:nth-child(2n)]:pr-0">
      <PostDate iso={post.publishedAt} />
      <h3 className="h-display mt-4 text-[24px] font-medium leading-[33px]">
        <Link href={`/${post.slug}`} className="link-hover">{post.title}</Link>
      </h3>
      <p className="mt-4 text-[16px] leading-[26px] text-text-soft">{post.subtitle || post.excerpt}</p>
      <div className="mt-auto pt-6"><AuthorChip settings={settings} /></div>
    </article>
  );
}
```

`components/posts/post-grid.tsx`:
```tsx
import type { PostSummary } from '@/lib/posts/types';
import type { Settings } from '@/lib/settings';
import { PostCard } from './post-card';

/** Two columns with a dashed vertical divider between the columns and dashed rows between pairs. */
export function PostGrid({ posts, settings }: { posts: PostSummary[]; settings: Settings }) {
  if (posts.length === 0) return <p className="py-16 text-text-soft">Nothing here yet.</p>;
  return (
    <div className="grid md:grid-cols-2 [&>*]:dashed-b md:[&>*:nth-child(odd)]:dashed-r">
      {posts.map((p) => <PostCard key={p.id} post={p} settings={settings} />)}
    </div>
  );
}
```

`components/posts/pagination.tsx`:
```tsx
import Link from 'next/link';

export function Pagination({ page, pages, basePath = '/page' }: { page: number; pages: number; basePath?: string }) {
  if (pages <= 1) return null;
  const newer = page > 1 ? (page === 2 ? '/' : `${basePath}/${page - 1}`) : null;
  const older = page < pages ? `${basePath}/${page + 1}` : null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between py-8 text-[14px]">
      <span>{newer && <Link href={newer} className="link-hover" rel="prev">← Newer posts</Link>}</span>
      <span className="eyebrow">Page {page} of {pages}</span>
      <span>{older && <Link href={older} className="link-hover" rel="next">Older posts →</Link>}</span>
    </nav>
  );
}
```

- [ ] **Step 5: Write the home and paged routes**

`app/page.tsx`:
```tsx
import { JsonLd } from '@/components/seo/json-ld';
import { FeaturedPost } from '@/components/posts/featured-post';
import { Pagination } from '@/components/posts/pagination';
import { PostGrid } from '@/components/posts/post-grid';
import { getDb } from '@/lib/db/client';
import { listPublished } from '@/lib/posts/queries';
import { websiteJsonLd } from '@/lib/seo/jsonld';
import { getSettings, siteUrl } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default function Home() {
  const db = getDb();
  const s = getSettings(db);
  const { posts, page, pages } = listPublished(db, { page: 1, perPage: Number(s.posts_per_page) || 10 });
  const [featured, ...rest] = posts;
  return (
    <div className="page-wide">
      <JsonLd data={websiteJsonLd(s, siteUrl())} />
      <section className="dashed-b py-16">
        <h1 className="h-display text-[36px] font-semibold leading-[1.15]">{s.site_title}</h1>
        <p className="mt-3 max-w-[60ch] text-[18px] leading-[27px] text-text-soft">{s.site_tagline}</p>
      </section>
      {featured ? <FeaturedPost post={featured} settings={s} /> : <p className="py-16 text-text-soft">No posts yet.</p>}
      <PostGrid posts={rest} settings={s} />
      <Pagination page={page} pages={pages} />
    </div>
  );
}
```

`app/page/[n]/page.tsx`:
```tsx
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { Pagination } from '@/components/posts/pagination';
import { PostGrid } from '@/components/posts/post-grid';
import { getDb } from '@/lib/db/client';
import { listPublished } from '@/lib/posts/queries';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ n: string }> }): Promise<Metadata> {
  const { n } = await params;
  return { title: `Writing · page ${n}`, alternates: { canonical: `/page/${n}` }, robots: { index: true, follow: true } };
}

export default async function Paged({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const page = Number(n);
  if (!Number.isInteger(page) || page < 1) notFound();
  if (page === 1) permanentRedirect('/');
  const db = getDb();
  const s = getSettings(db);
  const { posts, pages } = listPublished(db, { page, perPage: Number(s.posts_per_page) || 10 });
  if (posts.length === 0) notFound();
  return (
    <div className="page-wide">
      <section className="dashed-b py-10"><h1 className="h-display text-[28px] font-medium">Older writing · page {page}</h1></section>
      <PostGrid posts={posts} settings={s} />
      <Pagination page={page} pages={pages} />
    </div>
  );
}
```

- [ ] **Step 6: Test, seed, and eyeball**

```bash
npx vitest run && npm run typecheck
cat > /tmp/seed.ts <<'TS'
import { openDb } from '@/lib/db/client';
import { upsertPost } from '@/lib/posts/write';
const db = openDb(process.env.BLOG_DATA_DIR + '/blog.db');
for (let i = 1; i <= 12; i++) {
  await upsertPost(db, { slug: `post-${i}`, title: `Post number ${i} with a reasonably long title`, subtitle: `Subtitle ${i}`, bodyMd: `## Heading\n\nBody ${i} `.repeat(20), tags: [i % 2 ? 'tools' : 'agents'], status: 'published', publishedAt: new Date(2026, 0, i).toISOString() });
}
TS
mkdir -p /tmp/blog-t7 && BLOG_DATA_DIR=/tmp/blog-t7 npx tsx --tsconfig tsconfig.json /tmp/seed.ts
(BLOG_DATA_DIR=/tmp/blog-t7 npm run dev > /tmp/blog-dev.log 2>&1 &) && sleep 6
curl -s localhost:8799 | grep -c '<article' ; curl -s localhost:8799/page/2 | grep -c '<article' ; curl -s -o /dev/null -w '%{http_code}\n' localhost:8799/page/1 ; curl -s localhost:8799 | grep -o '"@type":"WebSite"'
pkill -f 'next dev -p 8799'
```
Expected: home has 10 articles (1 featured + 9), page 2 has 2, `/page/1` returns 308, WebSite JSON-LD present. If `npx tsx` cannot resolve `@/`, run it with `NODE_OPTIONS=--import=tsx` from the project root after adding `"tsx": { "tsconfig": "./tsconfig.json" }`; otherwise replace `@/` with relative paths in the temp script.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(home): hero, featured post, post grid, pagination, WebSite json-ld"
```

---

### Task 8: Article page, typography, TOC, share, prev/next, related

**Files:**
- Create: `app/article.css`, `app/[slug]/page.tsx`, `components/article/article-header.tsx`, `components/article/article-body.tsx`, `components/article/toc-nav.tsx`, `components/article/code-copy.tsx`, `components/article/share-row.tsx`, `components/article/prev-next.tsx`, `components/article/more-writing.tsx`

**Interfaces:**
- Consumes: `getPublishedBySlug`, `getAdjacent`, `listRelated`, `getRedirect`, `blogPostingJsonLd`, `breadcrumbJsonLd`, `PostDate`, `AuthorChip`, `PostCard`.
- Produces: the canonical article URL shape `/<slug>`; metadata per spec §10.

- [ ] **Step 1: Write article.css**

`app/article.css`:
```css
.prose { max-width: var(--measure); font-size: 16px; line-height: 28px; color: var(--text); }
.prose > * + * { margin-top: 28px; }
.prose p { color: var(--text-soft); }
.prose strong { color: var(--ink); font-weight: 600; }
.prose a { color: var(--ink); font-weight: 500; text-decoration: underline; text-decoration-color: var(--line); text-underline-offset: 3px; }
.prose a:hover { text-decoration-color: var(--accent); color: var(--accent); }
.prose h2 { font-family: var(--font-display); font-size: 36px; line-height: 1.2; font-weight: 600; color: var(--ink); margin-top: 80px; letter-spacing: -0.012em; }
.prose h3 { font-family: var(--font-display); font-size: 24px; line-height: 1.3; font-weight: 600; color: var(--ink); margin-top: 48px; }
.prose h4 { font-size: 18px; font-weight: 600; color: var(--ink); margin-top: 32px; }
.prose h2 + *, .prose h3 + *, .prose h4 + * { margin-top: 16px; }
.heading-anchor { margin-left: 0.4em; font-weight: 400; color: var(--meta); text-decoration: none !important; opacity: 0; transition: opacity 120ms; }
.prose h2:hover .heading-anchor, .prose h3:hover .heading-anchor, .heading-anchor:focus { opacity: 1; }
.prose ul, .prose ol { padding-left: 1.4em; color: var(--text-soft); }
.prose li + li { margin-top: 8px; }
.prose li > p + p { margin-top: 8px; }
.prose blockquote { border-left: 2px solid var(--ink); padding-left: 20px; color: var(--ink); font-size: 18px; line-height: 30px; }
.prose blockquote p { color: inherit; }
.prose hr { border: 0; border-top: 1px dashed var(--line); margin-top: 48px; margin-bottom: 48px; }
.prose img { border: 1px solid var(--line-soft); }
.prose figure { margin: 0; }
.prose figcaption { margin-top: 10px; font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.3px; text-transform: uppercase; color: var(--meta); }
.prose code { font-family: var(--font-mono); font-size: 14px; }
.prose :not(pre) > code { background: var(--inline-code-bg); border: 1px solid var(--line-soft); border-radius: 4px; padding: 1px 6px; color: var(--ink); }
.prose pre { position: relative; overflow-x: auto; padding: 20px; border: 1px solid var(--code-border); border-radius: 6px; background: var(--code-bg) !important; font-size: 14px; line-height: 22px; }
.prose pre code { display: block; min-width: 100%; }
.prose .shiki span { color: var(--shiki-light); }
[data-theme="dark"] .prose .shiki span { color: var(--shiki-dark); }
.code-copy { position: absolute; top: 10px; right: 10px; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.3px; text-transform: uppercase; color: var(--meta); background: var(--bg); border: 1px dashed var(--line); border-radius: 4px; padding: 4px 8px; opacity: 0; transition: opacity 120ms; }
.prose pre:hover .code-copy, .code-copy:focus { opacity: 1; }
.prose table { width: 100%; border-collapse: collapse; font-size: 15px; line-height: 24px; }
.prose th, .prose td { border-bottom: 1px dashed var(--line); padding: 10px 12px; text-align: left; vertical-align: top; }
.prose th { font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.3px; text-transform: uppercase; color: var(--meta); font-weight: 500; }
.prose .callout { border: 1px dashed var(--line); border-left: 3px solid var(--accent); padding: 16px 20px; background: var(--bg-muted); }
.prose .callout-title { font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.3px; text-transform: uppercase; color: var(--accent); margin-bottom: 6px; }
.prose .callout > * + * { margin-top: 10px; }
.prose .callout-warning, .prose .callout-caution { border-left-color: #d97706; }
.prose .callout-warning .callout-title, .prose .callout-caution .callout-title { color: #d97706; }
.prose .callout-tip { border-left-color: #16a34a; }
.prose .callout-tip .callout-title { color: #16a34a; }
.prose .footnotes { margin-top: 64px; padding-top: 24px; border-top: 1px dashed var(--line); font-size: 14px; line-height: 22px; }
.prose .footnotes h2 { font-size: 12px; font-family: var(--font-mono); letter-spacing: 0.3px; text-transform: uppercase; color: var(--meta); margin-top: 0; }
.prose iframe, .prose video { width: 100%; border: 1px solid var(--line-soft); }
.toc-nav a { display: block; padding: 5px 0 5px 12px; border-left: 1px dashed var(--line); font-size: 13px; line-height: 18px; color: var(--meta); }
.toc-nav a[data-depth="3"] { padding-left: 24px; }
.toc-nav a:hover, .toc-nav a[aria-current="true"] { color: var(--ink); border-left-color: var(--ink); }
```

- [ ] **Step 2: Write the client islands**

`components/article/toc-nav.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';
import type { TocItem } from '@/lib/posts/types';

export function TocNav({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState<string>(items[0]?.id ?? '');
  useEffect(() => {
    const headings = items.map((i) => document.getElementById(i.id)).filter((el): el is HTMLElement => !!el);
    if (!headings.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 },
    );
    headings.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [items]);
  if (!items.length) return null;
  return (
    <nav aria-label="On this page" className="toc-nav">
      <p className="eyebrow mb-3">On this page</p>
      {items.map((i) => (
        <a key={i.id} href={`#${i.id}`} data-depth={i.depth} aria-current={active === i.id ? 'true' : undefined}>{i.text}</a>
      ))}
    </nav>
  );
}
```

`components/article/code-copy.tsx`:
```tsx
'use client';
import { useEffect } from 'react';

/** Adds a copy button to every <pre> inside .prose. Pure enhancement; markup works without it. */
export function CodeCopy() {
  useEffect(() => {
    const pres = Array.from(document.querySelectorAll<HTMLPreElement>('.prose pre'));
    const cleanups = pres.map((pre) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'code-copy';
      btn.textContent = 'Copy';
      btn.setAttribute('aria-label', 'Copy code');
      const onClick = async () => {
        await navigator.clipboard.writeText(pre.querySelector('code')?.innerText ?? pre.innerText);
        btn.textContent = 'Copied';
        setTimeout(() => (btn.textContent = 'Copy'), 1500);
      };
      btn.addEventListener('click', onClick);
      pre.appendChild(btn);
      return () => { btn.removeEventListener('click', onClick); btn.remove(); };
    });
    return () => cleanups.forEach((c) => c());
  }, []);
  return null;
}
```

`components/article/share-row.tsx`:
```tsx
'use client';
import { useState } from 'react';

export function ShareRow({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  const links = [
    { label: 'X', href: `https://x.com/intent/post?text=${enc(title)}&url=${enc(url)}` },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
    { label: 'Hacker News', href: `https://news.ycombinator.com/submitlink?u=${enc(url)}&t=${enc(title)}` },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
      <span className="eyebrow">Share</span>
      {links.map((l) => <a key={l.label} href={l.href} target="_blank" rel="noopener" className="link-hover">{l.label}</a>)}
      <button type="button" className="link-hover" onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Write the server components**

`components/article/article-header.tsx`:
```tsx
import Image from 'next/image';
import { AuthorChip } from '@/components/posts/author-chip';
import { PostDate } from '@/components/posts/post-date';
import type { PostFull } from '@/lib/posts/types';
import type { Settings } from '@/lib/settings';
import { ShareRow } from './share-row';

export function ArticleHeader({ post, settings, url }: { post: PostFull; settings: Settings; url: string }) {
  return (
    <header>
      <PostDate iso={post.publishedAt} readingMinutes={post.readingMinutes} />
      <h1 className="h-display mt-5 text-[32px] font-medium leading-[1.1] md:text-[42px]">{post.title}</h1>
      {post.subtitle && <p className="mt-4 text-[20px] leading-[30px] text-text-soft">{post.subtitle}</p>}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <AuthorChip settings={settings} size={36} />
        <ShareRow url={url} title={post.title} />
      </div>
      {post.coverPath && (
        <figure className="mt-10">
          <Image src={post.coverPath} alt={post.coverAlt} width={post.coverWidth ?? 1440} height={post.coverHeight ?? 810} sizes="(min-width: 1024px) 930px, 100vw" priority className="w-full border border-line-soft" />
        </figure>
      )}
    </header>
  );
}
```

`components/article/article-body.tsx`:
```tsx
import { CodeCopy } from './code-copy';

export function ArticleBody({ html }: { html: string }) {
  return (
    <>
      <div className="prose mt-12" dangerouslySetInnerHTML={{ __html: html }} />
      <CodeCopy />
    </>
  );
}
```

`components/article/prev-next.tsx`:
```tsx
import Link from 'next/link';
import type { PostSummary } from '@/lib/posts/types';

export function PrevNext({ older, newer }: { older: PostSummary | null; newer: PostSummary | null }) {
  if (!older && !newer) return null;
  return (
    <nav aria-label="Adjacent posts" className="dashed-t mt-16 grid gap-6 pt-8 md:grid-cols-2">
      <div>{newer && (<><p className="eyebrow">Newer</p><Link href={`/${newer.slug}`} rel="next" className="link-hover h-display mt-2 block text-[18px] font-medium">{newer.title}</Link></>)}</div>
      <div className="md:text-right">{older && (<><p className="eyebrow">Older</p><Link href={`/${older.slug}`} rel="prev" className="link-hover h-display mt-2 block text-[18px] font-medium">{older.title}</Link></>)}</div>
    </nav>
  );
}
```

`components/article/more-writing.tsx`:
```tsx
import { PostGrid } from '@/components/posts/post-grid';
import type { PostSummary } from '@/lib/posts/types';
import type { Settings } from '@/lib/settings';

export function MoreWriting({ posts, settings }: { posts: PostSummary[]; settings: Settings }) {
  if (!posts.length) return null;
  return (
    <section className="dashed-t mt-16 pt-6">
      <p className="eyebrow">More writing</p>
      <PostGrid posts={posts} settings={settings} />
    </section>
  );
}
```

- [ ] **Step 4: Write the article route**

`app/[slug]/page.tsx`:
```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { ArticleBody } from '@/components/article/article-body';
import { ArticleHeader } from '@/components/article/article-header';
import { MoreWriting } from '@/components/article/more-writing';
import { PrevNext } from '@/components/article/prev-next';
import { TocNav } from '@/components/article/toc-nav';
import { JsonLd } from '@/components/seo/json-ld';
import { getDb } from '@/lib/db/client';
import { getAdjacent, getPublishedBySlug, getRedirect, listRelated } from '@/lib/posts/queries';
import { blogPostingJsonLd, breadcrumbJsonLd } from '@/lib/seo/jsonld';
import { getSettings, siteUrl } from '@/lib/settings';
import '@/app/article.css';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const db = getDb();
  const post = getPublishedBySlug(db, slug);
  if (!post) return { title: 'Not found', robots: { index: false } };
  const s = getSettings(db);
  const base = siteUrl();
  const url = `${base}/${post.slug}`;
  const title = post.seoTitle ?? post.title;
  const description = post.seoDescription ?? post.subtitle ?? post.excerpt;
  const og = `${base}/og/${post.slug}.png`;
  return {
    title,
    description,
    alternates: { canonical: post.canonicalUrl ?? url },
    robots: post.noindex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      type: 'article', url, title, description, siteName: s.site_title,
      publishedTime: post.publishedAt, modifiedTime: post.updatedAt, authors: [s.author_url], tags: post.tags,
      images: [{ url: og, width: 1200, height: 630, alt: post.title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [og] },
  };
}

export default async function ArticlePage({ params }: Params) {
  const { slug } = await params;
  const db = getDb();
  const post = getPublishedBySlug(db, slug);
  if (!post) {
    const r = getRedirect(db, `/${slug}`);
    if (r) (r.code === 301 ? permanentRedirect : redirect)(r.toPath);
    notFound();
  }
  const s = getSettings(db);
  const base = siteUrl();
  const url = `${base}/${post.slug}`;
  const { older, newer } = getAdjacent(db, post);
  const related = listRelated(db, post, 2);
  return (
    <div className="page-wide">
      <JsonLd data={[blogPostingJsonLd(post, s, base), breadcrumbJsonLd([{ name: 'Writing', url: `${base}/` }, { name: post.title, url }])]} />
      <div className="grid gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_var(--rail)]">
        <article className="min-w-0 max-w-[var(--page)]">
          <ArticleHeader post={post} settings={s} url={url} />
          <ArticleBody html={post.bodyHtml} />
          {post.tags.length > 0 && (
            <ul className="mt-12 flex flex-wrap gap-2" aria-label="Tags">
              {post.tags.map((t) => (
                <li key={t}><Link href={`/tag/${t}`} className="link-hover inline-block border border-dashed border-line px-3 py-1.5 text-[13px]">{t}</Link></li>
              ))}
            </ul>
          )}
          <PrevNext older={older} newer={newer} />
          <MoreWriting posts={related} settings={s} />
        </article>
        <aside className="hidden lg:block">
          <div className="sticky" style={{ top: 'calc(var(--header-h) + 32px)' }}>
            <TocNav items={post.toc} />
          </div>
        </aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify against a seeded post**

```bash
npm run typecheck && (BLOG_DATA_DIR=/tmp/blog-t7 npm run dev > /tmp/blog-dev.log 2>&1 &) && sleep 6
curl -s localhost:8799/post-3 | grep -oE '<h1[^>]*>[^<]*|"@type":"BlogPosting"|<link rel="canonical" href="[^"]*"|property="og:type" content="[^"]*"|<nav aria-label="On this page"' | sort -u
curl -s -o /dev/null -w '%{http_code}\n' localhost:8799/nope
pkill -f 'next dev -p 8799'
```
Expected: h1 with the title, BlogPosting json-ld, canonical `https://blog.notpritam.in/post-3`, og:type article, TOC nav; `/nope` → 404.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(article): article page with typography, toc, share, prev/next, json-ld"
```

---

### Task 9: Tag pages, tags index, search, about, 404

**Files:**
- Create: `app/tag/[tag]/page.tsx`, `app/tags/page.tsx`, `app/search/page.tsx`, `app/about/page.tsx`, `app/not-found.tsx`

**Interfaces:**
- Consumes: `listPublished({tag})`, `listTags`, `searchPublished`, `collectionPageJsonLd`, `personJsonLd`, `PostGrid`, `SearchForm`.

- [ ] **Step 1: Tag page and tags index**

`app/tag/[tag]/page.tsx`:
```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PostGrid } from '@/components/posts/post-grid';
import { JsonLd } from '@/components/seo/json-ld';
import { getDb } from '@/lib/db/client';
import { listPublished } from '@/lib/posts/queries';
import { collectionPageJsonLd } from '@/lib/seo/jsonld';
import { getSettings, siteUrl } from '@/lib/settings';

export const dynamic = 'force-dynamic';
type Params = { params: Promise<{ tag: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { tag } = await params;
  const t = decodeURIComponent(tag);
  return { title: `Tagged “${t}”`, description: `Writing tagged ${t}.`, alternates: { canonical: `/tag/${t}` } };
}

export default async function TagPage({ params }: Params) {
  const { tag } = await params;
  const t = decodeURIComponent(tag).toLowerCase();
  const db = getDb();
  const { posts, total } = listPublished(db, { tag: t, perPage: 100 });
  if (total === 0) notFound();
  const s = getSettings(db);
  const base = siteUrl();
  return (
    <div className="page-wide">
      <JsonLd data={collectionPageJsonLd(`Tagged ${t}`, `${base}/tag/${t}`, posts, s, base)} />
      <section className="dashed-b py-12">
        <p className="eyebrow">Tag</p>
        <h1 className="h-display mt-2 text-[36px] font-semibold">{t}</h1>
        <p className="mt-2 text-text-soft">{total} {total === 1 ? 'post' : 'posts'}</p>
      </section>
      <PostGrid posts={posts} settings={s} />
    </div>
  );
}
```

`app/tags/page.tsx`:
```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { getDb } from '@/lib/db/client';
import { listTags } from '@/lib/posts/queries';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Tags', description: 'Every topic on the blog.', alternates: { canonical: '/tags' } };

export default function TagsPage() {
  const tags = listTags(getDb());
  return (
    <div className="page-wide">
      <section className="dashed-b py-12"><h1 className="h-display text-[36px] font-semibold">Tags</h1></section>
      <ul className="grid gap-x-8 py-8 sm:grid-cols-2 md:grid-cols-3">
        {tags.map((t) => (
          <li key={t.tag} className="dashed-b flex items-baseline justify-between py-3">
            <Link href={`/tag/${t.tag}`} className="link-hover text-[16px]">{t.tag}</Link>
            <span className="eyebrow">{t.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Search page (noindex), about, 404**

`app/search/page.tsx`:
```tsx
import type { Metadata } from 'next';
import { PostGrid } from '@/components/posts/post-grid';
import { SearchForm } from '@/components/site/search-form';
import { getDb } from '@/lib/db/client';
import { searchPublished } from '@/lib/posts/queries';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Search', robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const db = getDb();
  const s = getSettings(db);
  const results = q.trim() ? searchPublished(db, q.trim()) : [];
  return (
    <div className="page-wide">
      <section className="dashed-b py-12">
        <h1 className="h-display text-[36px] font-semibold">Search</h1>
        <div className="mt-6 max-w-[560px]"><SearchForm defaultValue={q} autoFocus /></div>
        {q.trim() && <p className="mt-4 text-text-soft" aria-live="polite">{results.length} {results.length === 1 ? 'result' : 'results'} for “{q}”</p>}
      </section>
      {q.trim() && <PostGrid posts={results} settings={s} />}
    </div>
  );
}
```

`app/about/page.tsx`:
```tsx
import type { Metadata } from 'next';
import Image from 'next/image';
import { JsonLd } from '@/components/seo/json-ld';
import { getDb } from '@/lib/db/client';
import { personJsonLd } from '@/lib/seo/jsonld';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'About', alternates: { canonical: '/about' } };

export default function AboutPage() {
  const s = getSettings(getDb());
  const links = [[s.social_github, 'GitHub'], [s.social_linkedin, 'LinkedIn'], [s.social_x, 'X'], [s.social_youtube, 'YouTube'], [s.author_url, 'Portfolio']].filter(([h]) => h) as [string, string][];
  return (
    <div className="page">
      <JsonLd data={{ '@context': 'https://schema.org', ...personJsonLd(s) }} />
      <section className="py-16">
        <Image src={s.author_avatar} alt={s.author_name} width={96} height={96} className="rounded-full" priority />
        <h1 className="h-display mt-6 text-[36px] font-semibold">{s.author_name}</h1>
        <p className="mt-4 max-w-[60ch] text-[18px] leading-[30px] text-text-soft">{s.author_bio}</p>
        <ul className="mt-8 flex flex-wrap gap-4 text-[15px]">
          {links.map(([href, label]) => <li key={href}><a href={href} rel="me noopener" target="_blank" className="link-hover underline decoration-line underline-offset-4">{label}</a></li>)}
        </ul>
      </section>
    </div>
  );
}
```

`app/not-found.tsx`:
```tsx
import Link from 'next/link';
import { SearchForm } from '@/components/site/search-form';

export default function NotFound() {
  return (
    <div className="page py-24">
      <p className="eyebrow">404</p>
      <h1 className="h-display mt-3 text-[36px] font-semibold">That page isn’t here.</h1>
      <p className="mt-3 max-w-[50ch] text-text-soft">It may have moved, or the link was wrong. Try a search, or go back to <Link href="/" className="underline">the writing</Link>.</p>
      <div className="mt-8 max-w-[480px]"><SearchForm /></div>
    </div>
  );
}
```

- [ ] **Step 3: Verify and commit**

```bash
npm run typecheck && (BLOG_DATA_DIR=/tmp/blog-t7 npm run dev > /tmp/blog-dev.log 2>&1 &) && sleep 6
for u in /tag/tools /tags '/search?q=post' /about /tag/none; do printf '%s ' "$u"; curl -s -o /dev/null -w '%{http_code}\n' "localhost:8799$u"; done
curl -s 'localhost:8799/search?q=post' | grep -o 'name="robots" content="[^"]*"'
pkill -f 'next dev -p 8799'
git add -A && git commit -m "feat(pages): tag, tags index, search, about, 404"
```
Expected: 200 200 200 200 404; robots `noindex, follow` on search.

---

### Task 10: Sitemap, robots, RSS, JSON Feed, llms.txt, OG images

**Files:**
- Create: `lib/seo/feeds.ts`, `app/sitemap.ts`, `app/robots.ts`, `app/rss.xml/route.ts`, `app/feed.json/route.ts`, `app/llms.txt/route.ts`, `app/og/[slug]/route.tsx`
- Test: `tests/unit/feeds.test.ts`

**Interfaces:**
- Consumes: `listAllPublished`, `listTags`, `getSettings`, `siteUrl`.
- Produces: `buildRss(posts, s, base): string`, `buildJsonFeed(posts, s, base): object`, `buildLlmsTxt(posts, s, base): string`; routes `/rss.xml`, `/feed.json`, `/llms.txt`, `/sitemap.xml`, `/robots.txt`, `/og/<slug>.png`, `/og/site.png`.

- [ ] **Step 1: Write the feeds test**

`tests/unit/feeds.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildJsonFeed, buildLlmsTxt, buildRss } from '@/lib/seo/feeds';
import { SETTING_DEFAULTS } from '@/lib/settings';
import type { PostFull } from '@/lib/posts/types';

const s = { ...SETTING_DEFAULTS };
const post: PostFull = {
  id: 1, slug: 'hello', title: 'Hello & <world>', subtitle: 'Sub', excerpt: 'Ex', coverPath: '/uploads/c.png', coverAlt: '', coverWidth: 10, coverHeight: 5,
  tags: ['tools'], readingMinutes: 3, publishedAt: '2026-05-21T19:45:54.777Z', updatedAt: '2026-05-21T19:45:54.777Z', featured: false,
  bodyMd: '# x', bodyHtml: '<p>Body with <a href="/rel">rel link</a> and <img src="/uploads/i.png"></p>', toc: [], wordCount: 3, seoTitle: null, seoDescription: null,
  canonicalUrl: null, noindex: false, status: 'published', createdAt: '2026-05-21T19:45:54.777Z',
};

describe('feeds', () => {
  it('builds valid-looking RSS with escaped titles, absolute links and full content', () => {
    const xml = buildRss([post], s, 'https://b.dev');
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<title>Hello &amp; &lt;world&gt;</title>');
    expect(xml).toContain('<link>https://b.dev/hello</link>');
    expect(xml).toContain('<guid isPermaLink="true">https://b.dev/hello</guid>');
    expect(xml).toContain('<pubDate>Thu, 21 May 2026 19:45:54 GMT</pubDate>');
    expect(xml).toContain('<content:encoded><![CDATA[<p>Body with <a href="https://b.dev/rel">rel link</a> and <img src="https://b.dev/uploads/i.png"></p>]]></content:encoded>');
    expect(xml).toContain('<atom:link href="https://b.dev/rss.xml" rel="self" type="application/rss+xml"/>');
    expect(xml).toContain('<category>tools</category>');
  });
  it('builds JSON Feed 1.1', () => {
    const j = buildJsonFeed([post], s, 'https://b.dev') as { version: string; items: { id: string; url: string; image?: string; tags?: string[] }[] };
    expect(j.version).toBe('https://jsonfeed.org/version/1.1');
    expect(j.items[0]).toMatchObject({ id: 'https://b.dev/hello', url: 'https://b.dev/hello', image: 'https://b.dev/uploads/c.png', tags: ['tools'] });
  });
  it('builds llms.txt', () => {
    const t = buildLlmsTxt([post], s, 'https://b.dev');
    expect(t).toContain('# Pritam Sharma · Blog');
    expect(t).toContain('- [Hello & <world>](https://b.dev/hello): Sub');
    expect(t).toContain('https://b.dev/hello.md');
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run tests/unit/feeds.test.ts` → FAIL.

- [ ] **Step 3: Write feeds.ts**

`lib/seo/feeds.ts`:
```ts
import type { PostFull } from '@/lib/posts/types';
import type { Settings } from '@/lib/settings';

export function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Rewrites root-relative href/src to absolute for feed readers. */
export function absolutizeHtml(html: string, base: string): string {
  return html.replace(/(href|src)="\/(?!\/)/g, `$1="${base}/`);
}

export function buildRss(posts: PostFull[], s: Settings, base: string): string {
  const items = posts.map((p) => `
    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${base}/${p.slug}</link>
      <guid isPermaLink="true">${base}/${p.slug}</guid>
      <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>
      <dc:creator>${escapeXml(s.author_name)}</dc:creator>
      <description>${escapeXml(p.subtitle || p.excerpt)}</description>
      ${p.tags.map((t) => `<category>${escapeXml(t)}</category>`).join('')}
      ${p.coverPath ? `<enclosure url="${base}${p.coverPath}" type="image/${p.coverPath.split('.').pop() === 'jpg' ? 'jpeg' : p.coverPath.split('.').pop()}" length="0"/>` : ''}
      <content:encoded><![CDATA[${absolutizeHtml(p.bodyHtml, base).replace(/]]>/g, ']]]]><![CDATA[>')}]]></content:encoded>
    </item>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(s.site_title)} · Blog</title>
    <link>${base}</link>
    <description>${escapeXml(s.site_description)}</description>
    <language>en</language>
    <lastBuildDate>${new Date(posts[0]?.updatedAt ?? Date.now()).toUTCString()}</lastBuildDate>
    <atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml"/>
    <image><url>${base}${s.author_avatar}</url><title>${escapeXml(s.site_title)}</title><link>${base}</link></image>${items}
  </channel>
</rss>`;
}

export function buildJsonFeed(posts: PostFull[], s: Settings, base: string): Record<string, unknown> {
  return {
    version: 'https://jsonfeed.org/version/1.1',
    title: `${s.site_title} · Blog`,
    home_page_url: base,
    feed_url: `${base}/feed.json`,
    description: s.site_description,
    language: 'en',
    icon: `${base}${s.author_avatar}`,
    authors: [{ name: s.author_name, url: s.author_url, avatar: `${base}${s.author_avatar}` }],
    items: posts.map((p) => ({
      id: `${base}/${p.slug}`,
      url: `${base}/${p.slug}`,
      title: p.title,
      summary: p.subtitle || p.excerpt,
      content_html: absolutizeHtml(p.bodyHtml, base),
      date_published: p.publishedAt,
      date_modified: p.updatedAt,
      ...(p.coverPath && { image: `${base}${p.coverPath}` }),
      tags: p.tags,
      authors: [{ name: s.author_name, url: s.author_url }],
    })),
  };
}

export function buildLlmsTxt(posts: PostFull[], s: Settings, base: string): string {
  const lines = [
    `# ${s.site_title} · Blog`,
    '',
    `> ${s.site_description}`,
    '',
    `Author: ${s.author_name} (${s.author_url}). Every post is also available as Markdown by appending \`.md\` to its URL.`,
    '',
    '## Posts',
    '',
    ...posts.map((p) => `- [${p.title}](${base}/${p.slug}): ${p.subtitle || p.excerpt} (Markdown: ${base}/${p.slug}.md)`),
    '',
    '## Feeds',
    '',
    `- [RSS](${base}/rss.xml)`,
    `- [JSON Feed](${base}/feed.json)`,
    `- [Sitemap](${base}/sitemap.xml)`,
  ];
  return lines.join('\n') + '\n';
}
```

- [ ] **Step 4: Write the routes**

`app/rss.xml/route.ts`:
```ts
import { getDb } from '@/lib/db/client';
import { listAllPublished } from '@/lib/posts/queries';
import { buildRss } from '@/lib/seo/feeds';
import { getSettings, siteUrl } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export function GET() {
  const db = getDb();
  const xml = buildRss(listAllPublished(db), getSettings(db), siteUrl());
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=600' } });
}
```

`app/feed.json/route.ts`:
```ts
import { getDb } from '@/lib/db/client';
import { listAllPublished } from '@/lib/posts/queries';
import { buildJsonFeed } from '@/lib/seo/feeds';
import { getSettings, siteUrl } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export function GET() {
  const db = getDb();
  return Response.json(buildJsonFeed(listAllPublished(db), getSettings(db), siteUrl()), {
    headers: { 'Content-Type': 'application/feed+json; charset=utf-8', 'Cache-Control': 'public, max-age=600' },
  });
}
```

`app/llms.txt/route.ts`:
```ts
import { getDb } from '@/lib/db/client';
import { listAllPublished } from '@/lib/posts/queries';
import { buildLlmsTxt } from '@/lib/seo/feeds';
import { getSettings, siteUrl } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export function GET() {
  const db = getDb();
  return new Response(buildLlmsTxt(listAllPublished(db), getSettings(db), siteUrl()), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=600' },
  });
}
```

Also serve each post as Markdown (referenced by llms.txt and useful to agents): create `app/[slug].md/route.ts`? Next cannot route a dotted dynamic segment, so add the file `app/md/[slug]/route.ts` and a rewrite in `next.config.ts` — `async rewrites() { return [{ source: '/:slug.md', destination: '/md/:slug' }]; }` — with:

`app/md/[slug]/route.ts`:
```ts
import { getDb } from '@/lib/db/client';
import { getPublishedBySlug } from '@/lib/posts/queries';
import { siteUrl } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const post = getPublishedBySlug(getDb(), slug);
  if (!post) return new Response('Not found', { status: 404 });
  const front = `---\ntitle: "${post.title.replace(/"/g, '\\"')}"\n${post.subtitle ? `subtitle: "${post.subtitle.replace(/"/g, '\\"')}"\n` : ''}date: ${post.publishedAt}\nurl: ${siteUrl()}/${post.slug}\ntags: [${post.tags.join(', ')}]\n---\n\n`;
  return new Response(front + `# ${post.title}\n\n` + post.bodyMd, { headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'X-Robots-Tag': 'noindex' } });
}
```

`app/sitemap.ts`:
```ts
import type { MetadataRoute } from 'next';
import { getDb } from '@/lib/db/client';
import { listAllPublished, listTags } from '@/lib/posts/queries';
import { siteUrl } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  const db = getDb();
  const base = siteUrl();
  const posts = listAllPublished(db);
  const newest = posts[0]?.updatedAt ?? new Date().toISOString();
  return [
    { url: `${base}/`, lastModified: newest, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/about`, lastModified: newest, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/tags`, lastModified: newest, changeFrequency: 'weekly', priority: 0.4 },
    ...posts.map((p) => ({ url: `${base}/${p.slug}`, lastModified: p.updatedAt, changeFrequency: 'monthly' as const, priority: 0.8 })),
    ...listTags(db).map((t) => ({ url: `${base}/tag/${t.tag}`, lastModified: newest, changeFrequency: 'weekly' as const, priority: 0.4 })),
  ];
}
```

`app/robots.ts`:
```ts
import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/preview', '/search'] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
```

- [ ] **Step 5: Write the OG image route**

`app/og/[slug]/route.tsx`:
```tsx
import fs from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { getDb } from '@/lib/db/client';
import { getPublishedBySlug } from '@/lib/posts/queries';
import { formatDate } from '@/lib/format';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

async function font(pkg: string, file: string) {
  return fs.readFile(path.join(process.cwd(), 'node_modules', pkg, 'files', file));
}

async function avatarDataUrl(): Promise<string | null> {
  try {
    const buf = await fs.readFile(path.join(process.cwd(), 'public', 'avatar.jpg'));
    return `data:image/jpeg;base64,${buf.toString('base64')}`;
  } catch { return null; }
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await ctx.params;
  const slug = raw.replace(/\.png$/, '');
  const db = getDb();
  const s = getSettings(db);
  const post = slug === 'site' ? null : getPublishedBySlug(db, slug);
  if (slug !== 'site' && !post) return new Response('Not found', { status: 404 });

  const [tight, mono, avatar] = await Promise.all([
    font('@fontsource/inter-tight', 'inter-tight-latin-600-normal.woff'),
    font('@fontsource/jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff'),
    avatarDataUrl(),
  ]);
  const title = post ? post.title : `${s.site_title} · Blog`;
  const eyebrow = post ? `${formatDate(post.publishedAt)}  ·  ${post.readingMinutes} MIN READ` : s.site_tagline.toUpperCase();
  const size = title.length > 90 ? 44 : title.length > 60 ? 52 : 64;
  const host = new URL(process.env.SITE_URL ?? 'https://blog.notpritam.in').host;

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#ffffff', color: '#111111', padding: 64, fontFamily: 'InterTight' }}>
        <div style={{ position: 'absolute', inset: 24, border: '2px dashed #d4d4d4' }} />
        <div style={{ position: 'absolute', left: 0, top: 0, width: 14, height: 630, background: s.accent }} />
        <div style={{ display: 'flex', fontFamily: 'JetBrainsMono', fontSize: 22, letterSpacing: 1, color: '#707070', textTransform: 'uppercase' }}>{eyebrow}</div>
        <div style={{ display: 'flex', fontSize: size, lineHeight: 1.1, fontWeight: 600, letterSpacing: -1, maxWidth: 1040 }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 26 }}>
            {avatar && <img src={avatar} width={48} height={48} style={{ borderRadius: 999 }} alt="" />}
            <span>{s.author_name}</span>
          </div>
          <div style={{ display: 'flex', fontFamily: 'JetBrainsMono', fontSize: 22, color: '#707070' }}>{host}</div>
        </div>
      </div>
    ),
    {
      width: 1200, height: 630,
      fonts: [{ name: 'InterTight', data: tight, weight: 600, style: 'normal' }, { name: 'JetBrainsMono', data: mono, weight: 400, style: 'normal' }],
      headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' },
    },
  );
}
```
If `@fontsource/inter-tight/files/inter-tight-latin-600-normal.woff` does not exist in the installed version, run `ls node_modules/@fontsource/inter-tight/files | grep latin-600` and use the listed `.woff` name (Satori needs woff/ttf, not woff2).

- [ ] **Step 6: Test and verify all routes**

```bash
npx vitest run && npm run typecheck && (BLOG_DATA_DIR=/tmp/blog-t7 npm run dev > /tmp/blog-dev.log 2>&1 &) && sleep 6
for u in /rss.xml /feed.json /llms.txt /sitemap.xml /robots.txt /og/post-3.png /og/site.png /post-3.md; do printf '%-16s ' "$u"; curl -s -o /tmp/out -w '%{http_code} %{content_type}\n' "localhost:8799$u"; done
head -c 300 /tmp/out; file /tmp/out
curl -s localhost:8799/sitemap.xml | grep -c '<url>'
pkill -f 'next dev -p 8799'
```
Expected: all 200 with matching content types (`application/rss+xml`, `application/feed+json`, `text/plain`, `application/xml`, `text/plain`, `image/png` ×2, `text/markdown`); sitemap has 3 + 12 + 2 = 17 urls. Open `/og/post-3.png` in a browser (`bb connect expose 8799`) to eyeball the card.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(seo): sitemap, robots, rss, json feed, llms.txt, markdown route, og images"
```

---

### Task 11: Hashnode importer and re-render script

**Files:**
- Create: `scripts/hashnode.ts` (pure helpers), `scripts/import-hashnode.ts`, `scripts/rerender.ts`
- Test: `tests/unit/hashnode.test.ts`

**Interfaces:**
- Consumes: `upsertPost`, `fetchToUpload`, `getDb`.
- Produces: `stripLeadingTitle(md, title): string`, `extractPageMeta(html): { cover: string | null; published: string | null; modified: string | null; description: string | null }`, `rewriteImages(md, map): string`, `HASHNODE_POSTS` table, `npm run import:hashnode`, `npm run rerender`.

Facts verified on 2026-09-18: Hashnode serves Markdown at `https://blog.notpritam.in/<slug>.md`; the export starts with a `# Title` line (sometimes repeated twice); in-body images point at `cdn.hashnode.com`; the page HTML carries `<meta property="og:image">` (cover), `"datePublished"`/`"dateModified"` in JSON-LD, and `<meta name="description">`.

- [ ] **Step 1: Write the failing test**

`tests/unit/hashnode.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { extractPageMeta, rewriteImages, stripLeadingTitle } from '@/scripts/hashnode';

describe('hashnode helpers', () => {
  it('strips one or two leading H1 lines equal to the title', () => {
    const t = 'How We Built It';
    expect(stripLeadingTitle('# How We Built It\n\n# How We Built It\n\n*Intro*\n', t)).toBe('*Intro*\n');
    expect(stripLeadingTitle('# How We Built It\n\nBody', t)).toBe('Body');
    expect(stripLeadingTitle('# Different heading\n\nBody', t)).toBe('# Different heading\n\nBody');
    expect(stripLeadingTitle("# I got tired of Claude's diagrams.\n\nBody", "I got tired of Claude's diagrams.")).toBe('Body');
  });
  it('extracts cover, dates and description from page html', () => {
    const html = `<meta name="description" content="Desc &amp; more"><meta property="og:image" content="https://cdn.hashnode.com/x.png"><script type="application/ld+json">{"datePublished":"2026-05-21T19:45:54.777Z","dateModified":"2026-05-22T00:00:00.000Z"}</script>`;
    expect(extractPageMeta(html)).toEqual({ cover: 'https://cdn.hashnode.com/x.png', published: '2026-05-21T19:45:54.777Z', modified: '2026-05-22T00:00:00.000Z', description: 'Desc & more' });
    expect(extractPageMeta('')).toEqual({ cover: null, published: null, modified: null, description: null });
  });
  it('rewrites image urls by map', () => {
    const md = '![a](https://cdn.hashnode.com/a.png) and ![b](https://cdn.hashnode.com/b.png "t")';
    const out = rewriteImages(md, new Map([['https://cdn.hashnode.com/a.png', '/uploads/2026/09/aa-a.png']]));
    expect(out).toBe('![a](/uploads/2026/09/aa-a.png) and ![b](https://cdn.hashnode.com/b.png "t")');
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run tests/unit/hashnode.test.ts` → FAIL.

- [ ] **Step 3: Write the helpers**

`scripts/hashnode.ts`:
```ts
export const HASHNODE_HOST = 'https://blog.notpritam.in';

/** The four posts to migrate, with data captured from Hashnode on 2026-09-18. Tags were chosen to fit the blog's topics. */
export const HASHNODE_POSTS: { slug: string; subtitle: string; tags: string[]; coverAlt: string }[] = [
  {
    slug: 'i-run-my-whole-mac-off-an-external-ssd-and-300-lines-of-bash-keep-it-from-breaking-when-i-unplug-it',
    subtitle: 'Offline mode for your external drive: when the cable slips, your folders fail over to a real local copy and merge back when the drive returns — without ever overwriting a file.',
    tags: ['macos', 'bash', 'tools'],
    coverAlt: 'Limpet: your external drive, finally unbreakable',
  },
  {
    slug: 'i-got-tired-of-claude-s-misaligned-ascii-diagrams-so-i-built-claude-canvas',
    subtitle: "Why LLMs can't draw, and how to give Claude a real canvas.",
    tags: ['claude', 'agents', 'tools'],
    coverAlt: 'claude-canvas: an interactive diagram canvas driven by Claude',
  },
  {
    slug: 'how-we-built-a-no-code-landing-page-editor-that-ships-static-pages-in-minutes',
    subtitle: 'We automated ourselves out of changing hex codes for a living.',
    tags: ['react', 'no-code', 'web'],
    coverAlt: 'A no-code landing page editor that ships static pages',
  },
  {
    slug: 'award-winning-marquee-animation-with-framer-motion',
    subtitle: '',
    tags: ['framer-motion', 'react', 'animation', 'frontend'],
    coverAlt: 'Marquee animation built with Framer Motion',
  },
];

function decodeEntities(s: string): string {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'");
}

export function stripLeadingTitle(md: string, title: string): string {
  let out = md.replace(/^﻿/, '');
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 2; i++) {
    const m = /^#\s+(.+?)\s*\r?\n(?:\r?\n)*/.exec(out);
    if (!m || norm(m[1]) !== norm(title)) break;
    out = out.slice(m[0].length);
  }
  return out;
}

export function extractPageMeta(html: string) {
  const meta = (re: RegExp) => { const m = re.exec(html); return m ? decodeEntities(m[1]) : null; };
  return {
    cover: meta(/<meta property="og:image" content="([^"]+)"/),
    published: meta(/"datePublished":"([^"]+)"/),
    modified: meta(/"dateModified":"([^"]+)"/),
    description: meta(/<meta name="description" content="([^"]*)"/),
  };
}

export function extractTitle(md: string): string | null {
  const m = /^#\s+(.+?)\s*$/m.exec(md);
  return m ? m[1].trim() : null;
}

export function collectRemoteImages(md: string): string[] {
  return [...new Set([...md.matchAll(/!\[[^\]]*\]\((https:\/\/cdn\.hashnode\.com\/[^)\s]+)(?:\s+"[^"]*")?\)/g)].map((m) => m[1]))];
}

export function rewriteImages(md: string, map: Map<string, string>): string {
  let out = md;
  for (const [from, to] of map) out = out.split(`](${from}`).join(`](${to}`);
  return out;
}
```

- [ ] **Step 4: Write the import and rerender scripts**

`scripts/import-hashnode.ts`:
```ts
import { getDb } from '@/lib/db/client';
import { fetchToUpload } from '@/lib/media/store';
import { upsertPost } from '@/lib/posts/write';
import { collectRemoteImages, extractPageMeta, extractTitle, HASHNODE_HOST, HASHNODE_POSTS, rewriteImages, stripLeadingTitle } from './hashnode';

async function text(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'user-agent': 'blog-importer/1.0' } });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.text();
}

async function main() {
  const db = getDb();
  for (const entry of HASHNODE_POSTS) {
    const [md, html] = await Promise.all([text(`${HASHNODE_HOST}/${entry.slug}.md`), text(`${HASHNODE_HOST}/${entry.slug}`)]);
    const title = extractTitle(md);
    if (!title) throw new Error(`No H1 in ${entry.slug}.md`);
    const meta = extractPageMeta(html);
    if (!meta.published) throw new Error(`No datePublished for ${entry.slug}`);
    let body = stripLeadingTitle(md, title);

    const map = new Map<string, string>();
    for (const url of collectRemoteImages(body)) {
      const stored = await fetchToUpload(db, url, { createdBy: 'import:hashnode' });
      map.set(url, stored.path);
    }
    body = rewriteImages(body, map);

    let cover: { path: string; width: number | null; height: number | null } | null = null;
    if (meta.cover) cover = await fetchToUpload(db, meta.cover, { alt: entry.coverAlt, createdBy: 'import:hashnode' });

    const id = await upsertPost(
      db,
      {
        slug: entry.slug, title, subtitle: entry.subtitle, bodyMd: body, tags: entry.tags,
        coverPath: cover?.path ?? null, coverAlt: entry.coverAlt, coverWidth: cover?.width ?? null, coverHeight: cover?.height ?? null,
        status: 'published', publishedAt: meta.published, seoDescription: meta.description, createdBy: 'human',
      },
      { author: 'import:hashnode', note: `Imported from ${HASHNODE_HOST}/${entry.slug}` },
    );
    if (meta.modified && meta.modified > meta.published) {
      db.$sqlite.prepare('UPDATE posts SET updated_at = ? WHERE id = ?').run(meta.modified, id);
    } else {
      db.$sqlite.prepare('UPDATE posts SET updated_at = published_at WHERE id = ?').run(id);
    }
    console.log(`✓ ${entry.slug} (#${id}, ${map.size} images, cover ${cover ? 'yes' : 'no'})`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
```

`scripts/rerender.ts`:
```ts
import { getDb } from '@/lib/db/client';
import { renderMarkdown } from '@/lib/markdown/render';

/** Re-run the markdown pipeline over every post (after changing the pipeline or its CSS contract). */
async function main() {
  const db = getDb();
  const rows = db.$sqlite.prepare('SELECT id, slug, body_md FROM posts').all() as { id: number; slug: string; body_md: string }[];
  const update = db.$sqlite.prepare('UPDATE posts SET body_html = ?, toc_json = ?, reading_minutes = ?, word_count = ? WHERE id = ?');
  for (const r of rows) {
    const out = await renderMarkdown(r.body_md);
    update.run(out.html, JSON.stringify(out.toc), out.readingMinutes, out.wordCount, r.id);
    console.log(`✓ ${r.slug}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
```

Make `@/` resolve for tsx: add to `tsconfig.json` `"tsx": { "tsconfig": "./tsconfig.json" }` is not a thing; instead, tsx honours `paths` from the nearest tsconfig automatically. If a script still fails to resolve `@/`, run it as `npx tsx --tsconfig tsconfig.json scripts/import-hashnode.ts`, and update the npm scripts to that form.

- [ ] **Step 5: Run the import against the real data dir and check the pages**

```bash
npx vitest run tests/unit/hashnode.test.ts && npm run typecheck
npm run import:hashnode
sqlite3 data/blog.db "select id, slug, status, published_at, reading_minutes, cover_path from posts;" 2>/dev/null || npx tsx -e "import('./lib/db/client').then(m=>console.log(m.getDb().\$sqlite.prepare('select id, slug, status, published_at, reading_minutes, cover_path from posts').all()))"
ls data/uploads/*/*/ | head
npm run dev > /tmp/blog-dev.log 2>&1 & sleep 6
for s in $(npx tsx -e "import('./scripts/hashnode').then(m=>console.log(m.HASHNODE_POSTS.map(p=>p.slug).join(' ')))"); do printf '%s ' "${s:0:30}"; curl -s -o /dev/null -w '%{http_code}\n' "localhost:8799/$s"; done
curl -s localhost:8799 | grep -c 'cdn.hashnode.com'
pkill -f 'next dev -p 8799'
```
Expected: four `✓` lines; four rows, all `published`, covers under `/uploads/…`; each article 200; **zero** `cdn.hashnode.com` references on the home page. Run the import a second time and confirm it prints the same ids (idempotent).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(import): hashnode importer with image rehoming, rerender script"
```

---

### Task 12: End-to-end smoke tests, README, verify script

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/global-setup.ts`, `tests/e2e/public.spec.ts`, `README.md`

**Interfaces:**
- Consumes: everything above. E2E runs against `next dev -p 8799` with `BLOG_DATA_DIR=.e2e-data` seeded by the global setup.

- [ ] **Step 1: Playwright config and seed**

`playwright.config.ts`:
```ts
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
```

`tests/e2e/global-setup.ts`:
```ts
import fs from 'node:fs';
import path from 'node:path';
import { openDb } from '../../lib/db/client';
import { redirects } from '../../lib/db/schema';
import { upsertPost } from '../../lib/posts/write';

export default async function globalSetup() {
  const dir = path.join(process.cwd(), '.e2e-data');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'uploads'), { recursive: true });
  process.env.BLOG_DATA_DIR = dir;
  const db = openDb(path.join(dir, 'blog.db'));
  await upsertPost(db, { slug: 'first-post', title: 'First post about llamas', subtitle: 'A subtitle', bodyMd: '## Why llamas\n\nLlamas are great.\n\n```ts\nconst x = 1\n```\n\n## Conclusion\n\nDone.', tags: ['animals'], status: 'published', publishedAt: '2026-01-01T00:00:00.000Z' });
  await upsertPost(db, { slug: 'second-post', title: 'Second post', bodyMd: 'Alpacas too.', tags: ['animals', 'tools'], status: 'published', publishedAt: '2026-02-01T00:00:00.000Z' });
  await upsertPost(db, { slug: 'hidden-draft', title: 'Hidden', bodyMd: 'secret llamas', status: 'draft' });
  db.insert(redirects).values({ fromPath: '/old-llamas', toPath: '/first-post', code: 301 }).run();
  db.$sqlite.close();
}
```

- [ ] **Step 2: Write the smoke spec**

`tests/e2e/public.spec.ts`:
```ts
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
```

Note: Next's `permanentRedirect` answers **308**, which is the modern permanent redirect; the `redirects.code` column still records 301 as the intent. Keep the test at 308.

- [ ] **Step 3: Install a browser and run**

```bash
npx playwright install chromium
npm run test:e2e
```
Expected: 7 passed. If `playwright install` needs system libraries, run `npx playwright install-deps chromium` (needs sudo) or point Playwright at the system Chrome with `use: { channel: 'chrome' }` in the config.

- [ ] **Step 4: README**

`README.md`:
```markdown
# blog

The blog at https://blog.notpritam.in. Next.js 15 + SQLite. Markdown is the source of truth; HTML is rendered on write.

## Develop

    export PATH=/home/pritam/.nvm/versions/node/v24.20.0/bin:$PATH
    npm ci
    npm run dev              # http://localhost:8799
    npm test                 # unit (vitest)
    npm run test:e2e         # playwright against a seeded .e2e-data/
    npm run verify           # typecheck + unit + build + e2e

Data lives in `data/` (`blog.db`, `uploads/`), or wherever `BLOG_DATA_DIR` points.

## Content

    npm run import:hashnode  # idempotent: pulls the four Hashnode posts, rehomes images
    npm run rerender         # re-run the markdown pipeline over every post

## Routes

`/`, `/page/N`, `/<slug>`, `/<slug>.md`, `/tag/<tag>`, `/tags`, `/search?q=`, `/about`,
`/rss.xml`, `/feed.json`, `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/og/<slug>.png`, `/uploads/…`.

Design and plans: `docs/superpowers/`.
```

- [ ] **Step 5: Full verify and commit**

```bash
npm run verify
git add -A && git commit -m "test(e2e): public smoke suite; docs: README"
```
Expected: typecheck clean, unit green, build succeeds, e2e 7 passed.

- [ ] **Step 6: Preview link for Pritam**

```bash
npm run dev > /tmp/blog-dev.log 2>&1 &
sleep 6 && bb connect expose 8799
```
Post the returned URL in the thread as the milestone 1 preview (real imported posts, real design). Leave the dev server running.

---

## Self-review

- **Spec coverage (M1 scope):** §4 architecture (Task 1, 2), §5 data model (Task 2, full schema), §7 public site — header/home/article/tag/search/about/feeds/OG/preview (Tasks 6–10; `/preview/<token>` is milestone 2 because it needs tokens), §10 SEO — metadata, JSON-LD, sitemap, robots, feeds, llms.txt, OG, redirects, headers, self-hosted fonts, next/image (Tasks 6–10; IndexNow ping and the Lighthouse gate are milestones 3–4 as the spec assigns them), §11 migration (Task 11), §14 unit + e2e (every task; Lighthouse gate in M4).
- **Placeholders:** none; every code step is complete.
- **Type consistency:** `PostSummary/PostFull` (Task 4) are consumed unchanged by Tasks 7–10; `TocItem` is exported from `lib/markdown/toc.ts` and re-exported by `lib/posts/types.ts`; `StoredMedia.path` is a public URL path everywhere; `Db.$sqlite` is used for raw FTS and script queries.
