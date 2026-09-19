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

/** Any post by slug regardless of status — for the key-protected preview and operator tooling. */
export function getAnyBySlug(db: Db, slug: string): PostFull | null {
  const r = db.select().from(posts).where(eq(posts.slug, slug)).get();
  if (!r) return null;
  return toFull(r, tagsFor(db, [r.id]).get(r.id) ?? []);
}

export function listAllPosts(db: Db): PostFull[] {
  const rows = db.select().from(posts).orderBy(desc(posts.updatedAt)).all();
  const tags = tagsFor(db, rows.map((r) => r.id));
  return rows.map((r) => toFull(r, tags.get(r.id) ?? []));
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

// Terms are quoted (FTS5 syntax is disabled inside quotes) and prefix-matched; FTS5 ANDs juxtaposed terms.
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

export function listAllPublished(db: Db, opts: { indexableOnly?: boolean } = {}): PostFull[] {
  const where = opts.indexableOnly ? and(published, eq(posts.noindex, false)) : published;
  const rows = db.select().from(posts).where(where).orderBy(desc(posts.publishedAt)).all();
  const tags = tagsFor(db, rows.map((r) => r.id));
  return rows.map((r) => toFull(r, tags.get(r.id) ?? []));
}

export function getRedirect(db: Db, fromPath: string): { toPath: string; code: number } | null {
  const r = db.select({ toPath: redirects.toPath, code: redirects.code }).from(redirects).where(eq(redirects.fromPath, fromPath)).get();
  return r ?? null;
}
