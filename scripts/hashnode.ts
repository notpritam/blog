export const HASHNODE_HOST = 'https://blog.notpritam.in';

/** The four posts to migrate, with data captured from Hashnode on 2026-09-18. Tags were chosen to fit the blog's topics. */
export const HASHNODE_POSTS: { slug: string; subtitle: string; tags: string[]; coverAlt: string }[] = [
  {
    slug: 'i-run-my-whole-mac-off-an-external-ssd-and-300-lines-of-bash-keep-it-from-breaking-when-i-unplug-it',
    subtitle: 'Offline mode for your external drive: when the cable slips, your folders fail over to a real local copy and merge back when the drive returns — without ever overwriting a file.',
    tags: ['macos', 'bash', 'tools'],
    coverAlt: 'Limpet: your external drive, finally unbreakable',
  },
  {
    slug: 'i-got-tired-of-claude-s-misaligned-ascii-diagrams-so-i-built-claude-canvas',
    subtitle: "Why LLMs can't draw, and how to give Claude a real canvas.",
    tags: ['claude', 'agents', 'tools'],
    coverAlt: 'claude-canvas: an interactive diagram canvas driven by Claude',
  },
  {
    slug: 'how-we-built-a-no-code-landing-page-editor-that-ships-static-pages-in-minutes',
    subtitle: 'We automated ourselves out of changing hex codes for a living.',
    tags: ['react', 'no-code', 'web'],
    coverAlt: 'A no-code landing page editor that ships static pages',
  },
  {
    slug: 'award-winning-marquee-animation-with-framer-motion',
    subtitle: '',
    tags: ['framer-motion', 'react', 'animation', 'frontend'],
    coverAlt: 'Marquee animation built with Framer Motion',
  },
];

function decodeEntities(s: string): string {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'");
}

export function stripLeadingTitle(md: string, title: string): string {
  let out = md.replace(/^﻿/, '');
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 2; i++) {
    const m = /^#\s+(.+?)\s*\r?\n(?:\r?\n)*/.exec(out);
    if (!m || norm(m[1]) !== norm(title)) break;
    out = out.slice(m[0].length);
  }
  return out;
}

export function extractPageMeta(html: string) {
  const meta = (re: RegExp) => { const m = re.exec(html); return m ? decodeEntities(m[1]) : null; };
  return {
    cover: meta(/<meta property="og:image" content="([^"]+)"/),
    published: meta(/"datePublished":"([^"]+)"/),
    modified: meta(/"dateModified":"([^"]+)"/),
    description: meta(/<meta name="description" content="([^"]*)"/),
  };
}

export function extractTitle(md: string): string | null {
  const m = /^#\s+(.+?)\s*$/m.exec(md);
  return m ? m[1].trim() : null;
}

export function collectRemoteImages(md: string): string[] {
  return [...new Set([...md.matchAll(/!\[[^\]]*\]\((https:\/\/cdn\.hashnode\.com\/[^)\s]+)(?:\s+"[^"]*")?\)/g)].map((m) => m[1]))];
}

export function rewriteImages(md: string, map: Map<string, string>): string {
  let out = md;
  for (const [from, to] of map) out = out.split(`](${from}`).join(`](${to}`);
  return out;
}
