import type { Metadata } from 'next';
import { SETTING_DEFAULTS, siteUrl, type Settings } from '@/lib/settings';

export function rootMetadata(s: Settings): Metadata {
  const base = siteUrl();
  return {
    metadataBase: new URL(base),
    title: { default: `${s.site_title} · Blog`, template: `%s · ${s.site_title}` },
    description: s.site_description,
    applicationName: s.site_title,
    authors: [{ name: s.author_name, url: s.author_url }],
    creator: s.author_name,
    alternates: {
      types: {
        'application/rss+xml': [{ url: `${base}/rss.xml`, title: `${s.site_title} · RSS` }],
        'application/feed+json': [{ url: `${base}/feed.json`, title: `${s.site_title} · JSON Feed` }],
      },
    },
    icons: { icon: '/icon.png', apple: '/apple-icon.png' },
    openGraph: { type: 'website', siteName: s.site_title, url: base, title: `${s.site_title} · Blog`, description: s.site_description, images: [{ url: `${base}/og/site.png`, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title: `${s.site_title} · Blog`, description: s.site_description, images: [`${base}/og/site.png`] },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
    ...(s.google_site_verification && { verification: { google: s.google_site_verification } }),
  };
}

/** Page-level title, description, canonical and matching social card (child metadata replaces the root's openGraph). */
export function pageMetadata(title: string, description: string, path: string): Metadata {
  const full = `${title} · ${SETTING_DEFAULTS.site_title}`;
  const images = [{ url: '/og/site.png', width: 1200, height: 630 }];
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: 'website', siteName: SETTING_DEFAULTS.site_title, url: path, title: full, description, images },
    twitter: { card: 'summary_large_image', title: full, description, images: ['/og/site.png'] },
  };
}
