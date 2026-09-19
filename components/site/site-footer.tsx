import Link from 'next/link';
import type { Settings } from '@/lib/settings';

export function SiteFooter({ settings: s }: { settings: Settings }) {
  const links = [
    s.social_github && { href: s.social_github, label: 'GitHub' },
    s.social_linkedin && { href: s.social_linkedin, label: 'LinkedIn' },
    s.social_x && { href: s.social_x, label: 'X' },
    s.social_youtube && { href: s.social_youtube, label: 'YouTube' },
    { href: s.author_url, label: 'Portfolio' },
  ].filter(Boolean) as { href: string; label: string }[];
  return (
    <footer className="dashed-t mt-24 bg-bg-muted">
      <div className="page-wide grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="h-display text-[20px] font-medium">{s.site_title}</p>
          <p className="mt-2 max-w-[42ch] text-[15px] leading-6 text-text-soft">{s.site_tagline}</p>
        </div>
        <div>
          <p className="eyebrow mb-3">Elsewhere</p>
          <ul className="space-y-2 text-[15px]">
            {links.map((l) => (
              <li key={l.href}><a href={l.href} className="link-hover" rel="me noopener" target="_blank">{l.label}</a></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-3">Follow</p>
          <ul className="space-y-2 text-[15px]">
            <li><a href="/rss.xml" className="link-hover">RSS</a></li>
            <li><a href="/feed.json" className="link-hover">JSON Feed</a></li>
            <li><a href="/sitemap.xml" className="link-hover">Sitemap</a></li>
            <li><Link href="/tags" className="link-hover">All tags</Link></li>
          </ul>
        </div>
      </div>
      <div className="dashed-t">
        <div className="page-wide flex flex-wrap items-center justify-between gap-2 py-5 text-[13px] text-meta">
          <span>© {new Date().getFullYear()} {s.author_name}</span>
          <span>Written by hand, with some help from agents.</span>
        </div>
      </div>
    </footer>
  );
}
