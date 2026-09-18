import { PostGrid } from '@/components/posts/post-grid';
import type { PostSummary } from '@/lib/posts/types';
import type { Settings } from '@/lib/settings';

export function MoreWriting({ posts, settings }: { posts: PostSummary[]; settings: Settings }) {
  if (!posts.length) return null;
  return (
    <section className="dashed-t mt-16 pt-6">
      <p className="eyebrow">More writing</p>
      <PostGrid posts={posts} settings={settings} />
    </section>
  );
}
