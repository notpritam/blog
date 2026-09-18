import type { PostFull } from '@/lib/posts/types';
import type { Settings } from '@/lib/settings';

export function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Rewrites root-relative href/src to absolute for feed readers. */
export function absolutizeHtml(html: string, base: string): string {
  return html.replace(/(href|src)="\/(?!\/)/g, `$1="${base}/`);
}

export function buildRss(posts: PostFull[], s: Settings, base: string): string {
  const items = posts.map((p) => `
    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${base}/${p.slug}</link>
      <guid isPermaLink="true">${base}/${p.slug}</guid>
      <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>
      <dc:creator>${escapeXml(s.author_name)}</dc:creator>
      <description>${escapeXml(p.subtitle || p.excerpt)}</description>
      ${p.tags.map((t) => `<category>${escapeXml(t)}</category>`).join('')}
      ${p.coverPath ? `<enclosure url="${base}${p.coverPath}" type="image/${p.coverPath.split('.').pop() === 'jpg' ? 'jpeg' : p.coverPath.split('.').pop()}" length="0"/>` : ''}
      <content:encoded><![CDATA[${absolutizeHtml(p.bodyHtml, base).replace(/]]>/g, ']]]]><![CDATA[>')}]]></content:encoded>
    </item>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(s.site_title)} · Blog</title>
    <link>${base}</link>
    <description>${escapeXml(s.site_description)}</description>
    <language>en</language>
    <lastBuildDate>${new Date(posts[0]?.updatedAt ?? Date.now()).toUTCString()}</lastBuildDate>
    <atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml"/>
    <image><url>${base}${s.author_avatar}</url><title>${escapeXml(s.site_title)}</title><link>${base}</link></image>${items}
  </channel>
</rss>`;
}

export function buildJsonFeed(posts: PostFull[], s: Settings, base: string): Record<string, unknown> {
  return {
    version: 'https://jsonfeed.org/version/1.1',
    title: `${s.site_title} · Blog`,
    home_page_url: base,
    feed_url: `${base}/feed.json`,
    description: s.site_description,
    language: 'en',
    icon: `${base}${s.author_avatar}`,
    authors: [{ name: s.author_name, url: s.author_url, avatar: `${base}${s.author_avatar}` }],
    items: posts.map((p) => ({
      id: `${base}/${p.slug}`,
      url: `${base}/${p.slug}`,
      title: p.title,
      summary: p.subtitle || p.excerpt,
      content_html: absolutizeHtml(p.bodyHtml, base),
      date_published: p.publishedAt,
      date_modified: p.updatedAt,
      ...(p.coverPath && { image: `${base}${p.coverPath}` }),
      tags: p.tags,
      authors: [{ name: s.author_name, url: s.author_url }],
    })),
  };
}

export function buildLlmsTxt(posts: PostFull[], s: Settings, base: string): string {
  const lines = [
    `# ${s.site_title} · Blog`,
    '',
    `> ${s.site_description}`,
    '',
    `Author: ${s.author_name} (${s.author_url}). Every post is also available as Markdown by appending \`.md\` to its URL.`,
    '',
    '## Posts',
    '',
    ...posts.map((p) => `- [${p.title}](${base}/${p.slug}): ${p.subtitle || p.excerpt} (Markdown: ${base}/${p.slug}.md)`),
    '',
    '## Feeds',
    '',
    `- [RSS](${base}/rss.xml)`,
    `- [JSON Feed](${base}/feed.json)`,
    `- [Sitemap](${base}/sitemap.xml)`,
  ];
  return lines.join('\n') + '\n';
}
