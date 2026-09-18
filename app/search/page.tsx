import type { Metadata } from 'next';
import { PostGrid } from '@/components/posts/post-grid';
import { SearchForm } from '@/components/site/search-form';
import { getDb } from '@/lib/db/client';
import { searchPublished } from '@/lib/posts/queries';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Search', robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] ?? '' : raw ?? '').trim();
  const db = getDb();
  const s = getSettings(db);
  const results = q ? searchPublished(db, q) : [];
  return (
    <div className="page-wide">
      <section className="dashed-b py-12">
        <h1 className="h-display text-[36px] font-semibold">Search</h1>
        <div className="mt-6 max-w-[560px]"><SearchForm defaultValue={q} autoFocus /></div>
        {q && <p className="mt-4 text-text-soft" aria-live="polite">{results.length} {results.length === 1 ? 'result' : 'results'} for “{q}”</p>}
      </section>
      {q && <PostGrid posts={results} settings={s} headingLevel="h2" />}
    </div>
  );
}
