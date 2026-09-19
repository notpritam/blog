/**
 * Pre-launch gate (spec §14): Lighthouse must score ≥ 95 in Performance, SEO,
 * Best Practices and Accessibility for the home page and one article.
 *
 *   npm run seo-audit -- https://blog.notpritam.in [/some-article-slug] [--min 95]
 *
 * Uses the Playwright-managed Chromium if CHROME_PATH is not set.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';

const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'] as const;

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

async function main() {
  const args = process.argv.slice(2);
  const minIdx = args.indexOf('--min');
  const min = minIdx >= 0 ? Number(args.splice(minIdx, 2)[1]) : 95;
  const [base, article] = args;
  if (!base) throw new Error('usage: seo-audit <base-url> [/article-slug] [--min 95]');
  const urls = [new URL('/', base).toString()];
  if (article) urls.push(new URL(article, base).toString());

  const chromePath = findChrome();
  const chrome = await launch({ chromePath, chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });
  let failed = false;
  try {
    for (const url of urls) {
      const result = await lighthouse(url, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: [...CATEGORIES] });
      const lhr = result?.lhr;
      if (!lhr) throw new Error(`No Lighthouse result for ${url}`);
      const scores = CATEGORIES.map((c) => [c, Math.round((lhr.categories[c]?.score ?? 0) * 100)] as const);
      const line = scores.map(([c, s]) => `${c}=${s}`).join('  ');
      const bad = scores.filter(([, s]) => s < min);
      console.log(`${bad.length ? '✗' : '✓'} ${url}\n    ${line}`);
      for (const [c] of bad) {
        failed = true;
        const audits = Object.values(lhr.audits).filter((a) => a.score !== null && a.score < 1 && lhr.categories[c].auditRefs.some((r) => r.id === a.id && (r.weight ?? 0) > 0));
        for (const a of audits.slice(0, 12)) console.log(`    - [${c}] ${a.id}: ${a.title}${a.displayValue ? ` (${a.displayValue})` : ''}`);
      }
    }
  } finally {
    await chrome.kill();
  }
  if (failed) {
    console.error(`\nBelow the ${min} gate.`);
    process.exit(1);
  }
  console.log(`\nAll categories ≥ ${min}.`);
}

main().catch((e) => { console.error(e instanceof Error ? e.stack ?? e.message : e); process.exit(1); });
