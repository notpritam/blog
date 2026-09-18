import type { MetadataRoute } from 'next';
import { getDb } from '@/lib/db/client';
import { listAllPublished, listTags } from '@/lib/posts/queries';
import { siteUrl } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  const db = getDb();
  const base = siteUrl();
  const posts = listAllPublished(db, { indexableOnly: true });
  const newest = posts[0]?.updatedAt ?? new Date().toISOString();
  return [
    { url: `${base}/`, lastModified: newest, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/about`, lastModified: newest, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/tags`, lastModified: newest, changeFrequency: 'weekly', priority: 0.4 },
    ...posts.map((p) => ({ url: `${base}/${p.slug}`, lastModified: p.updatedAt, changeFrequency: 'monthly' as const, priority: 0.8 })),
    ...listTags(db).map((t) => ({ url: `${base}/tag/${encodeURIComponent(t.tag)}`, lastModified: newest, changeFrequency: 'weekly' as const, priority: 0.4 })),
  ];
}
