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
