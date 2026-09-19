import { describe, it, expect } from 'vitest';
import { collectRemoteImages, extractPageMeta, normalizeHashnodeImages, rewriteImages, stripLeadingTitle } from '@/scripts/hashnode';

describe('hashnode helpers', () => {
  it('strips one or two leading H1 lines equal to the title', () => {
    const t = 'How We Built It';
    expect(stripLeadingTitle('# How We Built It\n\n# How We Built It\n\n*Intro*\n', t)).toBe('*Intro*\n');
    expect(stripLeadingTitle('# How We Built It\n\nBody', t)).toBe('Body');
    expect(stripLeadingTitle('# Different heading\n\nBody', t)).toBe('# Different heading\n\nBody');
    expect(stripLeadingTitle("# I got tired of Claude's diagrams.\n\nBody", "I got tired of Claude's diagrams.")).toBe('Body');
  });
  it('extracts cover, dates and description from page html', () => {
    const html = `<meta name="description" content="Desc &amp; more"><meta property="og:image" content="https://cdn.hashnode.com/x.png"><script type="application/ld+json">{"datePublished":"2026-05-21T19:45:54.777Z","dateModified":"2026-05-22T00:00:00.000Z"}</script>`;
    expect(extractPageMeta(html)).toEqual({ cover: 'https://cdn.hashnode.com/x.png', published: '2026-05-21T19:45:54.777Z', modified: '2026-05-22T00:00:00.000Z', description: 'Desc & more' });
    expect(extractPageMeta('')).toEqual({ cover: null, published: null, modified: null, description: null });
  });
  it('rewrites image urls by map', () => {
    const md = '![a](https://cdn.hashnode.com/a.png) and ![b](https://cdn.hashnode.com/b.png "t")';
    const out = rewriteImages(md, new Map([['https://cdn.hashnode.com/a.png', '/uploads/2026/09/aa-a.png']]));
    expect(out).toBe('![a](/uploads/2026/09/aa-a.png) and ![b](https://cdn.hashnode.com/b.png "t")');
  });
  it('normalizes hashnode image syntax by stripping trailing attributes, keeping alt and url', () => {
    expect(normalizeHashnodeImages('![a](https://x.png align="center")')).toBe('![a](https://x.png)');
    expect(normalizeHashnodeImages('![](https://x.png align="center")')).toBe('![](https://x.png)');
    expect(normalizeHashnodeImages('![a](https://x.png "My Title" align="center")')).toBe('![a](https://x.png "My Title")');
    expect(normalizeHashnodeImages('![a](https://x.png width="100" align="center")')).toBe('![a](https://x.png)');
    // Already-standard markdown (no trailing attrs) is left untouched.
    expect(normalizeHashnodeImages('![a](https://x.png "t")')).toBe('![a](https://x.png "t")');
    expect(normalizeHashnodeImages('![a](https://x.png)')).toBe('![a](https://x.png)');
  });
  it('collects every remote image url regardless of host, deduped', () => {
    const md = '![a](https://cdn.hashnode.com/a.png) and ![b](https://iili.io/b.png "t") and ![c](https://cdn.jsdelivr.net/gh/x/c.png) and ![a2](https://cdn.hashnode.com/a.png)';
    expect(collectRemoteImages(md)).toEqual(['https://cdn.hashnode.com/a.png', 'https://iili.io/b.png', 'https://cdn.jsdelivr.net/gh/x/c.png']);
  });
  it('collects the full url even when it contains a literal balanced parenthesis', () => {
    const md = '![a](https://example.com/img_(1).png)';
    expect(collectRemoteImages(md)).toEqual(['https://example.com/img_(1).png']);
  });
  it('rewrites a url without corrupting a longer url that has it as a prefix', () => {
    const md = '![a](https://x.png) and ![b](https://x.png?v=2)';
    const map = new Map([
      ['https://x.png', '/uploads/a.png'],
      ['https://x.png?v=2', '/uploads/b.png'],
    ]);
    expect(rewriteImages(md, map)).toBe('![a](/uploads/a.png) and ![b](/uploads/b.png)');
  });
});

describe('normalizeHashnodeEmbeds', () => {
  it('turns a YouTube embed shorthand into a thumbnail link and other urls into links', async () => {
    const { normalizeHashnodeEmbeds } = await import('@/scripts/hashnode');
    expect(normalizeHashnodeEmbeds('a\n%[https://youtu.be/tyb62Z6wkFM] \nb')).toBe(
      'a\n[![Watch on YouTube](https://img.youtube.com/vi/tyb62Z6wkFM/hqdefault.jpg "Watch on YouTube")](https://youtu.be/tyb62Z6wkFM)\nb',
    );
    expect(normalizeHashnodeEmbeds('%[https://example.com/x]')).toBe('[https://example.com/x](https://example.com/x)');
  });
});
