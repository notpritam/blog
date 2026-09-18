import Link from 'next/link';
import type { PostSummary } from '@/lib/posts/types';
import type { Settings } from '@/lib/settings';
import { AuthorChip } from './author-chip';
import { PostDate } from './post-date';

export function PostCard({ post, settings }: { post: PostSummary; settings: Settings }) {
  return (
    <article className="flex h-full flex-col py-10 md:px-8">
      <PostDate iso={post.publishedAt} />
      <h3 className="h-display mt-4 text-[24px] font-medium leading-[33px]">
        <Link href={`/${post.slug}`} className="link-hover">{post.title}</Link>
      </h3>
      <p className="mt-4 text-[16px] leading-[26px] text-text-soft">{post.subtitle || post.excerpt}</p>
      <div className="mt-auto pt-6"><AuthorChip settings={settings} /></div>
    </article>
  );
}
