import type { Metadata } from 'next';
import Link from 'next/link';
import { getDb } from '@/lib/db/client';
import { listTags } from '@/lib/posts/queries';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Tags', description: 'Every topic on the blog.', alternates: { canonical: '/tags' } };

export default function TagsPage() {
  const tags = listTags(getDb());
  return (
    <div className="page-wide">
      <section className="dashed-b py-12"><h1 className="h-display text-[36px] font-semibold">Tags</h1></section>
      <ul className="grid gap-x-8 py-8 sm:grid-cols-2 md:grid-cols-3">
        {tags.map((t) => (
          <li key={t.tag} className="dashed-b flex items-baseline justify-between py-3">
            <Link href={`/tag/${encodeURIComponent(t.tag)}`} className="link-hover text-[16px]">{t.tag}</Link>
            <span className="eyebrow">{t.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
