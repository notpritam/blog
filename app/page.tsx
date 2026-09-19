import type { Metadata } from 'next';
import { JsonLd } from '@/components/seo/json-ld';
import { FeaturedPost } from '@/components/posts/featured-post';
import { Pagination } from '@/components/posts/pagination';
import { PostGrid } from '@/components/posts/post-grid';
import { getDb } from '@/lib/db/client';
import { getFeatured, listPublished } from '@/lib/posts/queries';
import { websiteJsonLd } from '@/lib/seo/jsonld';
import { getSettings, siteUrl } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { alternates: { canonical: '/' } };

export default function Home() {
  const db = getDb();
  const s = getSettings(db);
  const featured = getFeatured(db);
  const { posts: rest, total, page, pages } = listPublished(db, { page: 1, perPage: Number(s.posts_per_page) || 10, excludeId: featured?.id });
  return (
    <div className="editorial-home">
      <JsonLd data={websiteJsonLd(s, siteUrl())} />
      {featured ? <FeaturedPost post={featured} selections={rest.slice(0, 3)} total={total + 1} settings={s} /> : (
        <section className="editorial-empty"><h1 className="h-display">{s.site_title}</h1><p>{s.site_tagline}</p><p>No posts yet. Check back soon.</p></section>
      )}
      {rest.length > 0 && (
        <section className="writing-archive" aria-labelledby="writing-title">
          <div className="page-wide">
            <div className="archive-heading dashed-b">
              <div><p className="editorial-section-label">The rest of the notebook</p><h2 id="writing-title">More writing<span className="archive-count">/{String(total).padStart(2, '0')}</span></h2></div>
              <p>{s.site_tagline}</p>
            </div>
            <PostGrid posts={rest} settings={s} />
            <Pagination page={page} pages={pages} />
          </div>
        </section>
      )}
    </div>
  );
}
