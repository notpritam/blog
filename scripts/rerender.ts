import { getDb } from '@/lib/db/client';
import { renderMarkdown } from '@/lib/markdown/render';

/** Re-run the markdown pipeline over every post (after changing the pipeline or its CSS contract). */
async function main() {
  const db = getDb();
  const rows = db.$sqlite.prepare('SELECT id, slug, body_md FROM posts').all() as { id: number; slug: string; body_md: string }[];
  const update = db.$sqlite.prepare('UPDATE posts SET body_html = ?, toc_json = ?, reading_minutes = ?, word_count = ? WHERE id = ?');
  for (const r of rows) {
    const out = await renderMarkdown(r.body_md);
    update.run(out.html, JSON.stringify(out.toc), out.readingMinutes, out.wordCount, r.id);
    console.log(`✓ ${r.slug}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
