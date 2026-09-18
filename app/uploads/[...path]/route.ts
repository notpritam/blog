import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { uploadsDir } from '@/lib/db/client';
import { MEDIA_MIME } from '@/lib/media/store';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params;
  const root = path.resolve(uploadsDir());
  const file = path.resolve(root, ...parts);
  if (!file.startsWith(root + path.sep)) return new Response('Not found', { status: 404 });
  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(file);
  } catch {
    return new Response('Not found', { status: 404 });
  }
  if (!stat.isFile()) return new Response('Not found', { status: 404 });
  const type = MEDIA_MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
  const body = Readable.toWeb(fs.createReadStream(file)) as ReadableStream;
  return new Response(body, {
    headers: {
      'Content-Type': type,
      'Content-Length': String(stat.size),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
