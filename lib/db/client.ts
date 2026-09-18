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
  const db = drizzle(sqlite, { schema }) as unknown as Db;
  db.$sqlite = sqlite;
  return db;
}

const g = globalThis as unknown as { __blogDb?: Db };

export function getDb(): Db {
  if (!g.__blogDb) {
    const file = path.join(dataDir(), 'blog.db');
    if (process.env.NODE_ENV === 'production' && !fs.existsSync(file) && process.env.BLOG_ALLOW_EMPTY_DB !== '1') {
      throw new Error(`No database at ${file}. Set BLOG_DATA_DIR to the real data directory, or BLOG_ALLOW_EMPTY_DB=1 to create an empty one.`);
    }
    fs.mkdirSync(uploadsDir(), { recursive: true });
    g.__blogDb = openDb(file);
  }
  return g.__blogDb;
}
