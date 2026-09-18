import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { GET } from '@/app/uploads/[...path]/route';

let dir: string;
let fileBytes: Buffer;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-uploads-route-'));
  process.env.BLOG_DATA_DIR = dir;
  fileBytes = Buffer.from([1, 2, 3, 4]);
  fs.mkdirSync(path.join(dir, 'uploads', '2026', '09'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'uploads', '2026', '09', 'abcd1234-x.png'), fileBytes);
});
afterEach(() => {
  delete process.env.BLOG_DATA_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('GET /uploads/[...path]', () => {
  it('serves an existing file with the expected headers', async () => {
    const res = await GET(new Request('http://x/uploads/2026/09/abcd1234-x.png'), {
      params: Promise.resolve({ path: ['2026', '09', 'abcd1234-x.png'] }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('content-length')).toBe(String(fileBytes.length));
    expect(res.headers.get('cache-control')).toContain('immutable');
  });

  it('404s on a path-traversal attempt', async () => {
    const res = await GET(new Request('http://x/uploads/../../blog.db'), {
      params: Promise.resolve({ path: ['..', '..', 'blog.db'] }),
    });
    expect(res.status).toBe(404);
  });

  it('404s when the path resolves to a directory', async () => {
    const res = await GET(new Request('http://x/uploads/2026/09'), {
      params: Promise.resolve({ path: ['2026', '09'] }),
    });
    expect(res.status).toBe(404);
  });

  it('404s on a missing file', async () => {
    const res = await GET(new Request('http://x/uploads/nope.png'), {
      params: Promise.resolve({ path: ['nope.png'] }),
    });
    expect(res.status).toBe(404);
  });
});
