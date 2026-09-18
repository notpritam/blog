import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { eq, like } from 'drizzle-orm';
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
  let ext = path.extname(filename).toLowerCase();
  if (ext === '.jpeg') ext = '.jpg'; // canonicalize so photo.jpg and photo.jpeg share one stored file
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
  const dir = path.posix.join(String(now.getUTCFullYear()), String(now.getUTCMonth() + 1).padStart(2, '0'));

  // Dedupe by content hash rather than the exact computed path: identical bytes uploaded
  // under a different filename (or in a different month) must resolve to the same stored
  // file, so match on the `{hash}-...{ext}` filename segment, not the full public path.
  // The LIKE match only proves the *hash* agrees (8 hex chars = 32 bits, so a truncated-hash
  // collision between two different files is unlikely but not impossible) — confirm the byte
  // length too before treating it as a duplicate. If it doesn't match, this is a hash
  // collision with different content: store the new upload under a name suffixed with the
  // colliding row's id so neither file gets overwritten.
  const existing = db.select().from(media).where(like(media.path, `%/${hash}-%${ext}`)).get();
  if (existing && existing.bytes === input.buffer.length) {
    return { id: existing.id, path: existing.path, width: existing.width, height: existing.height, bytes: existing.bytes, mime: existing.mime };
  }

  const filename = existing ? `${hash}-${base}-${existing.id}${ext}` : `${hash}-${base}${ext}`;
  const rel = path.posix.join(dir, filename);
  const publicPath = `/uploads/${rel}`;

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

/**
 * Remote CDNs we import from (notably Hashnode's, which is Cloudinary-backed) do not
 * necessarily return byte-identical content for the same URL on every fetch, so the
 * content-hash dedupe in `saveUpload` cannot be relied on across re-imports. Dedupe by
 * source URL first — a repeat import of the same asset should reuse the stored row,
 * not re-download and mint a second copy — falling back to a fresh download+store
 * (which still dedupes by content hash within *this* fetch) when the URL is new.
 */
export async function fetchToUpload(db: Db, url: string, opts: { alt?: string; createdBy?: string } = {}): Promise<StoredMedia> {
  const existing = db.select().from(media).where(eq(media.sourceUrl, url)).get();
  if (existing) {
    return { id: existing.id, path: existing.path, width: existing.width, height: existing.height, bytes: existing.bytes, mime: existing.mime };
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch ${url} failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  let filename = path.basename(new URL(url).pathname) || 'file';
  if (!path.extname(filename)) {
    const type = res.headers.get('content-type')?.split(';')[0] ?? '';
    const ext = Object.entries(MIME_BY_EXT).find(([, m]) => m === type)?.[0] ?? '.png';
    filename += ext;
  }
  const stored = await saveUpload(db, { buffer, filename, alt: opts.alt, createdBy: opts.createdBy });
  db.$sqlite.prepare('UPDATE media SET source_url = ? WHERE id = ?').run(url, stored.id);
  return stored;
}
