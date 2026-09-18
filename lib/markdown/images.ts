import type { Element, ElementContent, Root, RootContent } from 'hast';
import { SKIP, visit } from 'unist-util-visit';

/** Lazy-load every image; a paragraph holding only one image becomes a <figure> (caption = title). */
export function rehypeImages() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName === 'img') {
        node.properties = { ...node.properties, loading: 'lazy', decoding: 'async' };
        return;
      }
      if (node.tagName !== 'p' || !parent || typeof index !== 'number') return;
      const kids = node.children.filter((c) => !(c.type === 'text' && c.value.trim() === ''));
      if (kids.length !== 1 || kids[0].type !== 'element' || kids[0].tagName !== 'img') return;
      const img = kids[0];
      const title = typeof img.properties?.title === 'string' ? img.properties.title : '';
      delete img.properties?.title;
      img.properties = { ...img.properties, loading: 'lazy', decoding: 'async' };
      const children: ElementContent[] = [img];
      if (title) {
        children.push({ type: 'element', tagName: 'figcaption', properties: {}, children: [{ type: 'text', value: title }] });
      }
      (parent.children as RootContent[])[index] = { type: 'element', tagName: 'figure', properties: {}, children };
      // The old <p>'s children (including the now-relocated `img`) are still
      // reachable via `node`; without SKIP, unist-util-visit would keep
      // descending into them and re-apply loading/decoding to the same img.
      return [SKIP, index + 1] as const;
    });
  };
}
