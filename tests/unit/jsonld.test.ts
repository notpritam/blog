import { describe, it, expect } from 'vitest';
import { blogPostingJsonLd, breadcrumbJsonLd, personJsonLd, websiteJsonLd } from '@/lib/seo/jsonld';
import { SETTING_DEFAULTS } from '@/lib/settings';
import type { PostFull } from '@/lib/posts/types';

const s = { ...SETTING_DEFAULTS };
const post: PostFull = {
  id: 1, slug: 'hello', title: 'Hello', subtitle: 'Sub', excerpt: 'Excerpt', coverPath: '/uploads/2026/09/aa-cover.png', coverAlt: 'c',
  coverWidth: 1200, coverHeight: 630, tags: ['tools', 'agents'], readingMinutes: 4, publishedAt: '2026-05-21T19:45:54.777Z',
  updatedAt: '2026-06-01T00:00:00.000Z', featured: false, bodyMd: '', bodyHtml: '', toc: [], wordCount: 800, seoTitle: null,
  seoDescription: 'SEO desc', canonicalUrl: null, noindex: false, status: 'published', createdAt: '2026-05-21T19:45:54.777Z',
};

describe('jsonld', () => {
  it('builds a BlogPosting with absolute urls and author', () => {
    const j = blogPostingJsonLd(post, s, 'https://blog.notpritam.in');
    expect(j['@type']).toBe('BlogPosting');
    expect(j.headline).toBe('Hello');
    expect(j.description).toBe('SEO desc');
    expect(j.image).toEqual(['https://blog.notpritam.in/uploads/2026/09/aa-cover.png', 'https://blog.notpritam.in/og/hello.png']);
    expect(j.datePublished).toBe('2026-05-21T19:45:54.777Z');
    expect(j.dateModified).toBe('2026-06-01T00:00:00.000Z');
    expect(j.author).toEqual({ '@type': 'Person', name: 'Pritam Sharma', url: 'https://notpritam.in' });
    expect(j.keywords).toBe('tools, agents');
    expect(j.wordCount).toBe(800);
    expect(j.mainEntityOfPage).toBe('https://blog.notpritam.in/hello');
  });
  it('builds WebSite, Person and BreadcrumbList', () => {
    expect(websiteJsonLd(s, 'https://x.dev')['@type']).toBe('WebSite');
    expect(personJsonLd(s).sameAs).toEqual(['https://github.com/notpritam', 'https://www.linkedin.com/in/notpritamsharma/', 'https://notpritam.in']);
    const b = breadcrumbJsonLd([{ name: 'Home', url: 'https://x.dev/' }, { name: 'Hello', url: 'https://x.dev/hello' }]);
    expect(b.itemListElement[1]).toEqual({ '@type': 'ListItem', position: 2, name: 'Hello', item: 'https://x.dev/hello' });
  });
});
