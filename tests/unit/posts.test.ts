import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, type Db } from '@/lib/db/client';
import { upsertPost } from '@/lib/posts/write';
import { getAdjacent, getPublishedBySlug, getRedirect, listAllPublished, listPublished, listRelated, listTags, searchPublished } from '@/lib/posts/queries';
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

describe('upsertPost publishedAt', () => {
  it('sets publishedAt to now when publishing without an explicit date', async () => {
    await upsertPost(db, { slug: 'p', title: 'P', bodyMd: 'x', status: 'published' });
    const p = getPublishedBySlug(db, 'p')!;
    expect(p.publishedAt).toBeTruthy();
    expect(Math.abs(Date.now() - Date.parse(p.publishedAt))).toBeLessThan(5000);
  });
  it('keeps the original publishedAt when updating an already-published post without passing one', async () => {
    await upsertPost(db, { slug: 'p2', title: 'P2', bodyMd: 'x', status: 'published', publishedAt: '2026-01-01T00:00:00.000Z' });
    await upsertPost(db, { slug: 'p2', title: 'P2 updated', bodyMd: 'x2' });
    const p = getPublishedBySlug(db, 'p2')!;
    expect(p.publishedAt).toBe('2026-01-01T00:00:00.000Z');
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
    expect(searchPublished(db, 'alph"a llam*').map((p) => p.slug)).toEqual(['a']); // stray quotes and * are stripped, prefix match still works
    expect(searchPublished(db, 'alpha zzz')).toEqual([]); // AND semantics: every term must match
    expect(searchPublished(db, '')).toEqual([]);
  });
  it('resolves redirects', () => {
    db.insert(redirects).values({ fromPath: '/old', toPath: '/a', code: 301 }).run();
    expect(getRedirect(db, '/old')).toEqual({ toPath: '/a', code: 301 });
    expect(getRedirect(db, '/nope')).toBeNull();
  });
  it('excludes noindex posts from listAllPublished({ indexableOnly: true }) but not from listPublished', async () => {
    await upsertPost(db, { slug: 'e', title: 'Epsilon', bodyMd: 'epsilon body', status: 'published', publishedAt: '2026-04-01T00:00:00.000Z', noindex: true });
    expect(listAllPublished(db).map((p) => p.slug)).toContain('e');
    expect(listAllPublished(db, { indexableOnly: true }).map((p) => p.slug)).not.toContain('e');
    expect(listPublished(db, { perPage: 100 }).posts.map((p) => p.slug)).toContain('e');
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
