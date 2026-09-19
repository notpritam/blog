import type { Metadata } from 'next';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { PostGrid } from '@/components/posts/post-grid';
import { JsonLd } from '@/components/seo/json-ld';
import { getDb } from '@/lib/db/client';
import { getRedirect, listPublished } from '@/lib/posts/queries';
import { collectionPageJsonLd } from '@/lib/seo/jsonld';
import { getSettings, siteUrl } from '@/lib/settings';

export const dynamic = 'force-dynamic';
type Params = { params: Promise<{ tag: string }> };

function normalizeTag(tag: string) {
  return decodeURIComponent(tag).toLowerCase();
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { tag } = await params;
  const t = normalizeTag(tag);
  return { title: `Tagged “${t}”`, description: `Writing tagged ${t}.`, alternates: { canonical: `/tag/${encodeURIComponent(t)}` } };
}

export default async function TagPage({ params }: Params) {
  const { tag } = await params;
  const t = normalizeTag(tag);
  const db = getDb();
  const { posts, total } = listPublished(db, { tag: t, perPage: 100 });
  if (total === 0) {
    // Old tag slugs (e.g. Hashnode's) can be mapped in the redirects table.
    const r = getRedirect(db, `/tag/${t}`);
    if (r) (r.code === 301 ? permanentRedirect : redirect)(r.toPath);
    notFound();
  }
  const s = getSettings(db);
  const base = siteUrl();
  return (
    <div className="page-wide">
      <JsonLd data={collectionPageJsonLd(`Tagged ${t}`, `${base}/tag/${encodeURIComponent(t)}`, posts, s, base)} />
      <section className="dashed-b py-12">
        <p className="eyebrow">Tag</p>
        <h1 className="h-display mt-2 text-[36px] font-semibold">{t}</h1>
        <p className="mt-2 text-text-soft">{total} {total === 1 ? 'post' : 'posts'}</p>
      </section>
      <PostGrid posts={posts} settings={s} headingLevel="h2" />
    </div>
  );
}
