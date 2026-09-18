import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '@/lib/markdown/render';
import { slugify } from '@/lib/markdown/slugify';
import { countWords, readingMinutes } from '@/lib/markdown/reading-time';

describe('slugify', () => {
  it('lowercases, hyphenates and trims', () => {
    expect(slugify("  I got tired of Claude's ASCII diagrams. So I built claude-canvas!  ")).toBe(
      'i-got-tired-of-claudes-ascii-diagrams-so-i-built-claude-canvas',
    );
  });
  it('cuts at a word boundary under maxLength', () => {
    expect(slugify('alpha beta gamma delta', 12)).toBe('alpha-beta');
  });
  it('returns the whole cut when a single word has no boundary to respect', () => {
    expect(slugify('supercalifragilistic', 5)).toBe('super');
  });
  it('does not trim a complete word that already ends exactly at the cut', () => {
    expect(slugify('alpha beta', 5)).toBe('alpha');
  });
});

describe('reading time', () => {
  it('counts words and rounds minutes with a floor of 1', () => {
    expect(countWords("It's a 3-word sentence, isn't it?")).toBe(6);
    expect(readingMinutes(10)).toBe(1);
    expect(readingMinutes(460)).toBe(2);
    expect(readingMinutes(1265)).toBe(6);
  });
});

describe('renderMarkdown', () => {
  it('slugs headings and collects a toc of h2/h3 only', async () => {
    const r = await renderMarkdown('# Title\n\n## Getting started\n\ntext\n\n### Sub step\n\n#### Deep\n\n## Wrap up');
    expect(r.toc).toEqual([
      { depth: 2, id: 'getting-started', text: 'Getting started' },
      { depth: 3, id: 'sub-step', text: 'Sub step' },
      { depth: 2, id: 'wrap-up', text: 'Wrap up' },
    ]);
    expect(r.html).toContain('<h2 id="getting-started">');
    expect(r.html).toContain('class="heading-anchor"');
  });

  it('renders gfm tables, strikethrough and footnotes', async () => {
    const r = await renderMarkdown('| a | b |\n|---|---|\n| 1 | 2 |\n\n~~gone~~ text[^1]\n\n[^1]: The note.');
    expect(r.html).toContain('<table>');
    expect(r.html).toContain('<del>gone</del>');
    expect(r.html).toContain('data-footnotes');
  });

  it('highlights code with dual themes and survives unknown languages', async () => {
    const r = await renderMarkdown('```ts\nconst a = 1\n```\n\n```whatever\nplain\n```');
    expect(r.html).toContain('class="shiki');
    expect(r.html).toContain('--shiki-dark');
    expect(r.html).toContain('<pre');
    expect(r.html).toContain('plain');
  });

  it('turns [!NOTE] blockquotes into callouts', async () => {
    const r = await renderMarkdown('> [!WARNING]\n> Mind the gap.\n\n> plain quote');
    expect(r.html).toContain('<aside class="callout callout-warning" data-kind="warning">');
    expect(r.html).toContain('<p class="callout-title">Warning</p>');
    expect(r.html).toContain('Mind the gap.');
    expect(r.html).toContain('<blockquote>');
  });

  it('keeps raw html', async () => {
    const r = await renderMarkdown('<div align="center">hi</div>');
    expect(r.html).toContain('<div align="center">hi</div>');
  });

  it('wraps standalone images in figures, lazy-loads them, captions from title', async () => {
    const r = await renderMarkdown('![Alt text](/uploads/a.png "A caption")\n\nInline ![i](/x.png) here');
    expect(r.html).toContain('<figure><img src="/uploads/a.png" alt="Alt text" loading="lazy" decoding="async"><figcaption>A caption</figcaption></figure>');
    expect(r.html).toContain('<p>Inline <img src="/x.png" alt="i" loading="lazy" decoding="async"> here</p>');
    expect(r.firstImage).toBe('/uploads/a.png');
  });

  it('computes words, reading time and excerpt from the first paragraph', async () => {
    const words = Array.from({ length: 460 }, (_, i) => `w${i}`).join(' ');
    const r = await renderMarkdown(`## Heading\n\nFirst paragraph here.\n\n${words}`);
    expect(r.wordCount).toBe(464);
    expect(r.readingMinutes).toBe(2);
    expect(r.excerpt).toBe('First paragraph here.');
  });

  it('counts words at every block boundary, not just top-level siblings', async () => {
    const list = await renderMarkdown('- one\n- two\n- three');
    expect(list.wordCount).toBe(3);

    const table = await renderMarkdown('| a | b |\n|---|---|\n| 1 | 2 |');
    expect(table.wordCount).toBe(4);

    const blockquote = await renderMarkdown('> alpha\n>\n> beta');
    expect(blockquote.wordCount).toBe(2);
  });

  it('excludes the injected callout title from the word count', async () => {
    const r = await renderMarkdown('> [!NOTE]\n> alpha beta\n>\n> gamma');
    expect(r.wordCount).toBe(3);
  });
});
