import Link from 'next/link';
import type { Settings } from '@/lib/settings';
import { ThemeToggle } from './theme-toggle';
import { HeaderFrame } from './header-frame';

const NAV = [
  { href: '/', label: 'Writing' },
  { href: '/tags', label: 'Tags' },
  { href: '/about', label: 'About' },
];

export function SiteHeader({ settings: s }: { settings: Settings }) {
  return (
    <HeaderFrame>
      <div className="site-header-inner">
        <Link href="/" className="site-wordmark" aria-label={`${s.site_title} home`}>
          <span>{s.site_title}</span>
          <span className="site-wordmark-caption">Notes & experiments</span>
        </Link>
        <nav aria-label="Primary" className="site-nav">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="site-nav-link">{n.label}</Link>
          ))}
        </nav>
        <div className="site-header-tools">
          <Link href="/search" aria-label="Search" className="site-icon-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </HeaderFrame>
  );
}
