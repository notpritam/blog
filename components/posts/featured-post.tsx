import Image from 'next/image';
import Link from 'next/link';
import type { PostSummary } from '@/lib/posts/types';
import type { Settings } from '@/lib/settings';
import { AuthorChip } from './author-chip';
import { PostDate } from './post-date';

export function FeaturedPost({ post, settings }: { post: PostSummary; settings: Settings }) {
  return (
    <article className="dashed-b grid gap-8 py-12 md:grid-cols-[minmax(0,1fr)_465px] md:items-center">
      <div>
        <PostDate iso={post.publishedAt} />
        <h2 className="h-display mt-4 text-[28px] font-medium leading-[1.25]">
          <Link href={`/${post.slug}`} className="link-hover">{post.title}</Link>
        </h2>
        <p className="mt-4 text-[18px] leading-[27px] text-text-soft">{post.subtitle || post.excerpt}</p>
        <div className="mt-6"><AuthorChip settings={settings} /></div>
      </div>
      {post.coverPath && (
        <Link href={`/${post.slug}`} aria-hidden="true" tabIndex={-1} className="block">
          <Image src={post.coverPath} alt={post.coverAlt} width={465} height={248} sizes="(min-width: 768px) 465px, 100vw" className="aspect-[1.88] w-full object-cover" priority />
        </Link>
      )}
    </article>
  );
}
