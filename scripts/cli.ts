/**
 * Small operator CLI until the admin UI (milestone 2) exists.
 *
 *   npm run cli -- setting get <key>
 *   npm run cli -- setting set <key> <value>
 *   npm run cli -- redirect add <from-path> <to-path> [301|302]
 *   npm run cli -- redirect list
 *   npm run cli -- backup [keep=14]
 */
import fs from 'node:fs';
import path from 'node:path';
import { dataDir, getDb } from '@/lib/db/client';
import { redirects } from '@/lib/db/schema';
import { getSettings, SETTING_DEFAULTS, setSetting, type SettingKey } from '@/lib/settings';

function usage(): never {
  console.error(fs.readFileSync(new URL(import.meta.url)).toString().split('*/')[0].replace(/^\/\*\*\n/, '').replace(/^ \* ?/gm, ''));
  process.exit(2);
}

async function main() {
  const [group, cmd, ...rest] = process.argv.slice(2);
  const db = getDb();

  if (group === 'setting' && cmd === 'get' && rest[0]) {
    const key = rest[0] as SettingKey;
    if (!(key in SETTING_DEFAULTS)) throw new Error(`Unknown setting: ${key}`);
    console.log(getSettings(db)[key]);
    return;
  }
  if (group === 'setting' && cmd === 'set' && rest.length >= 2) {
    const key = rest[0] as SettingKey;
    if (!(key in SETTING_DEFAULTS)) throw new Error(`Unknown setting: ${key}. Known: ${Object.keys(SETTING_DEFAULTS).join(', ')}`);
    setSetting(db, key, rest.slice(1).join(' '));
    console.log(`✓ ${key} = ${getSettings(db)[key]}`);
    return;
  }
  if (group === 'redirect' && cmd === 'add' && rest.length >= 2) {
    const [fromPath, toPath, codeRaw] = rest;
    const code = codeRaw ? Number(codeRaw) : 301;
    if (!fromPath.startsWith('/') || !toPath.startsWith('/')) throw new Error('Paths must start with /');
    if (code !== 301 && code !== 302) throw new Error('Code must be 301 or 302');
    db.insert(redirects).values({ fromPath, toPath, code }).onConflictDoUpdate({ target: redirects.fromPath, set: { toPath, code } }).run();
    console.log(`✓ ${fromPath} → ${toPath} (${code})`);
    return;
  }
  if (group === 'redirect' && cmd === 'list') {
    for (const r of db.select().from(redirects).all()) console.log(`${r.code} ${r.fromPath} → ${r.toPath}`);
    return;
  }
  if (group === 'backup') {
    const keep = Number(cmd ?? 14) || 14;
    const dir = path.join(dataDir(), 'backups');
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = path.join(dir, `blog-${stamp}.db`);
    await db.$sqlite.backup(dest);
    const all = fs.readdirSync(dir).filter((f) => /^blog-.*\.db$/.test(f)).sort();
    for (const old of all.slice(0, Math.max(0, all.length - keep))) fs.unlinkSync(path.join(dir, old));
    console.log(`✓ backup ${dest} (${fs.statSync(dest).size} bytes; keeping ${Math.min(all.length, keep)})`);
    return;
  }
  usage();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
