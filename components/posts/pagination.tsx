import Link from 'next/link';

export function Pagination({ page, pages, basePath = '/page' }: { page: number; pages: number; basePath?: string }) {
  if (pages <= 1) return null;
  const newer = page > 1 ? (page === 2 ? '/' : `${basePath}/${page - 1}`) : null;
  const older = page < pages ? `${basePath}/${page + 1}` : null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between py-8 text-[14px]">
      <span>{newer && <Link href={newer} className="link-hover" rel="prev">← Newer posts</Link>}</span>
      <span className="eyebrow">Page {page} of {pages}</span>
      <span>{older && <Link href={older} className="link-hover" rel="next">Older posts →</Link>}</span>
    </nav>
  );
}
