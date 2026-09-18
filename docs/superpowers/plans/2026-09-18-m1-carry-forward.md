# Milestone 1 → carry-forward

Everything the milestone-1 reviews deferred or parked, so milestone 2–4 planning
starts from it instead of rediscovering it. Source: the SDD ledger for
`2026-09-18-m1-public-site` (deleted after merge) and the final whole-branch
review of `m1-public-site`.

## Fix in milestone 2 (admin, editor, workflow)

- **`upsertPost` explicit `publishedAt: null`** (`lib/posts/write.ts`): the stamp
  guard uses `??`, so a call that passes `publishedAt: null` without `status`
  leaves a published post with no date. Distinguish omitted from null
  (`'publishedAt' in input`) when the editor's write path is built; add a test.
  The publish action must always stamp `published_at`; ordering and
  prev/next queries sort on that column.
- **JSON-LD `BlogPosting.description`** (`lib/seo/jsonld.ts`) falls back to
  `excerpt` while the meta tag uses `subtitle || excerpt`. Align them with the
  SEO-checklist work.
- **Custom accent `<style>` in `app/layout.tsx`** overrides the dark-theme accent
  too; scope it under `[data-theme="dark"]` when the settings UI ships.
- **`ThemeToggle`** initialises its icon to "light" until `useEffect` runs;
  render both icons and switch with CSS. The toggle sits inside
  `<nav aria-label="Primary">`; move utility controls out of the nav.
- **Tag page** shows at most 100 posts with no pagination (`app/tag/[tag]`).
- **`rerender` script** refreshes html/toc/reading time but not `excerpt`; once
  the editor owns explicit excerpts, decide whether derived excerpts re-render.
- **Media store**: `fetchToUpload`'s `?? '.png'` extension fallback stores a
  wrong MIME for URLs without extension or content-type (with `nosniff` the
  browser then refuses it) — fail loudly instead; `source_url` cache hits do
  not check the file still exists; a three-way 8-hex hash collision would hit
  the unique path constraint; sync `fs` writes are fine at this scale.
- **RSS**: `<enclosure length="0">` — carry cover bytes onto `PostFull`.
- **Tests**: explicit-excerpt override of `upsertPost` untested; the importer's
  `main()` has no unit test; e2e fixture ids climb across local runs (harmless);
  `vitest.config.mts` is outside tsconfig `include` (add `**/*.mts`).
- **Slugify** has an unreachable `boundary === undefined` branch; `slugify` gets
  its first real caller in the editor.

## Decide in milestone 3 (agent API / MCP)

- **Markdown trust boundary** — spec §9 now requires `rehype-sanitize` (allowlist)
  or a nonce CSP before any write token exists. Today: raw HTML allowed,
  `'unsafe-inline'` in the CSP, single trusted author, imported content verified
  clean.

## Milestone 4 (deploy) must know

- Deploy with `npx next start -p 8798` and `WorkingDirectory` = app root, **not**
  the standalone bundle (spec §12 amended): `data/`, `public/` and the OG fonts
  under `node_modules/@fontsource` are resolved from `process.cwd()`.
- `BLOG_DATA_DIR` is required in production; `getDb()` throws instead of
  creating an empty DB unless `BLOG_ALLOW_EMPTY_DB=1`.
- `/favicon.ico` is 404 by design (Next serves `/icon.png` and `/apple-icon.png`
  and the layout declares `icons`); add a real `.ico` only if a crawler
  complains.
- Register ports 8798/8799 in `~/personal/CLAUDE.md` (done with milestone 1).
- `llms.txt` advertises `/<slug>.md` URLs that carry `X-Robots-Tag: noindex`;
  `/md/<slug>` is also reachable directly. Both deliberate.
- Public pages are `force-dynamic` (no in-process cache); the `loadAssets` memo
  in the OG route resets itself on failure.

## Dropped (with reasons)

- Image alt text excluded from reading time — more honest for sighted readers.
- `.post-grid` divider duplicates `.dashed-r` — plain CSS was required because
  Tailwind cannot apply a non-utility class through a variant.
- "More writing" shows 2 cards, not the spec's 3 — matches the 2-column grid;
  spec amended.
