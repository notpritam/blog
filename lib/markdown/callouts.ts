import type { Blockquote, Paragraph, Root } from 'mdast';
import { visit } from 'unist-util-visit';

const RE = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*(?:\r?\n|$)/i;

/** GitHub-style `> [!NOTE]` blockquotes become `<aside class="callout callout-note">`. */
export function remarkCallouts() {
  return (tree: Root) => {
    visit(tree, 'blockquote', (node: Blockquote) => {
      const first = node.children[0];
      if (!first || first.type !== 'paragraph') return;
      const text = first.children[0];
      if (!text || text.type !== 'text') return;
      const m = RE.exec(text.value);
      if (!m) return;
      const kind = m[1].toLowerCase();
      text.value = text.value.slice(m[0].length);
      if (text.value === '') first.children.shift();
      if (first.children.length === 0) node.children.shift();
      node.data = {
        ...node.data,
        hName: 'aside',
        hProperties: { className: ['callout', `callout-${kind}`], 'data-kind': kind },
      };
      const title: Paragraph = {
        type: 'paragraph',
        data: { hName: 'p', hProperties: { className: ['callout-title'] } },
        children: [{ type: 'text', value: kind[0].toUpperCase() + kind.slice(1) }],
      };
      node.children.unshift(title);
    });
  };
}
