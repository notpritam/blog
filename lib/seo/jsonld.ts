import type { PostFull, PostSummary } from '@/lib/posts/types';
import type { Settings } from '@/lib/settings';

type Json = Record<string, unknown>;

export function personJsonLd(s: Settings): Json & { sameAs: string[] } {
  const sameAs = [s.social_github, s.social_linkedin, s.social_x, s.social_youtube, s.author_url].filter(Boolean);
  return { '@type': 'Person', '@id': `${s.author_url}#person`, name: s.author_name, url: s.author_url, description: s.author_bio, sameAs };
}

export function websiteJsonLd(s: Settings, base: string): Json {
  return {
    '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${base}#website`, name: `${s.site_title} · Blog`, url: base,
    description: s.site_description, inLanguage: 'en', author: personJsonLd(s),
    potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${base}/search?q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
  };
}

export function blogPostingJsonLd(post: PostFull, s: Settings, base: string): Json & Record<'headline' | 'description' | 'datePublished' | 'dateModified' | 'keywords' | 'mainEntityOfPage', string> & { image: string[]; author: Json; wordCount: number } {
  const url = `${base}/${post.slug}`;
  const image = [post.coverPath ? `${base}${post.coverPath}` : null, `${base}/og/${post.slug}.png`].filter(Boolean) as string[];
  return {
    '@context': 'https://schema.org', '@type': 'BlogPosting', '@id': `${url}#article`,
    headline: post.seoTitle ?? post.title, alternativeHeadline: post.subtitle || undefined,
    description: post.seoDescription ?? post.excerpt, image, url, mainEntityOfPage: url,
    datePublished: post.publishedAt, dateModified: Date.parse(post.updatedAt) > Date.parse(post.publishedAt) ? post.updatedAt : post.publishedAt,
    author: { '@type': 'Person', name: s.author_name, url: s.author_url },
    publisher: { '@type': 'Person', name: s.author_name, url: s.author_url },
    keywords: post.tags.join(', '), wordCount: post.wordCount, inLanguage: 'en', isAccessibleForFree: true,
    timeRequired: `PT${post.readingMinutes}M`,
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]): Json & { itemListElement: Json[] } {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })) };
}

export function collectionPageJsonLd(name: string, url: string, posts: PostSummary[], s: Settings, base: string): Json {
  return {
    '@context': 'https://schema.org', '@type': 'CollectionPage', name, url, isPartOf: { '@id': `${base}#website` },
    author: personJsonLd(s),
    mainEntity: { '@type': 'ItemList', itemListElement: posts.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${base}/${p.slug}`, name: p.title })) },
  };
}
