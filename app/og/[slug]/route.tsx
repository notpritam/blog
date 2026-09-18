import fs from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { getDb } from '@/lib/db/client';
import { getPublishedBySlug } from '@/lib/posts/queries';
import { formatDate } from '@/lib/format';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

async function font(pkg: string, file: string) {
  return fs.readFile(path.join(process.cwd(), 'node_modules', pkg, 'files', file));
}

async function avatarDataUrl(): Promise<string | null> {
  try {
    const buf = await fs.readFile(path.join(process.cwd(), 'public', 'avatar.jpg'));
    return `data:image/jpeg;base64,${buf.toString('base64')}`;
  } catch { return null; }
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await ctx.params;
  const slug = raw.replace(/\.png$/, '');
  const db = getDb();
  const s = getSettings(db);
  const post = slug === 'site' ? null : getPublishedBySlug(db, slug);
  if (slug !== 'site' && !post) return new Response('Not found', { status: 404 });

  const [tight, mono, avatar] = await Promise.all([
    font('@fontsource/inter-tight', 'inter-tight-latin-600-normal.woff'),
    font('@fontsource/jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff'),
    avatarDataUrl(),
  ]);
  const title = post ? post.title : `${s.site_title} · Blog`;
  const eyebrow = post ? `${formatDate(post.publishedAt)}  ·  ${post.readingMinutes} MIN READ` : s.site_tagline.toUpperCase();
  const size = title.length > 90 ? 44 : title.length > 60 ? 52 : 64;
  const host = new URL(process.env.SITE_URL ?? 'https://blog.notpritam.in').host;

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#ffffff', color: '#111111', padding: 64, fontFamily: 'InterTight' }}>
        <div style={{ position: 'absolute', inset: 24, border: '2px dashed #d4d4d4' }} />
        <div style={{ position: 'absolute', left: 0, top: 0, width: 14, height: 630, background: s.accent }} />
        <div style={{ display: 'flex', fontFamily: 'JetBrainsMono', fontSize: 22, letterSpacing: 1, color: '#707070', textTransform: 'uppercase' }}>{eyebrow}</div>
        <div style={{ display: 'flex', fontSize: size, lineHeight: 1.1, fontWeight: 600, letterSpacing: -1, maxWidth: 1040 }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 26 }}>
            {avatar && <img src={avatar} width={48} height={48} style={{ borderRadius: 999 }} alt="" />}
            <span>{s.author_name}</span>
          </div>
          <div style={{ display: 'flex', fontFamily: 'JetBrainsMono', fontSize: 22, color: '#707070' }}>{host}</div>
        </div>
      </div>
    ),
    {
      width: 1200, height: 630,
      fonts: [{ name: 'InterTight', data: tight, weight: 600, style: 'normal' }, { name: 'JetBrainsMono', data: mono, weight: 400, style: 'normal' }],
      headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' },
    },
  );
}
