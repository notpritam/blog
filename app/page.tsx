import { JsonLd } from '@/components/seo/json-ld';
import { FeaturedPost } from '@/components/posts/featured-post';
import { Pagination } from '@/components/posts/pagination';
import { PostGrid } from '@/components/posts/post-grid';
import { getDb } from '@/lib/db/client';
import { listPublished } from '@/lib/posts/queries';
import { websiteJsonLd } from '@/lib/seo/jsonld';
import { getSettings, siteUrl } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default function Home() {
  const db = getDb();
  const s = getSettings(db);
  const { posts, page, pages } = listPublished(db, { page: 1, perPage: Number(s.posts_per_page) || 10 });
  const [featured, ...rest] = posts;
  return (
    <div className="page-wide">
      <JsonLd data={websiteJsonLd(s, siteUrl())} />
      <section className="dashed-b py-16">
        <h1 className="h-display text-[36px] font-semibold leading-[1.15]">{s.site_title}</h1>
        <p className="mt-3 max-w-[60ch] text-[18px] leading-[27px] text-text-soft">{s.site_tagline}</p>
      </section>
      {featured ? <FeaturedPost post={featured} settings={s} /> : <p className="py-16 text-text-soft">No posts yet.</p>}
      <PostGrid posts={rest} settings={s} />
      <Pagination page={page} pages={pages} />
    </div>
  );
}
