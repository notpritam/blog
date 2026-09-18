import { getDb } from '@/lib/db/client';
import { listAllPublished } from '@/lib/posts/queries';
import { buildRss } from '@/lib/seo/feeds';
import { getSettings, siteUrl } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export function GET() {
  const db = getDb();
  const xml = buildRss(listAllPublished(db), getSettings(db), siteUrl());
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=600' } });
}
