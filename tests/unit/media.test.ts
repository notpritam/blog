import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { openDb, type Db } from '@/lib/db/client';
import { saveUpload } from '@/lib/media/store';

let dir: string;
let db: Db;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-media-'));
  process.env.BLOG_DATA_DIR = dir;
  db = openDb(':memory:');
});
afterEach(() => {
  delete process.env.BLOG_DATA_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('saveUpload', () => {
  it('stores the file under uploads/YYYY/MM with a hashed name and records dimensions', async () => {
    const buffer = await sharp({ create: { width: 40, height: 30, channels: 3, background: '#fff' } }).png().toBuffer();
    const m = await saveUpload(db, { buffer, filename: 'My Cover (final).PNG', alt: 'A cover' });
    expect(m.path).toMatch(/^\/uploads\/\d{4}\/\d{2}\/[0-9a-f]{8}-my-cover-final\.png$/);
    expect(m.width).toBe(40);
    expect(m.height).toBe(30);
    expect(m.mime).toBe('image/png');
    expect(fs.existsSync(path.join(dir, m.path.replace(/^\//, '')))).toBe(true);
    const row = db.$sqlite.prepare('SELECT path, alt, width FROM media').get();
    expect(row).toEqual({ path: m.path, alt: 'A cover', width: 40 });
  });

  it('dedupes identical bytes', async () => {
    const buffer = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#000' } }).png().toBuffer();
    const a = await saveUpload(db, { buffer, filename: 'a.png' });
    const b = await saveUpload(db, { buffer, filename: 'b.png' });
    expect(b.path).toBe(a.path);
  });

  it('rejects unsupported types', async () => {
    await expect(saveUpload(db, { buffer: Buffer.from('hello'), filename: 'x.exe' })).rejects.toThrow(/Unsupported/);
  });
});
