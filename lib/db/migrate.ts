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
