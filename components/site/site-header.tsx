import Image from 'next/image';
import Link from 'next/link';
import type { Settings } from '@/lib/settings';
import { ThemeToggle } from './theme-toggle';

const NAV = [
  { href: '/', label: 'Writing' },
  { href: '/tags', label: 'Tags' },
  { href: '/about', label: 'About' },
];

export function SiteHeader({ settings: s }: { settings: Settings }) {
  return (
    <header className="dashed-b sticky top-0 z-40 bg-bg" style={{ height: 'var(--header-h)' }}>
      <div className="page-wide flex h-full items-center justify-between">
        <Link href="/" className="flex items-center gap-3" aria-label={`${s.site_title} home`}>
          <Image src={s.author_avatar} alt="" width={28} height={28} className="rounded-full" priority />
          <span className="h-display text-[18px] font-medium">{s.site_title}</span>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="link-hover px-2 py-2 text-[14px] sm:px-3">{n.label}</Link>
          ))}
          <Link href="/search" aria-label="Search" className="link-hover inline-flex h-9 w-9 items-center justify-center rounded-full">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </Link>
          <a href="/rss.xml" aria-label="RSS feed" className="link-hover inline-flex h-9 w-9 items-center justify-center rounded-full">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="19" r="2" /><path d="M3 10a11 11 0 0 1 11 11h-3a8 8 0 0 0-8-8v-3Zm0-7a18 18 0 0 1 18 18h-3A15 15 0 0 0 3 6V3Z" /></svg>
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
