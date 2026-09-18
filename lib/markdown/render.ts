import rehypeShiki from '@shikijs/rehype';
import type { Root as MdastRoot } from 'mdast';
import { toString as mdastToString } from 'mdast-util-to-string';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { SKIP, visit } from 'unist-util-visit';
import { remarkCallouts } from './callouts';
import { rehypeImages } from './images';
import { countWords, readingMinutes } from './reading-time';
import { rehypeCollectToc, type TocItem } from './toc';

export type { TocItem };

export interface Rendered {
  html: string;
  toc: TocItem[];
  wordCount: number;
  readingMinutes: number;
  excerpt: string;
  firstImage: string | null;
}

export const EXCERPT_LENGTH = 200;

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n).replace(/\s+\S*$/, '') + '…';
}

/**
 * `remarkCallouts` injects a `<p class="callout-title">Note</p>`-style
 * paragraph ahead of a callout's real content. It has no source text of its
 * own, so it must not contribute to the word count.
 */
function isCalloutTitle(node: { data?: unknown }): boolean {
  const data = node.data as { hProperties?: { className?: unknown } } | undefined;
  const className = data?.hProperties?.className;
  return Array.isArray(className) && className.includes('callout-title');
}

const LEAF_TEXT_TYPES = new Set(['text', 'inlineCode', 'code', 'html']);

/**
 * Collects prose for word counting by walking every node and joining the
 * `value` of each text-bearing leaf with a space. `mdast-util-to-string`
 * joins children with '' at *every* depth (not just between top-level
 * siblings), so list items, table cells and multi-paragraph blockquotes
 * collapse into one fused word — this walk fixes that by always inserting a
 * separator between leaves, regardless of nesting depth.
 */
function collectPlainText(tree: MdastRoot): string {
  const parts: string[] = [];
  visit(tree, (node) => {
    if (node.type === 'paragraph' && isCalloutTitle(node)) return SKIP;
    if (LEAF_TEXT_TYPES.has(node.type)) {
      const value = (node as { value?: unknown }).value;
      if (typeof value === 'string' && value.length > 0) parts.push(value);
    }
    return undefined;
  });
  return parts.join(' ');
}

export async function renderMarkdown(markdown: string): Promise<Rendered> {
  const toc: TocItem[] = [];
  let plain = '';
  let excerpt = '';
  let firstImage: string | null = null;

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm, { singleTilde: false })
    .use(remarkCallouts)
    .use(() => (tree: MdastRoot) => {
      plain = collectPlainText(tree);
      for (const node of tree.children) {
        if (node.type !== 'paragraph') continue;
        const t = mdastToString(node).trim();
        if (t) { excerpt = t; break; }
      }
      visit(tree, 'image', (img) => { if (!firstImage) firstImage = img.url; });
    })
    .use(remarkRehype, { allowDangerousHtml: true, footnoteLabel: 'Footnotes', clobberPrefix: '' })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeCollectToc(toc))
    .use(rehypeAutolinkHeadings, {
      behavior: 'append',
      properties: { className: ['heading-anchor'], ariaLabel: 'Link to this section' },
      content: { type: 'text', value: '#' },
    })
    .use(rehypeImages)
    .use(rehypeShiki, {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
      fallbackLanguage: 'text',
      addLanguageClass: true,
    })
    .use(rehypeStringify, { allowDangerousHtml: true });

  const file = await processor.process(markdown);
  const wordCount = countWords(plain);
  return {
    html: String(file),
    toc,
    wordCount,
    readingMinutes: readingMinutes(wordCount),
    excerpt: truncate(excerpt, EXCERPT_LENGTH),
    firstImage,
  };
}
