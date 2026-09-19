# blog

The blog at https://blog.notpritam.in. Next.js 15 + SQLite. Markdown is the source of truth; HTML is rendered on write.

## Develop

    export PATH=/home/pritam/.nvm/versions/node/v24.20.0/bin:$PATH
    npm ci
    npm run dev              # http://localhost:8799
    npm test                 # unit (vitest)
    npm run test:e2e         # playwright against a seeded .e2e-data/
    npm run verify           # typecheck + unit + build + e2e

Data lives in `data/` (`blog.db`, `uploads/`), or wherever `BLOG_DATA_DIR` points. In production, `BLOG_DATA_DIR` must be set to the real data directory (an absolute path) or the app refuses to start with an empty database, unless `BLOG_ALLOW_EMPTY_DB=1` is set.

## Content

    npm run import:hashnode  # historical: the Hashnode source redirected to this blog after the DNS cutover (Sept 2026); the script now refuses to run
    npm run rerender         # re-run the markdown pipeline over every post

## Routes

`/`, `/page/N`, `/<slug>`, `/<slug>.md`, `/tag/<tag>`, `/tags`, `/search?q=`, `/about`,
`/rss.xml`, `/feed.json`, `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/og/<slug>.png`, `/uploads/…`.

Design and plans: `docs/superpowers/`.

Deploy (systemd + shared Caddy on omni, port 8798): `deploy/README.md`.
