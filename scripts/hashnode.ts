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

/**
 * Hashnode's `.md` export is not CommonMark: every image is written as
 * `![alt](URL align="center")` (or with other trailing attribute="value" pairs), which
 * standard markdown parsers read as literal text rather than an `<img>` — the destination
 * only extends to the first whitespace, so everything after it, including a real `"title"`,
 * fails to parse as a link title. Strip the non-standard attribute list, keeping the URL
 * and a leading quoted title if one is present.
 */
export function normalizeHashnodeImages(md: string): string {
  return md.replace(
    /!\[([^\]]*)\]\((\S+)(?:\s+"([^"]*)")?(?:\s+[a-zA-Z][\w-]*="[^"]*")+\)/g,
    (_m, alt: string, url: string, title?: string) => (title ? `![${alt}](${url} "${title}")` : `![${alt}](${url})`),
  );
}

/**
 * Every image the post depends on, from any remote host — the blog must own all of its own
 * assets. The URL body allows one level of balanced parentheses (e.g. `img_(1).png`) so a
 * literal `)` inside the URL itself isn't mistaken for the closing paren of the markdown
 * image syntax, which would otherwise truncate the captured URL.
 */
export function collectRemoteImages(md: string): string[] {
  return [
    ...new Set(
      [...md.matchAll(/!\[[^\]]*\]\((https?:\/\/(?:[^\s()]|\([^\s()]*\))+)(?:\s+"[^"]*")?\)/g)].map((m) => m[1]),
    ),
  ];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A plain `split(...).join(...)` has no end-of-URL boundary, so a URL that is a prefix of
 * another (e.g. `https://x.png` vs `https://x.png?v=2`) would have the shorter one's
 * replacement bleed into the longer one. Process the longest URLs first, and anchor each
 * replacement so it only matches where the URL is actually followed by the closing `)` or
 * whitespace before a title — never mid-URL.
 */
export function rewriteImages(md: string, map: Map<string, string>): string {
  let out = md;
  const entries = [...map.entries()].sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of entries) {
    const re = new RegExp('\\]\\(' + escapeRegExp(from) + '(?=[)\\s])', 'g');
    out = out.replace(re, () => `](${to}`);
  }
  return out;
}
