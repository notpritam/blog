# Deploying the blog on omni

One Node process behind the shared Caddy, like the other `notpritam.in`
projects. Production port **8798**, dev **8799**.

## 1. Install + build (once, and on each deploy)

```bash
export PATH=/home/pritam/.nvm/versions/node/v24.20.0/bin:$PATH
cd ~/personal/apps/blog
npm ci
npm run typecheck && npm test
npm run build
```

## 2. Environment

`.env` (mode 600, gitignored; shape in `.env.example`):

```
SITE_URL=https://blog.notpritam.in
BLOG_DATA_DIR=/home/pritam/personal/apps/blog/data
```

`BLOG_DATA_DIR` is required in production: `getDb()` refuses to create an empty
database when `NODE_ENV=production` unless `BLOG_ALLOW_EMPTY_DB=1`, so a
misconfigured service fails loudly instead of serving zero posts.

## 3. Service + nightly backup (systemd, survives reboot)

```bash
sudo cp deploy/systemd/blog.service deploy/systemd/blog-backup.service deploy/systemd/blog-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now blog blog-backup.timer
systemctl status blog --no-pager
curl -sI localhost:8798/ | head -1        # HTTP/1.1 200 OK
sudo systemctl start blog-backup          # run one backup now
ls data/backups/
journalctl -u blog -f
```

Backups are full SQLite copies (`data/backups/blog-<stamp>.db`, 14 kept).
Restore: stop the service, copy one over `data/blog.db`, start it.

## 4. Public host (⚠ shared Caddy — gated)

DNS first: `blog.notpritam.in` A → `157.180.102.248`, AAAA →
`2a01:4f9:3090:1055::2` (replacing the Hashnode records). Then add the host
with the guarded, idempotent script — it backs up `/etc/caddy/Caddyfile`,
appends the block, verifies every other project's host is still present
(restores on any loss), validates, and reloads:

```bash
sudo bash deploy/apply-caddy.sh
curl -sI https://blog.notpritam.in/ | head -1
```

Caddy obtains the Let's Encrypt certificate on the first request after DNS
resolves to this box; until then it retries in the background.

## 5. Search engines

- **Google Search Console**: add a *URL-prefix* property for
  `https://blog.notpritam.in`, choose the **HTML tag** method, copy the
  `content` value and store it — it renders on every page:
  `npm run cli -- setting set google_site_verification <value>` — then click
  Verify and submit `https://blog.notpritam.in/sitemap.xml` under Sitemaps.
- **IndexNow** (Bing, Yandex, Seznam, Naver): a key is stored in settings and
  served at `/<key>.txt`; `npm run indexnow` submits every indexable URL.
  Milestone 3 pings it automatically on publish.

## 6. Pre-launch gate

```bash
npm run seo-audit -- https://blog.notpritam.in /<an-article-slug>
```

Fails if Lighthouse Performance, Accessibility, Best Practices or SEO is below
95 on the home page or the article.

## Redeploy

```bash
cd ~/personal/apps/blog && git pull
npm ci && npm run build
sudo systemctl restart blog
```

## Operator CLI (until the admin UI exists)

```bash
npm run cli -- setting get site_title
npm run cli -- setting set site_tagline "…"
npm run cli -- redirect add /tag/reactjs /tag/react
npm run cli -- redirect list
npm run cli -- post feature <slug>      # home-page hero (newest post if none is flagged)
npm run backup
```
