import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArticleBody } from '@/components/article/article-body';
import { ArticleHeader } from '@/components/article/article-header';
import { TocNav } from '@/components/article/toc-nav';
import { getDb } from '@/lib/db/client';
import { getAnyBySlug } from '@/lib/posts/queries';
import { getSettings, siteUrl } from '@/lib/settings';
import '@/app/article.css';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ key?: string | string[] }> };

/**
 * Key-protected draft preview until the admin (milestone 2) brings per-post tokens.
 * Requires PREVIEW_KEY in the environment and ?key=<PREVIEW_KEY>. Always noindex
 * (also enforced by the X-Robots-Tag header for /preview/* in next.config).
 */
function keyOk(raw: string | string[] | undefined): boolean {
  const expected = process.env.PREVIEW_KEY;
  const key = Array.isArray(raw) ? raw[0] : raw;
  return Boolean(expected && key && key === expected);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Preview · ${slug}`, robots: { index: false, follow: false } };
}

export default async function PreviewPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { key } = await searchParams;
  if (!keyOk(key)) notFound();
  const db = getDb();
  const post = getAnyBySlug(db, slug);
  if (!post) notFound();
  const s = getSettings(db);
  const previewPost = { ...post, publishedAt: post.publishedAt || post.updatedAt };
  return (
    <div className="page-wide">
      <p className="eyebrow dashed-b py-3">
        Preview · status <strong className="text-ink">{post.status}</strong> · not public · updated {new Date(post.updatedAt).toUTCString()}
      </p>
      <div className="grid gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_var(--rail)]">
        <article className="min-w-0 max-w-[var(--page)]">
          <ArticleHeader post={previewPost} settings={s} url={`${siteUrl()}/${post.slug}`} />
          <ArticleBody html={post.bodyHtml} />
          {post.tags.length > 0 && (
            <ul className="mt-12 flex flex-wrap gap-2" aria-label="Tags">
              {post.tags.map((t) => (
                <li key={t}><Link href={`/tag/${encodeURIComponent(t)}`} className="link-hover inline-block border border-dashed border-line px-3 py-1.5 text-[13px]">{t}</Link></li>
              ))}
            </ul>
          )}
        </article>
        <aside className="hidden lg:block">
          <div className="sticky" style={{ top: 'calc(var(--header-h) + 32px)' }}>
            <TocNav items={post.toc} />
          </div>
        </aside>
      </div>
    </div>
  );
}
