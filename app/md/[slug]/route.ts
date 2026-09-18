import { getDb } from '@/lib/db/client';
import { getPublishedBySlug } from '@/lib/posts/queries';
import { siteUrl } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const post = getPublishedBySlug(getDb(), slug);
  if (!post) return new Response('Not found', { status: 404 });
  const front = `---\ntitle: "${post.title.replace(/"/g, '\\"')}"\n${post.subtitle ? `subtitle: "${post.subtitle.replace(/"/g, '\\"')}"\n` : ''}date: ${post.publishedAt}\nurl: ${siteUrl()}/${post.slug}\ntags: [${post.tags.join(', ')}]\n---\n\n`;
  return new Response(front + `# ${post.title}\n\n` + post.bodyMd, { headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'X-Robots-Tag': 'noindex' } });
}
