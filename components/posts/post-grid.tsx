import type { PostSummary } from '@/lib/posts/types';
import type { Settings } from '@/lib/settings';
import { PostCard } from './post-card';

/** Two columns with a dashed vertical divider between the columns and dashed rows between pairs. */
export function PostGrid({ posts, settings }: { posts: PostSummary[]; settings: Settings }) {
  if (posts.length === 0) return <p className="py-16 text-text-soft">Nothing here yet.</p>;
  return (
    <div className="post-grid grid md:grid-cols-2">
      {posts.map((p) => <PostCard key={p.id} post={p} settings={settings} />)}
    </div>
  );
}
