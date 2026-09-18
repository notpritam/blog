import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { ArticleBody } from '@/components/article/article-body';
import { ArticleHeader } from '@/components/article/article-header';
import { MoreWriting } from '@/components/article/more-writing';
import { PrevNext } from '@/components/article/prev-next';
import { TocNav } from '@/components/article/toc-nav';
import { JsonLd } from '@/components/seo/json-ld';
import { getDb } from '@/lib/db/client';
import { getAdjacent, getPublishedBySlug, getRedirect, listRelated } from '@/lib/posts/queries';
import { blogPostingJsonLd, breadcrumbJsonLd } from '@/lib/seo/jsonld';
import { getSettings, siteUrl } from '@/lib/settings';
import '@/app/article.css';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const db = getDb();
  const post = getPublishedBySlug(db, slug);
  if (!post) return { title: 'Not found', robots: { index: false } };
  const s = getSettings(db);
  const base = siteUrl();
  const url = `${base}/${post.slug}`;
  const title = post.seoTitle ?? post.title;
  const description = post.seoDescription ?? post.subtitle ?? post.excerpt;
  const og = `${base}/og/${post.slug}.png`;
  return {
    title,
    description,
    alternates: { canonical: post.canonicalUrl ?? url },
    robots: post.noindex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      type: 'article', url, title, description, siteName: s.site_title,
      publishedTime: post.publishedAt, modifiedTime: post.updatedAt, authors: [s.author_url], tags: post.tags,
      images: [{ url: og, width: 1200, height: 630, alt: post.title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [og] },
  };
}

export default async function ArticlePage({ params }: Params) {
  const { slug } = await params;
  const db = getDb();
  const post = getPublishedBySlug(db, slug);
  if (!post) {
    const r = getRedirect(db, `/${slug}`);
    if (r) (r.code === 301 ? permanentRedirect : redirect)(r.toPath);
    notFound();
  }
  const s = getSettings(db);
  const base = siteUrl();
  const url = `${base}/${post.slug}`;
  const { older, newer } = getAdjacent(db, post);
  const related = listRelated(db, post, 2);
  return (
    <div className="page-wide">
      <JsonLd data={[blogPostingJsonLd(post, s, base), breadcrumbJsonLd([{ name: 'Writing', url: `${base}/` }, { name: post.title, url }])]} />
      <div className="grid gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_var(--rail)]">
        <article className="min-w-0 max-w-[var(--page)]">
          <ArticleHeader post={post} settings={s} url={url} />
          <ArticleBody html={post.bodyHtml} />
          {post.tags.length > 0 && (
            <ul className="mt-12 flex flex-wrap gap-2" aria-label="Tags">
              {post.tags.map((t) => (
                <li key={t}><Link href={`/tag/${t}`} className="link-hover inline-block border border-dashed border-line px-3 py-1.5 text-[13px]">{t}</Link></li>
              ))}
            </ul>
          )}
          <PrevNext older={older} newer={newer} />
          <MoreWriting posts={related} settings={s} />
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
