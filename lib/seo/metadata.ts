import type { Metadata } from 'next';
import { siteUrl, type Settings } from '@/lib/settings';

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
      canonical: '/',
      types: {
        'application/rss+xml': [{ url: `${base}/rss.xml`, title: `${s.site_title} · RSS` }],
        'application/feed+json': [{ url: `${base}/feed.json`, title: `${s.site_title} · JSON Feed` }],
      },
    },
    openGraph: { type: 'website', siteName: s.site_title, url: base, title: `${s.site_title} · Blog`, description: s.site_description, images: [{ url: `${base}/og/site.png`, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title: `${s.site_title} · Blog`, description: s.site_description, images: [`${base}/og/site.png`] },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
    ...(s.google_site_verification && { verification: { google: s.google_site_verification } }),
  };
}
