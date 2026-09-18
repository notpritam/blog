import Link from 'next/link';
import type { PostSummary } from '@/lib/posts/types';

export function PrevNext({ older, newer }: { older: PostSummary | null; newer: PostSummary | null }) {
  if (!older && !newer) return null;
  return (
    <nav aria-label="Adjacent posts" className="dashed-t mt-16 grid gap-6 pt-8 md:grid-cols-2">
      <div>{newer && (<><p className="eyebrow">Newer</p><Link href={`/${newer.slug}`} rel="next" className="link-hover h-display mt-2 block text-[18px] font-medium">{newer.title}</Link></>)}</div>
      <div className="md:text-right">{older && (<><p className="eyebrow">Older</p><Link href={`/${older.slug}`} rel="prev" className="link-hover h-display mt-2 block text-[18px] font-medium">{older.title}</Link></>)}</div>
    </nav>
  );
}
