import type { TocItem } from '@/lib/markdown/toc';
import type { PostStatus } from '@/lib/db/schema';

export type { PostStatus, TocItem };

export interface PostSummary {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  coverPath: string | null;
  coverAlt: string;
  coverWidth: number | null;
  coverHeight: number | null;
  tags: string[];
  readingMinutes: number;
  publishedAt: string;
  updatedAt: string;
  featured: boolean;
}

export interface PostFull extends PostSummary {
  bodyMd: string;
  bodyHtml: string;
  toc: TocItem[];
  wordCount: number;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  noindex: boolean;
  status: PostStatus;
  createdAt: string;
}
