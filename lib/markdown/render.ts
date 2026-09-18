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
import { visit } from 'unist-util-visit';
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
      // Join per top-level block rather than `mdastToString(tree)` on the whole
      // tree: mdast-util-to-string concatenates text nodes with no separator,
      // so adjacent blocks (e.g. a heading immediately followed by a paragraph)
      // would otherwise fuse into one word and undercount.
      plain = tree.children.map((node) => mdastToString(node)).join('\n\n');
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
