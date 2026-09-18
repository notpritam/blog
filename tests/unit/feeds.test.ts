import { describe, it, expect } from 'vitest';
import { buildJsonFeed, buildLlmsTxt, buildRss } from '@/lib/seo/feeds';
import { SETTING_DEFAULTS } from '@/lib/settings';
import type { PostFull } from '@/lib/posts/types';

const s = { ...SETTING_DEFAULTS };
const post: PostFull = {
  id: 1, slug: 'hello', title: 'Hello & <world>', subtitle: 'Sub', excerpt: 'Ex', coverPath: '/uploads/c.png', coverAlt: '', coverWidth: 10, coverHeight: 5,
  tags: ['tools'], readingMinutes: 3, publishedAt: '2026-05-21T19:45:54.777Z', updatedAt: '2026-05-21T19:45:54.777Z', featured: false,
  bodyMd: '# x', bodyHtml: '<p>Body with <a href="/rel">rel link</a> and <img src="/uploads/i.png"></p>', toc: [], wordCount: 3, seoTitle: null, seoDescription: null,
  canonicalUrl: null, noindex: false, status: 'published', createdAt: '2026-05-21T19:45:54.777Z',
};

describe('feeds', () => {
  it('builds valid-looking RSS with escaped titles, absolute links and full content', () => {
    const xml = buildRss([post], s, 'https://b.dev');
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<title>Hello &amp; &lt;world&gt;</title>');
    expect(xml).toContain('<link>https://b.dev/hello</link>');
    expect(xml).toContain('<guid isPermaLink="true">https://b.dev/hello</guid>');
    expect(xml).toContain('<pubDate>Thu, 21 May 2026 19:45:54 GMT</pubDate>');
    expect(xml).toContain('<content:encoded><![CDATA[<p>Body with <a href="https://b.dev/rel">rel link</a> and <img src="https://b.dev/uploads/i.png"></p>]]></content:encoded>');
    expect(xml).toContain('<atom:link href="https://b.dev/rss.xml" rel="self" type="application/rss+xml"/>');
    expect(xml).toContain('<category>tools</category>');
  });
  it('escapes special characters in the enclosure url', () => {
    const xml = buildRss([{ ...post, coverPath: '/uploads/a&b.png' }], s, 'https://b.dev');
    expect(xml).toContain('url="https://b.dev/uploads/a&amp;b.png"');
  });
  it('builds JSON Feed 1.1', () => {
    const j = buildJsonFeed([post], s, 'https://b.dev') as { version: string; items: { id: string; url: string; image?: string; tags?: string[] }[] };
    expect(j.version).toBe('https://jsonfeed.org/version/1.1');
    expect(j.items[0]).toMatchObject({ id: 'https://b.dev/hello', url: 'https://b.dev/hello', image: 'https://b.dev/uploads/c.png', tags: ['tools'] });
  });
  it('builds llms.txt', () => {
    const t = buildLlmsTxt([post], s, 'https://b.dev');
    expect(t).toContain('# Pritam Sharma · Blog');
    expect(t).toContain('- [Hello & <world>](https://b.dev/hello): Sub');
    expect(t).toContain('https://b.dev/hello.md');
  });
});
