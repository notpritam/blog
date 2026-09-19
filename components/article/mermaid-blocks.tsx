'use client';
import { useEffect } from 'react';

/**
 * Renders ```mermaid fences as diagrams. Mermaid is loaded lazily and only on
 * pages that actually contain a diagram, so ordinary articles ship no extra JS.
 * The original <pre> is kept (hidden) so "view source" and copy still work.
 */
export function MermaidBlocks() {
  useEffect(() => {
    const codes = Array.from(document.querySelectorAll<HTMLElement>('.prose pre code.language-mermaid'));
    if (codes.length === 0) return;
    let cancelled = false;
    let observer: MutationObserver | null = null;

    const render = async () => {
      const { default: mermaid } = await import('mermaid');
      if (cancelled) return;
      const dark = document.documentElement.dataset.theme === 'dark';
      mermaid.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'neutral', securityLevel: 'strict', fontFamily: 'var(--font-sans)' });
      for (const [i, code] of codes.entries()) {
        const pre = code.closest('pre');
        if (!pre) continue;
        const source = code.textContent ?? '';
        let figure = pre.nextElementSibling as HTMLElement | null;
        if (!figure || !figure.classList.contains('mermaid-figure')) {
          figure = document.createElement('figure');
          figure.className = 'mermaid-figure';
          pre.insertAdjacentElement('afterend', figure);
        }
        try {
          const { svg } = await mermaid.render(`mermaid-${i}-${dark ? 'd' : 'l'}`, source);
          if (cancelled) return;
          figure.innerHTML = svg;
          pre.hidden = true;
        } catch {
          figure.remove();
          pre.hidden = false;
        }
      }
    };

    void render();
    observer = new MutationObserver((muts) => {
      if (muts.some((m) => m.attributeName === 'data-theme')) void render();
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, []);
  return null;
}
