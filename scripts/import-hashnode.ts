import { getDb } from '@/lib/db/client';
import { fetchToUpload } from '@/lib/media/store';
import { upsertPost } from '@/lib/posts/write';
import { collectRemoteImages, extractPageMeta, extractTitle, HASHNODE_HOST, HASHNODE_POSTS, normalizeHashnodeImages, rewriteImages, stripLeadingTitle } from './hashnode';

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

async function text(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'user-agent': 'blog-importer/1.0' }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.text();
}

async function main() {
  const db = getDb();
  let hadFailure = false;
  for (const entry of HASHNODE_POSTS) {
    try {
      const [md, html] = await Promise.all([text(`${HASHNODE_HOST}/${entry.slug}.md`), text(`${HASHNODE_HOST}/${entry.slug}`)]);
      const title = extractTitle(md);
      if (!title) throw new Error(`No H1 in ${entry.slug}.md`);
      const meta = extractPageMeta(html);
      if (!meta.published) throw new Error(`No datePublished for ${entry.slug}`);
      let body = normalizeHashnodeImages(stripLeadingTitle(md, title));

      const map = new Map<string, string>();
      for (const url of collectRemoteImages(body)) {
        try {
          const stored = await fetchToUpload(db, url, { createdBy: 'import:hashnode' });
          map.set(url, stored.path);
        } catch (e) {
          console.warn(`  ! image skipped ${url}: ${errorMessage(e)}`);
        }
      }
      body = rewriteImages(body, map);

      let cover: { path: string; width: number | null; height: number | null } | null = null;
      if (meta.cover) cover = await fetchToUpload(db, meta.cover, { alt: entry.coverAlt, createdBy: 'import:hashnode' });

      const id = await upsertPost(
        db,
        {
          slug: entry.slug, title, subtitle: entry.subtitle, bodyMd: body, tags: entry.tags,
          coverPath: cover?.path ?? null, coverAlt: entry.coverAlt, coverWidth: cover?.width ?? null, coverHeight: cover?.height ?? null,
          status: 'published', publishedAt: meta.published, seoDescription: meta.description, createdBy: 'human',
        },
        { author: 'import:hashnode', note: `Imported from ${HASHNODE_HOST}/${entry.slug}` },
      );
      if (meta.modified && meta.modified > meta.published) {
        db.$sqlite.prepare('UPDATE posts SET updated_at = ? WHERE id = ?').run(meta.modified, id);
      } else {
        db.$sqlite.prepare('UPDATE posts SET updated_at = published_at WHERE id = ?').run(id);
      }
      console.log(`✓ ${entry.slug} (#${id}, ${map.size} images, cover ${cover ? 'yes' : 'no'})`);
    } catch (e) {
      hadFailure = true;
      console.error(`✗ ${entry.slug}: ${errorMessage(e)}`);
    }
  }
  if (hadFailure) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
