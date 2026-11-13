import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'dist');
const defaultSiteUrl = 'https://e1d8.github.io/SaraPau/';
const siteUrl = new URL(process.env.SITE_URL || defaultSiteUrl);
if (!['https:', 'http:'].includes(siteUrl.protocol)) throw new Error('SITE_URL ha de ser una adreça HTTP o HTTPS.');
siteUrl.pathname = siteUrl.pathname.replace(/\/?$/, '/');
siteUrl.search = siteUrl.hash = '';
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const name of ['index.html', 'detalls.html', 'historia.html', 'assets', '.nojekyll']) {
  await cp(resolve(root, name), resolve(output, name), { recursive: true });
}
for (const name of ['index.html', 'detalls.html', 'historia.html']) {
  const file = resolve(output, name);
  const html = await readFile(file, 'utf8');
  await writeFile(file, html.replaceAll(defaultSiteUrl, siteUrl.href));
}
console.log('Web preparada en dist/ (sense dependències d’execució).');
