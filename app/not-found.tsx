import Link from 'next/link';
import { SearchForm } from '@/components/site/search-form';

export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="page py-24">
      <p className="eyebrow">404</p>
      <h1 className="h-display mt-3 text-[36px] font-semibold">That page isn’t here.</h1>
      <p className="mt-3 max-w-[50ch] text-text-soft">It may have moved, or the link was wrong. Try a search, or go back to <Link href="/" className="underline">the writing</Link>.</p>
      <div className="mt-8 max-w-[480px]"><SearchForm /></div>
    </div>
  );
}
