/**
 * Pre-launch gate (spec §14): Lighthouse must score ≥ 95 in Performance, SEO,
 * Best Practices and Accessibility for the home page and one article.
 *
 *   npm run seo-audit -- https://blog.notpritam.in [/some-article-slug] [--min 95]
 *
 * Uses the Playwright-managed Chromium if CHROME_PATH is not set.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Lighthouse is driven through its CLI in a child process: importing it under
// tsx/esbuild breaks the functions it serialises into the page (`__name`).

const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'] as const;

type Lhr = {
  categories: Record<string, { score: number | null; auditRefs: { id: string; weight?: number }[] }>;
  audits: Record<string, { id: string; title: string; score: number | null; displayValue?: string }>;
};

function findChrome(): string | undefined {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const root = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (!fs.existsSync(root)) return undefined;
  const dirs = fs.readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse();
  for (const d of dirs) {
    for (const sub of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
      const p = path.join(root, d, sub);
      if (fs.existsSync(p)) return p;
    }
  }
  return undefined;
}

function runLighthouse(url: string, chromePath: string | undefined): Lhr {
  const cli = path.join(process.cwd(), 'node_modules', 'lighthouse', 'cli', 'index.js');
  const out = path.join(os.tmpdir(), `lh-${process.pid}-${Date.now()}.json`);
  const res = spawnSync(process.execPath, [
    cli, url, '--output=json', `--output-path=${out}`, '--quiet',
    `--only-categories=${CATEGORIES.join(',')}`,
    '--chrome-flags=--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage',
  ], { env: { ...process.env, ...(chromePath && { CHROME_PATH: chromePath }) }, stdio: ['ignore', 'inherit', 'inherit'], timeout: 180_000 });
  if (res.status !== 0 || !fs.existsSync(out)) throw new Error(`lighthouse exited ${res.status} for ${url}`);
  const lhr = JSON.parse(fs.readFileSync(out, 'utf8')) as Lhr;
  fs.unlinkSync(out);
  return lhr;
}

async function main() {
  const args = process.argv.slice(2);
  const minIdx = args.indexOf('--min');
  const min = minIdx >= 0 ? Number(args.splice(minIdx, 2)[1]) : 95;
  const [base, article] = args;
  if (!base) throw new Error('usage: seo-audit <base-url> [/article-slug] [--min 95]');
  const urls = [new URL('/', base).toString()];
  if (article) urls.push(new URL(article, base).toString());

  const chromePath = findChrome();
  let failed = false;
  for (const url of urls) {
    const lhr = runLighthouse(url, chromePath);
    const scores = CATEGORIES.map((c) => [c, Math.round((lhr.categories[c]?.score ?? 0) * 100)] as const);
    const line = scores.map(([c, s]) => `${c}=${s}`).join('  ');
    const bad = scores.filter(([, s]) => s < min);
    console.log(`${bad.length ? '✗' : '✓'} ${url}\n    ${line}`);
    for (const [c] of bad) {
      failed = true;
      const refs = lhr.categories[c].auditRefs;
      const audits = Object.values(lhr.audits).filter((a) => a.score !== null && a.score < 1 && refs.some((r) => r.id === a.id && (r.weight ?? 0) > 0));
      for (const a of audits.slice(0, 12)) console.log(`    - [${c}] ${a.id}: ${a.title}${a.displayValue ? ` (${a.displayValue})` : ''}`);
    }
  }
  if (failed) {
    console.error(`\nBelow the ${min} gate.`);
    process.exit(1);
  }
  console.log(`\nAll categories ≥ ${min}.`);
}

main().catch((e) => { console.error(e instanceof Error ? e.stack ?? e.message : e); process.exit(1); });
