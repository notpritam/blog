import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { Pagination } from '@/components/posts/pagination';
import { PostGrid } from '@/components/posts/post-grid';
import { getDb } from '@/lib/db/client';
import { listPublished } from '@/lib/posts/queries';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ n: string }> }): Promise<Metadata> {
  const { n } = await params;
  return { title: `Writing · page ${n}`, alternates: { canonical: `/page/${n}` }, robots: { index: true, follow: true } };
}

export default async function Paged({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const page = Number(n);
  if (!Number.isInteger(page) || page < 1) notFound();
  if (page === 1) permanentRedirect('/');
  const db = getDb();
  const s = getSettings(db);
  const { posts, pages } = listPublished(db, { page, perPage: Number(s.posts_per_page) || 10 });
  if (posts.length === 0) notFound();
  return (
    <div className="page-wide">
      <section className="dashed-b py-10"><h1 className="h-display text-[28px] font-medium">Older writing · page {page}</h1></section>
      <PostGrid posts={posts} settings={s} />
      <Pagination page={page} pages={pages} />
    </div>
  );
}
