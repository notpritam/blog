/**
 * Submit every indexable published URL to IndexNow (Bing, Yandex, Seznam, Naver share the index).
 *   npm run indexnow            # all posts + home + tags
 *   npm run indexnow -- /slug   # specific paths
 * Requires settings.indexnow_key (set with `npm run cli -- setting set indexnow_key <32 hex>`),
 * which is served at /<key>.txt so the engines can verify ownership.
 */
import { getDb } from '@/lib/db/client';
import { listAllPublished, listTags } from '@/lib/posts/queries';
import { getSettings, siteUrl } from '@/lib/settings';

async function main() {
  const db = getDb();
  const key = getSettings(db).indexnow_key;
  if (!/^[a-f0-9]{32}$/.test(key)) throw new Error('settings.indexnow_key must be 32 lowercase hex characters');
  const base = siteUrl();
  const host = new URL(base).host;
  const paths = process.argv.slice(2);
  const urlList = paths.length
    ? paths.map((p) => `${base}${p.startsWith('/') ? p : `/${p}`}`)
    : [`${base}/`, ...listAllPublished(db, { indexableOnly: true }).map((p) => `${base}/${p.slug}`), ...listTags(db).map((t) => `${base}/tag/${encodeURIComponent(t.tag)}`)];
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key, keyLocation: `${base}/${key}.txt`, urlList }),
    signal: AbortSignal.timeout(30_000),
  });
  console.log(`IndexNow ${res.status} ${res.statusText} for ${urlList.length} url(s)`);
  if (res.status >= 400) {
    console.error(await res.text());
    process.exit(1);
  }
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
