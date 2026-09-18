import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { openDb, type Db } from '@/lib/db/client';
import { media } from '@/lib/db/schema';
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

  it('does not dedupe different content, even when superficially similar', async () => {
    const bufferA = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#000' } }).png().toBuffer();
    const bufferB = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#fff' } }).png().toBuffer();
    const a = await saveUpload(db, { buffer: bufferA, filename: 'a.png' });
    const b = await saveUpload(db, { buffer: bufferB, filename: 'b.png' });
    expect(a.path).not.toBe(b.path);
    expect(a.bytes).not.toBe(b.bytes);
  });

  it('does not dedupe on a truncated-hash collision with a different byte length', async () => {
    const buffer = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#f00' } }).png().toBuffer();
    const hash8 = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 8);
    const collidingPath = `/uploads/2020/01/${hash8}-x.png`;
    db.insert(media).values({ path: collidingPath, bytes: 1, mime: 'image/png' }).run();

    const m = await saveUpload(db, { buffer, filename: 'x.png' });

    expect(m.path).not.toBe(collidingPath);
    expect(fs.existsSync(path.join(dir, m.path.replace(/^\//, '')))).toBe(true);
  });

  it('normalizes .jpeg to the canonical .jpg extension for dedupe', async () => {
    const buffer = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#0f0' } }).jpeg().toBuffer();
    const a = await saveUpload(db, { buffer, filename: 'a.jpeg' });
    const b = await saveUpload(db, { buffer, filename: 'a.jpg' });
    expect(a.path).toMatch(/\.jpg$/);
    expect(b.path).toBe(a.path);
  });
});
