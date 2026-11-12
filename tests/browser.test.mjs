import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { createStaticServer } from '../scripts/serve.mjs';

const root = resolve(import.meta.dirname, '..');
const siteRoot = process.env.SITE_ROOT ? resolve(process.env.SITE_ROOT) : root;
const prefix = '/SaraPau';
let server, browser, origin;

before(async () => {
  server = createStaticServer(siteRoot, { basePath: prefix });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  origin = `http://127.0.0.1:${server.address().port}`;
  const channel = process.env.BROWSER_CHANNEL || (process.platform === 'darwin' && existsSync('/Applications/Google Chrome.app') ? 'chrome' : undefined);
  browser = await chromium.launch({ channel });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

async function load(page, filename = 'index') {
  await page.goto(`${origin}${prefix}/${filename}.html`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
}

async function loadLazyImages(page) {
  for (const img of await page.locator('img').all()) {
    await img.scrollIntoViewIfNeeded();
    await img.evaluate(el => el.decode());
  }
}

test('Les tres pàgines funcionen dins de /SaraPau/ en escriptori, tauleta i mòbil', async () => {
  for (const width of [1366, 820, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const errors = [], failed = [], external = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => failed.push(request.url()));
    page.on('request', request => { if (!request.url().startsWith(origin)) external.push(request.url()); });
    for (const filename of ['index', 'detalls', 'historia']) {
      await load(page, filename);
      await loadLazyImages(page);
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.locator('nav a[aria-current="page"]').count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${filename}, ${width}px: desbordament`);
      assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(255, 255, 255)');
      assert.equal(await page.locator('main').evaluate(el => [...el.querySelectorAll('section')].every(section => ['rgba(0, 0, 0, 0)', 'rgb(255, 255, 255)'].includes(getComputedStyle(section).backgroundColor))), true);
      assert.equal(await page.evaluate(() => document.fonts.check('16px "More Sugar"') && document.fonts.check('40px "Vintage Rotter"')), true);
      assert.equal(await page.locator('body').evaluate(el => /Designed by Canva|Terms & Support|Privacy policy|Juliet|Romeo/.test(el.textContent)), false);
      if (process.env.SCREENSHOTS_DIR) {
        const output = resolve(process.env.SCREENSHOTS_DIR);
        await mkdir(output, { recursive: true });
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: resolve(output, `${filename}-${width}.png`), fullPage: true });
      }
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(failed, []);
    assert.deepEqual(external, []);
    await page.close();
  }
});

test('La navegació, les àncores, la llista provisional i el teclat funcionen', async () => {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  await load(page);
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('.skip-link').evaluate(el => el === document.activeElement), true);
  await page.keyboard.press('Enter');
  assert.equal(new URL(page.url()).hash, '#contingut');
  await page.getByRole('navigation').getByRole('link', { name: 'Detalls de la boda', exact: true }).click();
  assert.ok(page.url().endsWith('/SaraPau/detalls.html'));
  const registry = page.getByRole('button', { name: 'Consulta la llista', exact: true });
  await registry.click();
  assert.equal(await registry.getAttribute('aria-expanded'), 'true');
  assert.equal(await page.locator('#registry-note').isVisible(), true);
  await registry.click();
  assert.equal(await page.locator('#registry-note').isVisible(), false);
  await page.getByRole('link', { name: 'Confirma l’assistència', exact: true }).click();
  await page.waitForSelector('#rsvp-form');
  assert.equal(new URL(page.url()).hash, '#rsvp');
  await page.waitForFunction(() => Math.abs(document.querySelector('#rsvp').getBoundingClientRect().top) < 100);
  for (const link of await page.locator('a[target="_blank"]').all()) assert.match(await link.getAttribute('rel'), /noopener/);
  await page.close();
});

test('L’RSVP valida, permet editar i es reinicia sense peticions ni persistència', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await load(page);
  await loadLazyImages(page);
  await page.locator('#rsvp').scrollIntoViewIfNeeded();
  await page.waitForLoadState('networkidle');
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  const submit = page.getByRole('button', { name: 'Confirma l’assistència', exact: true });
  await submit.click();
  assert.equal(await page.locator('#guest-name').getAttribute('aria-invalid'), 'true');
  assert.match(await page.locator('#attendance-error').textContent(), /Indica/);
  await page.locator('#guest-name').fill('  ');
  await page.getByLabel('Sí, allí estaré!').check();
  assert.equal(await page.locator('#attendance-fields').isVisible(), true);
  await submit.click();
  assert.match(await page.locator('#name-error').textContent(), /Escriu/);
  const name = 'Aina <img src="/no-enviar"> Ferrer';
  await page.locator('#guest-name').fill(name);
  for (const invalid of ['0', '-1', '1.5', '']) {
    await page.locator('#guest-count').fill(invalid);
    await submit.click();
    assert.equal(await page.locator('#rsvp-success').isVisible(), false);
    assert.match(await page.locator('#guests-error').textContent(), /enter/);
  }
  await page.locator('#guest-count').fill('3');
  await page.locator('#dietary').fill('Sense gluten');
  await page.locator('#guest-message').fill('Tenim moltes ganes de celebrar-ho!');
  await submit.click();
  assert.equal(await page.locator('#rsvp-success').isVisible(), true);
  assert.ok((await page.locator('#reply-summary').textContent()).includes(name));
  assert.match(await page.locator('#reply-summary').textContent(), /3/);
  assert.equal(await page.locator('#rsvp-success img').count(), 0);
  await page.getByRole('button', { name: 'Edita la resposta' }).click();
  assert.equal(await page.locator('#guest-name').inputValue(), name);
  assert.equal(await page.locator('#guest-count').inputValue(), '3');
  assert.equal(await page.locator('#dietary').inputValue(), 'Sense gluten');
  await page.getByLabel('No podré vindre').check();
  assert.equal(await page.locator('#attendance-fields').isVisible(), false);
  assert.equal(await page.locator('#dietary').inputValue(), '');
  assert.equal(await page.locator('#guest-count').isDisabled(), true);
  await submit.click();
  assert.match(await page.locator('#reply-summary').textContent(), /no podràs vindre/);
  assert.deepEqual(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, cookies: document.cookie })), { local: 0, session: 0, cookies: '' });
  assert.deepEqual(requests, [], 'Provar el formulari no ha de fer cap petició');
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('#guest-name').inputValue(), '');
  assert.equal(await page.locator('#guest-message').inputValue(), '');
  assert.equal(await page.locator('[name="attendance"]:checked').count(), 0);
  assert.equal(await page.locator('#rsvp-success').isVisible(), false);
  await page.close();
});
