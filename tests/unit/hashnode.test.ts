import { describe, it, expect } from 'vitest';
import { extractPageMeta, rewriteImages, stripLeadingTitle } from '@/scripts/hashnode';

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
});
