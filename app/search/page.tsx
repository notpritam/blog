import type { Metadata } from 'next';
import { PostGrid } from '@/components/posts/post-grid';
import { SearchForm } from '@/components/site/search-form';
import { getDb } from '@/lib/db/client';
import { searchPublished } from '@/lib/posts/queries';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Search', robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const db = getDb();
  const s = getSettings(db);
  const results = q.trim() ? searchPublished(db, q.trim()) : [];
  return (
    <div className="page-wide">
      <section className="dashed-b py-12">
        <h1 className="h-display text-[36px] font-semibold">Search</h1>
        <div className="mt-6 max-w-[560px]"><SearchForm defaultValue={q} autoFocus /></div>
        {q.trim() && <p className="mt-4 text-text-soft" aria-live="polite">{results.length} {results.length === 1 ? 'result' : 'results'} for “{q}”</p>}
      </section>
      {q.trim() && <PostGrid posts={results} settings={s} />}
    </div>
  );
}
