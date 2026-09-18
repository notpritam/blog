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
    fs.mkdirSync(uploadsDir(), { recursive: true });
    g.__blogDb = openDb(path.join(dataDir(), 'blog.db'));
  }
  return g.__blogDb;
}
