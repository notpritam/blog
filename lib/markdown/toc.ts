import type { Element, Root } from 'hast';
import { toString } from 'hast-util-to-string';
import { visit } from 'unist-util-visit';

export interface TocItem {
  depth: 2 | 3;
  id: string;
  text: string;
}

/** Collects h2/h3 ids into `sink`. Must run after rehype-slug and before rehype-autolink-headings. */
export function rehypeCollectToc(sink: TocItem[]) {
  return () => (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'h2' && node.tagName !== 'h3') return;
      const id = node.properties?.id;
      if (typeof id !== 'string') return;
      sink.push({ depth: node.tagName === 'h2' ? 2 : 3, id, text: toString(node).trim() });
    });
  };
}
