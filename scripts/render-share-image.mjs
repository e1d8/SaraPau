import { readFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

// Exporta el vector existent; no requerix cap servei d’imatges ni accés a xarxa.
const root = fileURLToPath(new URL('../', import.meta.url));
const source = await readFile(resolve(root, 'assets/illustrations/cupid.svg'), 'utf8');
const svg = source.slice(source.indexOf('<svg'));
const css = await readFile(resolve(root, 'assets/css/site.css'), 'utf8');
const color = css.match(/--primary:\s*(#[a-f\d]{6})/i)[1];
const output = resolve(root, 'assets/social/cupid.png');
await mkdir(resolve(root, 'assets/social'), { recursive: true });
const channel = process.env.BROWSER_CHANNEL || (process.platform === 'darwin' && existsSync('/Applications/Google Chrome.app') ? 'chrome' : undefined);
const browser = await chromium.launch({ channel });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, javaScriptEnabled: false });
  await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;width:100%;height:100%;background:#fff}body{display:grid;place-items:center}svg{display:block;width:480px;height:480px;fill:${color}}</style></head><body>${svg}</body></html>`);
  await page.screenshot({ path: output, type: 'png' });
  console.log(`assets/social/cupid.png · 1200 × 630 · ${(await stat(output)).size} bytes`);
} finally {
  await browser.close();
}
