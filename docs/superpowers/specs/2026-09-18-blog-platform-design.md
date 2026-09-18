# Blog platform — design

**Date:** 2026-09-18
**Status:** proposed, awaiting approval
**Replaces:** the Hashnode publication at `blog.notpritam.in`
**Repo:** `notpritam/blog` → `~/personal/apps/blog`

## 1. Goal

A self-hosted blog at `blog.notpritam.in` that Pritam owns end to end, where
Claude agents draft and revise posts, Pritam reviews with inline comments and
approves, and publishing is one click. Public pages look like
`blog.cloudflare.com`. SEO is complete on day one.

Out of scope for v1: newsletter/email subscriptions, member accounts,
reader comments, multi-author permissions, analytics dashboards, calling an
LLM API directly from the service (all AI work runs through bb threads).

## 2. Decisions already made (from the brainstorm)

| Question | Decision |
|---|---|
| Public UI | Replicate the structure and type system of blog.cloudflare.com |
| Hosting | omni, systemd + shared Caddy, SQLite on disk |
| AI loop | (a) MCP + HTTP API with tokens, (b) "Send to Claude" button, (c) scheduled writing routine |
| SEO | Top-notch, out of the box (added mid-brainstorm) |
| Domain | Keep `blog.notpritam.in`; keep the four existing slugs |

## 3. Approaches considered

**A. One Next.js process on omni (chosen).** Public site, admin, REST API and
MCP endpoint in one App Router app; SQLite via better-sqlite3 + Drizzle; one
systemd unit; one Caddy host. Same framework as the portfolio, so patterns and
`next/og`, `next/font`, `next/image`, metadata/sitemap/robots routes come for
free. SSR with on-publish cache invalidation gives static-grade SEO without a
build step per post.

**B. Astro public site + separate admin/API server.** Best raw static
performance, but three deployables, draft previews need cross-service plumbing,
and every publish becomes a rebuild. Not worth it for a single-author blog.

**C. Markdown in git, review by pull request.** Simplest AI loop, but no
editor, no inline comments, and "approve" is a merge. Does not match the ask.

## 4. Architecture

```
blog.notpritam.in ──Caddy──▶ :8798  Next.js 15 (Node 24, systemd `blog.service`)
                                       ├── /            public site (server components)
                                       ├── /admin/*     editor + review (cookie session)
                                       ├── /api/v1/*    REST for agents (bearer token)
                                       ├── /mcp         MCP Streamable HTTP (bearer token)
                                       ├── /uploads/*   media (served from data/uploads)
                                       └── data/blog.db SQLite (WAL) + data/uploads/
bb (same box) ◀── `bb thread spawn` from "Send to Claude"
bb automation ──▶ weekly "draft from backlog" agent run ──▶ /mcp
```

Layout in the repo:

```
apps/blog/
  app/                 routes (public, admin, api, mcp, og, feeds)
  components/          public/ admin/ editor/ ui/
  lib/                 db/ (schema, migrations, queries) markdown/ seo/ auth/ workflow/ mcp/ bb/
  scripts/             import-hashnode.ts, backup-db.sh, seed-dev.ts
  deploy/              systemd/blog.service, apply-caddy.sh, Caddyfile.blog, automations/weekly-draft.md, README.md
  data/                blog.db, uploads/ (gitignored)
  docs/                superpowers/specs, superpowers/plans, agent-guide.md
  AGENTS.md            how an agent works with this blog (also mirrored as a bb skill later)
  tests/               vitest unit + playwright e2e
```

Ports: **8798** production, **8799** dev. Both added to `~/personal/CLAUDE.md`.

## 5. Data model (SQLite, Drizzle)

- **posts** — id, slug (unique), title, subtitle, body_md, excerpt, cover_path,
  cover_alt, status (`draft|in_review|changes_requested|approved|published|archived`),
  reading_minutes, published_at, updated_at, created_at, created_by (`human` |
  `agent:<token name>`), seo_title, seo_description, canonical_url (optional
  override), noindex (bool), featured (bool).
- **post_tags** — post_id, tag (lowercase slug). Tags are free-form; a tag page
  exists for every tag with ≥1 published post.
- **revisions** — id, post_id, body_md, title, subtitle, excerpt, author,
  note, created_at. One row per save; the editor shows a diff between any two.
- **comments** — id, post_id, revision_id, author, body, anchor_quote (exact
  selected text, nullable for general comments), anchor_prefix / anchor_suffix
  (≤64 chars each, for re-anchoring after edits), status (`open|resolved`),
  parent_id (replies), created_at, resolved_at, resolved_by.
- **ideas** — id, title, notes, priority (1-3), status
  (`backlog|picked|drafted|dropped`), post_id (once drafted), created_at.
- **media** — id, path, alt, width, height, bytes, mime, created_at, created_by.
- **api_tokens** — id, name, hash (sha256), scopes (`read`, `write`, `publish`),
  last_used_at, created_at, revoked_at.
- **redirects** — from_path (unique), to_path, code (301|302).
- **agent_runs** — id, post_id, kind (`send_to_claude|scheduled`), bb_thread_id,
  status, created_at, finished_at, summary.
- **settings** — key/value (site title, tagline, author name/bio/avatar, social
  links, Google site-verification token, IndexNow key, theme accent).
- **posts_fts** — FTS5 virtual table over title, subtitle, excerpt, body_md,
  kept in sync by triggers; powers `/search`.

Migrations are Drizzle SQL files committed to the repo and applied on boot.
`scripts/backup-db.sh` runs `sqlite3 .backup` nightly via a systemd timer into
`data/backups/` (keep 14).

## 6. Editorial workflow

```
draft ──submit──▶ in_review ──approve──▶ approved ──publish──▶ published
  ▲                  │                                             │
  └──────────────────┴─ request changes ─▶ changes_requested       │ unpublish
                                                                   ▼
                                                                 draft
any ──▶ archived
```

- Anyone (human or agent) can create and edit drafts. Every save writes a
  revision.
- `submit` moves to `in_review`. Agents normally stop here.
- Only the human (admin session) can `approve` or `request changes`.
  `request changes` requires at least one open comment or a note.
- `publish` requires `approved`, except an admin session may publish directly
  from any state ("publish now"). A token with the `publish` scope may publish
  an `approved` post; it cannot skip approval.
- Editing a published post stays live; the editor shows "published, with
  unpublished edits" and offers "update live" (creates a new revision and
  bumps `updated_at`/`dateModified`).
- On publish/update: invalidate caches for `/`, the post, its tags,
  `/sitemap.xml`, feeds; regenerate the OG image; ping IndexNow; record an
  `agent_runs`-style audit entry.

## 7. Public site (Cloudflare-blog look)

Reference measurements captured 2026-09-18 from blog.cloudflare.com at 1440px:

- **Type:** Inter Tight (headings, 500/600), Inter (body 16px/28px, excerpts
  18px/27px), JetBrains Mono (code 14px; uppercase dates 12px, letter-spacing
  0.3px, color #707070). Self-hosted via `next/font`.
- **Color:** white page, text #111 (headings) / #262626 (body) / #707070 (meta),
  hairlines #d4d4d4 **dashed** (1px dashed borders between rows and between grid
  columns are the signature), footer #f6f6f7. One accent color used only for
  the logo mark, primary button and link hover — token `--accent`, default
  `#b64326` (the portfolio's terracotta, so it is not Cloudflare's trademark
  orange). Dark theme via `prefers-color-scheme` plus a toggle; same tokens
  inverted.
- **Header:** 72px, dashed bottom border, wordmark/avatar + "Pritam Sharma"
  left, nav right (Writing, Tags, About, Search, RSS, theme toggle). Sticky.
- **Home `/`:** page title 36px + tagline 18px in a hero band; then the latest
  post as a featured row (date, 28px title, excerpt, author chip left; cover
  465×248 right); then a 2-column grid of posts (date, 24px title, excerpt,
  author chip), dashed dividers; "Older posts" pagination (10 per page) at
  `/page/2`.
- **Article `/<slug>`:** 930px content column + 230px sticky "On this page" TOC
  on the right (hidden <1024px). Date, 42px title, subtitle, author row
  (avatar, name, reading time, share to X / LinkedIn / HN, copy link), cover,
  body at 715px measure: h2 36px/600 with 80px top margin and copy-link
  anchors, h3 24px, code blocks Shiki-highlighted with 1px border and 6px
  radius plus a copy button, tables, callouts (`> [!NOTE]`), images with
  captions, footnotes. Below: tags, "Previous / Next", "More writing" (3
  cards). Footer with links and RSS.
- **Tag `/tag/<tag>`, search `/search?q=`, about `/about`** (author bio from
  settings), `/rss.xml`, `/feed.json`, `/sitemap.xml`, `/robots.txt`,
  `/llms.txt`, `/og/<slug>.png`.
- **Preview `/preview/<token>`:** renders any draft with the real article
  template; `noindex`, token per post, revocable.
- Public routes ship near-zero client JS: theme toggle, TOC scroll-spy,
  copy buttons and the search box are the only islands.

## 8. Admin

Cookie session (`iron-session`-style, HttpOnly, SameSite=Lax, 30 days) behind
`/admin`. Single admin: password (argon2 hash) held in `ADMIN_PASSWORD_HASH` in
`.env`; login at `/admin/login`; rate-limited. Every admin/api/preview response
carries `X-Robots-Tag: noindex, nofollow`.

Pages:

- `/admin` — queue: posts awaiting review, posts with open comments, recent
  agent runs, backlog count, quick "New post" / "New idea".
- `/admin/posts` — table with status filter, search, sort; bulk archive.
- `/admin/posts/[id]` — **editor**: CodeMirror 6 Markdown pane left (toolbar for
  headings/bold/link/code/image, `/` snippets, paste/drag image upload,
  autosave every 5s of change), live preview right rendered by the same
  pipeline as the public page. Right rail tabs: **Details** (title, subtitle,
  slug with availability check, excerpt, cover + alt, tags, featured),
  **SEO** (checklist below, live-scored), **Comments** (open/resolved, jump to
  anchor, reply, resolve), **History** (revisions, diff any two, restore).
  Status bar with the workflow actions, Preview link, and **Send to Claude**.
- `/admin/posts/[id]/review` — **reading view**: the exact public template with
  select-text-to-comment (floating "Comment" button on selection; comments
  stored with quote + prefix/suffix), a comments sidebar, and the
  Approve / Request changes / Publish actions. This is where Pritam reviews.
- `/admin/ideas` — backlog kanban (backlog / picked / drafted / dropped),
  priority, notes; agents read this for the scheduled routine.
- `/admin/media` — grid of uploads, alt editing, copy Markdown snippet.
- `/admin/settings` — site identity, author, social links, accent color, API
  tokens (create/revoke, show once), redirects, Google verification token,
  IndexNow key, bb integration (project id, provider/model for spawned threads).

**Send to Claude:** POST `/api/admin/posts/[id]/send-to-claude` with an optional
instruction. The server builds a prompt (post id, slug, title, current status,
all open comments with quotes, the instruction, and the API/MCP URL) and runs
`bb thread spawn --project <id> --title "Blog · revise: <title>" --prompt ...`
using `BB_CLI` from the service environment. The thread id is stored in
`agent_runs` and shown on the post with an "open in bb" link. The agent finds
its token in the prompt reference (token name only) and reads the actual secret
from `~/personal/apps/blog/.agent-token` (mode 600, created by settings when a
token is marked "default agent token"). Spawn failures surface as a toast with
the stderr.

**SEO checklist (editor, live):** title 20-60 chars; seo_description 50-160;
slug ≤ 6 words, lowercase, no stopword bloat; cover present with alt; excerpt
present; first paragraph ≤ 60 words and contains the topic; at least two h2;
no skipped heading levels; every image has alt; ≥1 internal link to another
post (when ≥2 posts exist); links have descriptive text (no "here"); reading
time; tags 1-5; canonical resolved. Each item is pass/warn/fail with a fix hint.
`seo_check` is also exposed to agents so Claude fixes issues before submitting.

## 9. Agent surface

Auth: `Authorization: Bearer <token>`; scopes `read`, `write`, `publish`.
Tokens hashed at rest; `last_used_at` updated per call.

REST (`/api/v1`): `GET /posts?status=`, `GET /posts/:id`, `POST /posts`,
`PATCH /posts/:id` (fields + `body_md`, `note`), `POST /posts/:id/submit`,
`POST /posts/:id/publish`, `GET /posts/:id/comments`, `POST /comments/:id/reply`,
`POST /comments/:id/resolve`, `GET /ideas`, `PATCH /ideas/:id`, `POST /media`
(multipart or `{url}` fetch), `POST /posts/:id/seo-check`, `GET /me`.

MCP (`/mcp`, Streamable HTTP, `@modelcontextprotocol/sdk`): tools mirror the
REST surface one-to-one: `list_posts`, `get_post`, `create_post`,
`update_post`, `submit_for_review`, `publish_post`, `list_comments`,
`reply_comment`, `resolve_comment`, `list_ideas`, `update_idea`,
`upload_media`, `seo_check`, `site_info`. Resources: `blog://posts/{id}`,
`blog://style-guide` (voice, formatting rules, Markdown extensions supported).

`AGENTS.md` at the repo root documents the loop for any agent: read style
guide → pick idea or take instruction → draft with Markdown → `seo_check` →
`submit_for_review` → on "changes requested" read comments, revise, reply,
resolve → resubmit. Publishing after approval is Pritam's click by default.

**Scheduled routine:** `bb automation create --project <id> --name blog-weekly-draft
--cron "0 9 * * 1" --timezone Asia/Kolkata --prompt "$(cat deploy/automations/weekly-draft.md)"
--provider claude-code --model <model> --permission-mode auto`. The prompt: connect to the MCP,
list `backlog` ideas by priority, pick one, mark it `picked`, draft, run
`seo_check`, submit for review, set the idea to `drafted`, and post a one-line
summary. If the backlog is empty, propose three ideas as `backlog` entries
instead and stop. The automation is created once by hand (documented in
`deploy/README.md`); its prompt lives in the repo.

## 10. SEO and performance (out of the box)

- Every public page server-rendered with full HTML; cached in-process and
  invalidated on publish (`revalidateTag`).
- `generateMetadata` per route: `<title>` ("Post title — Pritam Sharma"),
  description, canonical, `robots`, Open Graph (`article` type,
  published/modified time, author, tags, 1200×630 image), Twitter
  `summary_large_image`, RSS/JSON feed `<link rel=alternate>`.
- JSON-LD: `WebSite` + `Person` (site-wide, `sameAs` to GitHub/LinkedIn/X and
  notpritam.in), `BlogPosting` per article (headline, description, image,
  datePublished, dateModified, author, publisher, keywords, wordCount,
  mainEntityOfPage), `BreadcrumbList`, `CollectionPage` on tag pages.
- `/sitemap.xml` with `lastmod`; `/robots.txt` allowing everything public and
  disallowing `/admin`, `/api`, `/preview`; `/rss.xml` (full content),
  `/feed.json`; `/llms.txt`.
- OG image per post via `next/og` in the site's type system (title, date,
  author, wordmark); regenerated on publish; cached on disk.
- Redirects table served by middleware with 301s; the four Hashnode slugs are
  preserved so no redirects are needed for them; `?source=`/tracking params are
  stripped from canonical.
- Core Web Vitals: self-hosted fonts with `display: swap` and preloaded
  subsets, `next/image` with local sharp optimization (AVIF/WebP, explicit
  width/height, priority on the cover), no third-party scripts, critical CSS
  inlined by Next, HTML `lang`, semantic landmarks, skip link, focus styles.
- Google Search Console: verification `<meta>` from settings; `deploy/README.md`
  walks through submitting the sitemap once. IndexNow ping (Bing and partners)
  on every publish/update with the key file served at `/<key>.txt`.
- Security headers via Next config: CSP (self + data: + blob:), HSTS is Caddy's,
  `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options`.
- A `scripts/seo-audit.ts` runs Lighthouse (via `chrome-launcher`) against a URL
  and fails under 95 on Performance/SEO/Best Practices/Accessibility; used as
  a pre-launch gate and re-runnable after any template change.

## 11. Migration from Hashnode

`scripts/import-hashnode.ts`: for each of the four slugs, fetch
`https://blog.notpritam.in/<slug>.md` (Hashnode serves Markdown), fetch the
cover from the Hashnode CDN into `data/uploads/covers/`, rewrite in-body
`cdn.hashnode.com` images to local uploads, set `published_at` from the known
dates (2024-03-08, 2026-04-13, 2026-05-21, 2026-07-01), derive tags from the
existing portfolio `blog-data.ts` topics, and insert as `published`. Idempotent
(upsert by slug). Verified by rendering each post and diffing headings against
the source.

Cutover (Pritam's manual step, documented): change the `blog` A/AAAA records
from Hashnode (216.198.79.x) to omni (157.180.102.248 / 2a01:4f9:3090:1055::2);
Caddy issues the certificate on first request. Until then the site is verified
via `bb connect expose 8798` and `curl --resolve`.

Follow-up outside this spec: point the portfolio's `lib/hashnode.ts` and
`app/blog-data.ts` at `https://blog.notpritam.in/feed.json`.

## 12. Deployment

- `deploy/systemd/blog.service`: `User=pritam`, `WorkingDirectory=~/personal/apps/blog`,
  `EnvironmentFile=.env`, `ExecStart=/home/pritam/.nvm/versions/node/v24.20.0/bin/node .next/standalone/server.js`,
  `Environment=PORT=8798 BB_CLI=/home/pritam/bb-server/node_modules/bb-app/host-daemon/dist/bb`,
  `Restart=always`. Plus `blog-backup.timer`.
- `deploy/apply-caddy.sh`: same guarded pattern as rig — timestamped backup,
  idempotent host block append, verify every other host is still present,
  `caddy validate`, reload.
- `.env` (mode 600, gitignored; `.env.example` committed): `ADMIN_PASSWORD_HASH`,
  `SESSION_SECRET`, `SITE_URL=https://blog.notpritam.in`, `INDEXNOW_KEY`,
  `BB_PROJECT_ID`, `BB_PROVIDER`, `BB_MODEL`.
- `deploy/README.md`: install, build, service, Caddy, DNS cutover, Search
  Console submission, automation creation, redeploy, backup restore.

## 13. Error handling

- API/MCP: typed error envelope `{error: {code, message, field?}}`; 401 for bad
  token, 403 for missing scope, 409 for invalid workflow transitions and slug
  collisions, 422 for validation with field names. MCP tools return
  `isError: true` with the same message so Claude can self-correct.
- Editor autosave: optimistic, retries with backoff, shows "unsaved" state;
  conflicts (revision changed underneath, e.g. an agent saved) show a diff and
  offer "keep mine" / "take theirs" / "merge in editor".
- Comment anchors that no longer match after edits are shown as "orphaned"
  with the original quote, never dropped.
- `bb thread spawn` failure: surfaced verbatim, run recorded as `failed`.
- IndexNow/OG failures never block publishing; they are retried by a small
  in-process queue and logged.
- Public 404 uses the site template and suggests search; unknown old paths
  are checked against `redirects` first.

## 14. Testing

- **Unit (vitest):** Markdown pipeline (headings/TOC/callouts/footnotes/code),
  slugify, reading time, SEO checklist rules, workflow transition table, token
  hashing/scopes, comment re-anchoring, redirect matching, feed/sitemap
  builders, JSON-LD builders.
- **API/MCP integration (vitest + in-memory SQLite):** every route and tool,
  including scope enforcement and workflow guards.
- **E2E (Playwright, dev port 8799, fresh DB):** login; create → edit → submit;
  review: select text → comment → request changes; agent (API) replies and
  resubmits; approve → publish; public page renders with correct metadata and
  JSON-LD; search; tag page; RSS validates; preview token works and is noindex.
- **Pre-launch gate:** `scripts/seo-audit.ts` ≥ 95 on all four Lighthouse
  categories for `/` and one article; `npm run verify` = typecheck + unit +
  integration + e2e.
- **Visual check:** side-by-side screenshots of blog.cloudflare.com and the
  new home/article at 1440px and 390px, reviewed by Pritam before DNS cutover.

## 15. Milestones (for the implementation plan)

1. Scaffold, DB schema + migrations, Markdown pipeline, public templates with
   the imported four posts, feeds/sitemap/OG/JSON-LD. Deployable read-only
   blog.
2. Admin: auth, editor, review view with comments, workflow, media, settings,
   SEO checklist.
3. Agent surface: tokens, REST, MCP, `AGENTS.md`; Send to Claude; automation
   prompt + creation doc.
4. Deploy: systemd, Caddy script, backups, Lighthouse gate, docs, CLAUDE.md
   port table; Pritam flips DNS.
