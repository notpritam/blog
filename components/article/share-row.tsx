'use client';
import { useState } from 'react';

export function ShareRow({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  const links = [
    { label: 'X', href: `https://x.com/intent/post?text=${enc(title)}&url=${enc(url)}` },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
    { label: 'Hacker News', href: `https://news.ycombinator.com/submitlink?u=${enc(url)}&t=${enc(title)}` },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
      <span className="eyebrow">Share</span>
      {links.map((l) => <a key={l.label} href={l.href} target="_blank" rel="noopener" className="link-hover">{l.label}</a>)}
      <button type="button" className="link-hover" onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  );
}
