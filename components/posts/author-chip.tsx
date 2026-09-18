import Image from 'next/image';
import type { Settings } from '@/lib/settings';

export function AuthorChip({ settings: s, size = 28 }: { settings: Settings; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-[14px] text-ink">
      <Image src={s.author_avatar} alt="" width={size} height={size} className="rounded-full" />
      <span>{s.author_name}</span>
    </span>
  );
}
