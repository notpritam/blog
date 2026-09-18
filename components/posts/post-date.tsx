import { formatDate } from '@/lib/format';

export function PostDate({ iso, readingMinutes }: { iso: string; readingMinutes?: number }) {
  return (
    <p className="eyebrow">
      <time dateTime={iso}>{formatDate(iso)}</time>
      {readingMinutes ? <span> · {readingMinutes} min read</span> : null}
    </p>
  );
}
