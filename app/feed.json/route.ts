import { getDb } from '@/lib/db/client';
import { listAllPublished } from '@/lib/posts/queries';
import { buildJsonFeed } from '@/lib/seo/feeds';
import { getSettings, siteUrl } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export function GET() {
  const db = getDb();
  return Response.json(buildJsonFeed(listAllPublished(db), getSettings(db), siteUrl()), {
    headers: { 'Content-Type': 'application/feed+json; charset=utf-8', 'Cache-Control': 'public, max-age=600' },
  });
}
