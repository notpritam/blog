/**
 * Small operator CLI until the admin UI (milestone 2) exists.
 *
 *   npm run cli -- setting get <key>
 *   npm run cli -- setting set <key> <value>
 *   npm run cli -- redirect add <from-path> <to-path> [301|302]
 *   npm run cli -- redirect list
 *   npm run cli -- backup [keep=14]
 *   npm run cli -- post import <file.md> [--status draft|in_review|published]
 *   npm run cli -- post list
 *   npm run cli -- post status <slug> <draft|in_review|changes_requested|approved|published|archived>
 *   npm run cli -- post publish <slug>
 *
 * `post import` reads YAML-ish front matter (title, subtitle, slug, tags, cover, cover_alt,
 * seo_description, status) and uploads local images referenced relative to the file.
 */
import fs from 'node:fs';
import path from 'node:path';
import { dataDir, getDb } from '@/lib/db/client';
import { POST_STATUSES, redirects, type PostStatus } from '@/lib/db/schema';
import { saveUpload } from '@/lib/media/store';
import { getAnyBySlug, listAllPosts } from '@/lib/posts/queries';
import { upsertPost, type PostInput } from '@/lib/posts/write';
import { getSettings, SETTING_DEFAULTS, setSetting, type SettingKey } from '@/lib/settings';
import { slugify } from '@/lib/markdown/slugify';

const AUTHOR = process.env.BLOG_AUTHOR ?? 'agent:claude';

/** Minimal front matter: `key: value` lines between --- fences; tags may be [a, b] or comma-separated. */
export function parseFrontMatter(src: string): { meta: Record<string, string>; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(src);
  if (!m) return { meta: {}, body: src };
  const meta: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i < 1) continue;
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    meta[key] = value;
  }
  return { meta, body: src.slice(m[0].length) };
}

export function parseTags(v: string | undefined): string[] {
  if (!v) return [];
  return v.replace(/^\[|\]$/g, '').split(',').map((t) => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Upload every local image referenced by the Markdown (relative to `baseDir`) and rewrite it to /uploads/... */
async function rehomeLocalImages(db: ReturnType<typeof getDb>, md: string, baseDir: string): Promise<string> {
  const refs = [...md.matchAll(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((m) => m[1]);
  const local = [...new Set(refs.filter((r) => !/^(https?:)?\/\//.test(r) && !r.startsWith('/uploads/') && !r.startsWith('data:')))];
  let out = md;
  for (const ref of local) {
    const abs = path.resolve(baseDir, ref);
    if (!fs.existsSync(abs)) throw new Error(`Image not found: ${ref} (resolved ${abs})`);
    const stored = await saveUpload(db, { buffer: fs.readFileSync(abs), filename: path.basename(abs), createdBy: AUTHOR });
    out = out.replace(new RegExp('\\]\\(' + escapeRegExp(ref) + '(?=[)\\s])', 'g'), () => `](${stored.path}`);
    console.log(`  ↳ ${ref} → ${stored.path}`);
  }
  return out;
}

async function importPost(db: ReturnType<typeof getDb>, file: string, statusFlag?: string): Promise<void> {
  const abs = path.resolve(file);
  const src = fs.readFileSync(abs, 'utf8');
  const { meta, body } = parseFrontMatter(src);
  const title = meta.title ?? /^#\s+(.+)$/m.exec(body)?.[1];
  if (!title) throw new Error('Front matter needs a title (or the body an H1)');
  const h1 = /^#\s+(.+?)\s*\r?\n(?:\r?\n)?/.exec(body);
  const bodyMd = h1 && h1[1].trim() === title.trim() ? body.slice(h1[0].length) : body;
  const slug = meta.slug ?? slugify(title);
  const status = (statusFlag ?? meta.status ?? 'in_review') as PostStatus;
  if (!POST_STATUSES.includes(status)) throw new Error(`Bad status: ${status}`);
  const rehomed = await rehomeLocalImages(db, bodyMd.trim() + '\n', path.dirname(abs));

  let cover: { path: string; width: number | null; height: number | null } | null = null;
  if (meta.cover) {
    if (meta.cover.startsWith('/uploads/')) cover = { path: meta.cover, width: null, height: null };
    else {
      const coverAbs = path.resolve(path.dirname(abs), meta.cover);
      if (!fs.existsSync(coverAbs)) throw new Error(`Cover not found: ${meta.cover}`);
      cover = await saveUpload(db, { buffer: fs.readFileSync(coverAbs), filename: path.basename(coverAbs), alt: meta.cover_alt ?? '', createdBy: AUTHOR });
    }
  }
  const existing = getAnyBySlug(db, slug);
  const input: PostInput = {
    slug, title, subtitle: meta.subtitle ?? '', bodyMd: rehomed, tags: parseTags(meta.tags),
    status, createdBy: existing ? undefined : AUTHOR,
    ...(cover && { coverPath: cover.path, coverAlt: meta.cover_alt ?? '', coverWidth: cover.width, coverHeight: cover.height }),
    ...(meta.seo_description && { seoDescription: meta.seo_description }),
    ...(status === 'published' && !existing?.publishedAt && { publishedAt: new Date().toISOString() }),
  };
  const id = await upsertPost(db, input, { author: AUTHOR, note: `Imported from ${path.relative(process.cwd(), abs)}` });
  const post = getAnyBySlug(db, slug)!;
  console.log(`✓ #${id} ${slug} [${post.status}] ${post.wordCount} words, ${post.readingMinutes} min, tags: ${post.tags.join(', ') || '—'}`);
  const key = process.env.PREVIEW_KEY;
  const base = process.env.SITE_URL ?? 'http://localhost:8799';
  console.log(key ? `  preview: ${base}/preview/${slug}?key=${key}` : '  (set PREVIEW_KEY to get a preview link)');
}


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
  if (group === 'post' && cmd === 'import' && rest[0]) {
    const flagIdx = rest.indexOf('--status');
    const statusFlag = flagIdx >= 0 ? rest[flagIdx + 1] : undefined;
    const files = rest.filter((a, i) => a !== '--status' && (flagIdx < 0 || i !== flagIdx + 1));
    if (files.length === 0) throw new Error('post import: no files given');
    for (const f of files) await importPost(db, f, statusFlag);
    return;
  }
  if (group === 'post' && cmd === 'list') {
    for (const p of listAllPosts(db)) console.log(`${p.status.padEnd(17)} ${p.slug}  (${p.wordCount}w, updated ${p.updatedAt.slice(0, 10)})`);
    return;
  }
  if (group === 'post' && (cmd === 'status' || cmd === 'publish') && rest[0]) {
    const slug = rest[0];
    const status = (cmd === 'publish' ? 'published' : rest[1]) as PostStatus;
    if (!POST_STATUSES.includes(status)) throw new Error(`Bad status: ${status}. One of ${POST_STATUSES.join(', ')}`);
    const post = getAnyBySlug(db, slug);
    if (!post) throw new Error(`No post with slug ${slug}`);
    await upsertPost(db, { slug, title: post.title, subtitle: post.subtitle, excerpt: post.excerpt, bodyMd: post.bodyMd, status, ...(status === 'published' && !post.publishedAt && { publishedAt: new Date().toISOString() }) }, { author: 'human', note: `status → ${status}` });
    console.log(`✓ ${slug} → ${status}${status === 'published' ? `  ${process.env.SITE_URL ?? ''}/${slug}` : ''}`);
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

if (process.argv[1] && /scripts[\\/]cli\.ts$/.test(process.argv[1])) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
