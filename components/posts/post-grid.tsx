import type { PostSummary } from '@/lib/posts/types';
import type { Settings } from '@/lib/settings';
import { PostCard } from './post-card';

/** Two editorial columns with full-width rules between rows. */
export function PostGrid({ posts, settings, headingLevel = 'h3' }: { posts: PostSummary[]; settings: Settings; headingLevel?: 'h2' | 'h3' }) {
  if (posts.length === 0) return <p className="py-16 text-text-soft">Nothing here yet.</p>;
  return (
    <div className="post-grid grid md:grid-cols-2">
      {posts.map((p) => <PostCard key={p.id} post={p} settings={settings} headingLevel={headingLevel} />)}
    </div>
  );
}
