'use client';
import { useEffect } from 'react';

/** Adds a copy button to every <pre> inside .prose. Pure enhancement; markup works without it. */
export function CodeCopy() {
  useEffect(() => {
    const pres = Array.from(document.querySelectorAll<HTMLPreElement>('.prose pre'));
    const cleanups = pres.map((pre) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'code-copy';
      btn.textContent = 'Copy';
      btn.setAttribute('aria-label', 'Copy code');
      const onClick = async () => {
        try {
          await navigator.clipboard.writeText(pre.querySelector('code')?.innerText ?? pre.innerText);
          btn.textContent = 'Copied';
        } catch {
          btn.textContent = 'Copy failed';
        }
        setTimeout(() => (btn.textContent = 'Copy'), 1500);
      };
      btn.addEventListener('click', onClick);
      pre.appendChild(btn);
      return () => { btn.removeEventListener('click', onClick); btn.remove(); };
    });
    return () => cleanups.forEach((c) => c());
  }, []);
  return null;
}
