'use client';
import { useEffect, useState } from 'react';
import type { TocItem } from '@/lib/posts/types';

export function TocNav({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState<string>(items[0]?.id ?? '');
  useEffect(() => {
    const headings = items.map((i) => document.getElementById(i.id)).filter((el): el is HTMLElement => !!el);
    if (!headings.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 },
    );
    headings.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [items]);
  if (!items.length) return null;
  return (
    <nav aria-label="On this page" className="toc-nav">
      <p className="eyebrow mb-3">On this page</p>
      {items.map((i) => (
        <a key={i.id} href={`#${i.id}`} data-depth={i.depth} aria-current={active === i.id ? 'true' : undefined}>{i.text}</a>
      ))}
    </nav>
  );
}
