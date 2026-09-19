import { getDb } from '@/lib/db/client';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

/** Serves the IndexNow key file at /<key>.txt (via next.config rewrite) when it matches the configured key. */
export async function GET(_req: Request, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  const configured = getSettings(getDb()).indexnow_key;
  if (!configured || key !== configured) return new Response('Not found', { status: 404 });
  return new Response(configured, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex' } });
}
