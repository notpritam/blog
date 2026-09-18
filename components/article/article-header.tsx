import Image from 'next/image';
import { AuthorChip } from '@/components/posts/author-chip';
import { PostDate } from '@/components/posts/post-date';
import type { PostFull } from '@/lib/posts/types';
import type { Settings } from '@/lib/settings';
import { ShareRow } from './share-row';

export function ArticleHeader({ post, settings, url }: { post: PostFull; settings: Settings; url: string }) {
  return (
    <header>
      <PostDate iso={post.publishedAt} readingMinutes={post.readingMinutes} />
      <h1 className="h-display mt-5 text-[32px] font-medium leading-[1.1] md:text-[42px]">{post.title}</h1>
      {post.subtitle && <p className="mt-4 text-[20px] leading-[30px] text-text-soft">{post.subtitle}</p>}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <AuthorChip settings={settings} size={36} />
        <ShareRow url={url} title={post.title} />
      </div>
      {post.coverPath && (
        <figure className="mt-10">
          <Image src={post.coverPath} alt={post.coverAlt} width={post.coverWidth ?? 1440} height={post.coverHeight ?? 810} sizes="(min-width: 1024px) 930px, 100vw" priority className="w-full border border-line-soft" />
        </figure>
      )}
    </header>
  );
}
