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
