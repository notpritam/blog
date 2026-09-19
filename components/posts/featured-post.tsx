import Image from 'next/image';
import Link from 'next/link';
import type { PostSummary } from '@/lib/posts/types';
import type { Settings } from '@/lib/settings';
import { formatDate } from '@/lib/format';

export function FeaturedPost({ post, selections, total, settings }: {
  post: PostSummary;
  selections: PostSummary[];
  total: number;
  settings: Settings;
}) {
  return (
    <article className="editorial-spread" aria-labelledby="featured-title">
      <Link href={`/${post.slug}`} className="editorial-cover" aria-label={`Read: ${post.title}`}>
        {post.coverPath ? (
          <Image src={post.coverPath} alt={post.coverAlt} fill sizes="(min-width: 1800px) 1600px, (min-width: 900px) 1440px, 160vw" className="editorial-cover-image" priority fetchPriority="high" />
        ) : <span className="editorial-cover-fallback" aria-hidden="true">Notes<br />from<br />the build.</span>}
        <span className="editorial-cover-label"><span>{post.featured ? 'Featured story' : 'Latest story'}</span><span aria-hidden="true">↗</span></span>
      </Link>
      <div className="editorial-panel">
        {selections.length > 0 && (
          <nav className="story-strip" aria-label="Selected stories">
            {selections.map((story, index) => (
              <Link key={story.id} href={`/${story.slug}`} className="story-strip-link" aria-label={story.title} title={story.title}>
                <span className="story-strip-image">
                  {story.coverPath ? (
                    <Image src={story.coverPath} alt={story.coverAlt} fill sizes="(min-width: 900px) 36vw, 65vw" />
                  ) : <span className="story-strip-fallback" aria-hidden="true">/{String(index + 2).padStart(2, '0')}</span>}
                </span>
                <span className="story-strip-caption"><span>{story.title}</span><span aria-hidden="true">↗</span></span>
              </Link>
            ))}
          </nav>
        )}
        <div className="editorial-story">
          <span className="editorial-asterisk" aria-hidden="true">✳</span>
          <div className="editorial-story-copy">
            <h1 className="editorial-byline">{settings.site_title}</h1>
            <h2 id="featured-title" className="editorial-title"><Link href={`/${post.slug}`}>{post.title}</Link></h2>
            <p className="editorial-description">{post.subtitle || post.excerpt}</p>
            <Link href={`/${post.slug}`} className="editorial-read">Read the story <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
        <div className="editorial-bottom">
          <span className="editorial-index" aria-hidden="true">/01</span>
          <div className="editorial-details">
            <div>
              <p className="editorial-detail-label">The story</p>
              <p><time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time></p>
              <p>{post.readingMinutes} min read</p>
              <div className="editorial-tags">{post.tags.slice(0, 2).map(tag => <Link key={tag} href={`/tag/${encodeURIComponent(tag)}`}>{tag}</Link>)}</div>
            </div>
            <div>
              <p className="editorial-detail-label">The journal</p>
              <p>{String(total).padStart(2, '0')} published {total === 1 ? 'story' : 'stories'}</p>
              <Link href="/about">A little about me ↗</Link>
              <a href="/rss.xml">Follow via RSS ↗</a>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
