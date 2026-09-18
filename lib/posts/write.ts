import { eq } from 'drizzle-orm';
import type { Db } from '@/lib/db/client';
import { postTags, posts, revisions, type PostStatus } from '@/lib/db/schema';
import { renderMarkdown } from '@/lib/markdown/render';

export interface PostInput {
  slug: string;
  title: string;
  bodyMd: string;
  subtitle?: string;
  excerpt?: string;
  coverPath?: string | null;
  coverAlt?: string;
  coverWidth?: number | null;
  coverHeight?: number | null;
  tags?: string[];
  status?: PostStatus;
  publishedAt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  createdBy?: string;
  featured?: boolean;
  noindex?: boolean;
}

export interface WriteOpts { author?: string; note?: string }

/** Insert or update a post by slug. Renders markdown, writes tags and a revision. Returns the post id. */
export async function upsertPost(db: Db, input: PostInput, opts: WriteOpts = {}): Promise<number> {
  const rendered = await renderMarkdown(input.bodyMd);
  const now = new Date().toISOString();
  const existing = db.select({ id: posts.id }).from(posts).where(eq(posts.slug, input.slug)).get();
  const values = {
    title: input.title,
    subtitle: input.subtitle ?? '',
    bodyMd: input.bodyMd,
    bodyHtml: rendered.html,
    tocJson: JSON.stringify(rendered.toc),
    excerpt: input.excerpt?.trim() || rendered.excerpt,
    readingMinutes: rendered.readingMinutes,
    wordCount: rendered.wordCount,
    updatedAt: now,
    ...(input.coverPath !== undefined && { coverPath: input.coverPath }),
    ...(input.coverAlt !== undefined && { coverAlt: input.coverAlt }),
    ...(input.coverWidth !== undefined && { coverWidth: input.coverWidth }),
    ...(input.coverHeight !== undefined && { coverHeight: input.coverHeight }),
    ...(input.status !== undefined && { status: input.status }),
    ...(input.publishedAt !== undefined && { publishedAt: input.publishedAt }),
    ...(input.seoTitle !== undefined && { seoTitle: input.seoTitle }),
    ...(input.seoDescription !== undefined && { seoDescription: input.seoDescription }),
    ...(input.canonicalUrl !== undefined && { canonicalUrl: input.canonicalUrl }),
    ...(input.featured !== undefined && { featured: input.featured }),
    ...(input.noindex !== undefined && { noindex: input.noindex }),
  };
  const id = db.transaction((tx) => {
    let id: number;
    if (existing) {
      tx.update(posts).set(values).where(eq(posts.id, existing.id)).run();
      id = existing.id;
    } else {
      id = tx.insert(posts).values({ slug: input.slug, createdBy: input.createdBy ?? 'human', ...values }).returning({ id: posts.id }).get().id;
    }
    if (input.tags) {
      tx.delete(postTags).where(eq(postTags.postId, id)).run();
      const clean = [...new Set(input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
      if (clean.length) tx.insert(postTags).values(clean.map((tag) => ({ postId: id, tag }))).run();
    }
    tx.insert(revisions).values({
      postId: id, title: values.title, subtitle: values.subtitle, excerpt: values.excerpt, bodyMd: input.bodyMd,
      author: opts.author ?? 'human', note: opts.note ?? '',
    }).run();
    return id;
  });
  return id;
}
