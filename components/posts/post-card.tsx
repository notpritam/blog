import Image from 'next/image';
import Link from 'next/link';
import type { PostSummary } from '@/lib/posts/types';
import type { Settings } from '@/lib/settings';
import { AuthorChip } from './author-chip';
import { PostDate } from './post-date';

export function PostCard({ post, settings, headingLevel = 'h3' }: { post: PostSummary; settings: Settings; headingLevel?: 'h2' | 'h3' }) {
  const Heading = headingLevel;
  return (
    <article className="flex h-full flex-col py-10 md:px-8">
      {post.coverPath && (
        <Link href={`/${post.slug}`} aria-hidden="true" tabIndex={-1} className="mb-6 block">
          <Image src={post.coverPath} alt={post.coverAlt} width={604} height={321} sizes="(min-width: 768px) 604px, 100vw" className="aspect-[1.88] w-full border border-line-soft object-cover" />
        </Link>
      )}
      <PostDate iso={post.publishedAt} />
      <Heading className="h-display mt-4 text-[24px] font-medium leading-[33px]">
        <Link href={`/${post.slug}`} className="link-hover">{post.title}</Link>
      </Heading>
      <p className="mt-4 text-[16px] leading-[26px] text-text-soft">{post.subtitle || post.excerpt}</p>
      <div className="mt-auto pt-6"><AuthorChip settings={settings} /></div>
    </article>
  );
}
