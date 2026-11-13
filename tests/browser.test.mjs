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

test('La landing mostra les seccions sol·licitades dins de /SaraPau/ en escriptori, tauleta i mòbil', async () => {
  for (const width of [1366, 820, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const errors = [], failed = [], external = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => failed.push(request.url()));
    page.on('request', request => { if (!request.url().startsWith(origin)) external.push(request.url()); });
    for (const filename of ['index']) {
      await load(page, filename);
      await loadLazyImages(page);
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.locator('nav, [role="tablist"], .back-top').count(), 0);
      assert.deepEqual(await page.locator('main > section').evaluateAll(sections => sections.map(el => el.classList[0])), ['home-hero', 'timeline', 'rsvp', 'celebration']);
      assert.equal(await page.locator('.hero-opening').textContent(), 'Hi ha llocs, persones i moments que sempre formaran part de la nostra història. Tornem on tot va començar per a celebrar el nostre amor amb vosaltres.');
      assert.equal(await page.locator('.hero-opening').evaluate(el => getComputedStyle(el).textTransform), 'none');
      assert.equal(await page.locator('.hero-location').count(), 0);
      const mediumStyles = await page.locator('.hero-date,.timeline h3').evaluateAll(elements => elements.map(el => {
        const style = getComputedStyle(el);
        return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight, style.color];
      }));
      assert.deepEqual(mediumStyles[0], mediumStyles[1]);
      assert.deepEqual(await page.locator('.hero-copy > *').evaluateAll(elements => elements.map(el => el.classList[0])), ['signature', 'hero-date', 'hero-opening']);
      assert.equal(await page.locator('.timeline-item').first().locator('.art-esglesia-major').count(), 1);
      assert.equal(await page.locator('.closing-message').textContent(), 'LO MILLOR DE LA TERRETA, LA NOSTRA GENT.');
      assert.ok((await page.locator('.bank-account').textContent()).includes('ES11 0049 0070 1525 9029 9271'));
      assert.equal(await page.locator('.site-footer h2').textContent(), 'Algun dubte?');
      assert.match(await page.locator('.footer-names').evaluate(el => {
        const visible = el.cloneNode(true);
        visible.querySelectorAll('.sr-only').forEach(node => node.remove());
        return visible.textContent;
      }), /Sara\s*·\s*Pau/);
      assert.equal(await page.locator('.footer-names a').nth(0).getAttribute('href'), 'https://wa.me/34686776391');
      assert.equal(await page.locator('.footer-names a').nth(1).getAttribute('href'), 'https://wa.me/34690121958');
      assert.equal(await page.locator('.site-footer').evaluate(el => {
        const heading = el.querySelector('h2').getBoundingClientRect();
        const names = el.querySelector('.footer-names').getBoundingClientRect();
        return heading.top < names.bottom && names.top < heading.bottom && Number.parseFloat(getComputedStyle(el.querySelector('h2')).fontSize) <= 14;
      }), true);
      assert.deepEqual(await page.locator('.timeline-time').allTextContents(), ['12:00', '13:30', '14:00', '00:00']);
      assert.deepEqual(await page.locator('.timeline h3').allTextContents(), ['LA CERIMÒNIA', 'EIXIDA BUS ANADA', 'LA CELEBRACIÓ', 'EIXIDA BUS TORNADA']);
      assert.equal(await page.locator('.directions, #guest-count, #guest-message').count(), 0);
      assert.equal(await page.locator('.directions img, .directions .art, .directions a, .directions button, .local-map, .rsvp-intro, .postcard, .story-hero, .dresscode, .accommodation').count(), 0);
      assert.equal(await page.locator('#rsvp-title').textContent(), 'Confirmació');
      assert.equal(await page.locator('#form-status').isVisible(), false);
      assert.equal(await page.locator('#rsvp-notice').count(), 0);
      assert.equal(await page.locator('.art-wedding-table').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(99, 107, 47)');
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
        if (width === 320) {
          await page.getByRole('button', { name: 'Afegir invitat', exact: true }).click();
          await page.getByLabel('Sí, allí estaré!').check();
          await page.locator('#guest-dialog').screenshot({ path: resolve(output, 'rsvp-320.png') });
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
          await page.keyboard.press('Escape');
        }
      }
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(failed, []);
    assert.deepEqual(external, []);
    await page.close();
  }
});

test('La benvinguda mostra noms, data i missatge abans de revelar la resta', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
  await load(page);
  const phase = name => page.waitForFunction(value => document.querySelector('.home-hero').dataset.intro === value, name);
  assert.ok(await page.locator('#hero-title .name-letter').count() > 1);
  assert.equal(await page.locator('#hero-title .name-letter').evaluateAll(letters => letters.map(el => el.textContent).join('')), 'Sara i Pau');
  assert.equal(await page.locator('#hero-title .name-letter').evaluateAll(letters => letters.every(el => getComputedStyle(el).clipPath === 'none')), true);
  assert.equal(await page.getByRole('heading', { name: 'Sara i Pau', exact: true }).count(), 1);
  const letterStates = await page.locator('#hero-title .name-letter').evaluateAll(letters => letters.map(letter => getComputedStyle(letter).opacity));
  assert.ok(letterStates.includes('0') && letterStates.some(value => Number(value) > 0));
  assert.match(await page.locator('.name-letters').evaluate(el => getComputedStyle(el).maskImage), /linear-gradient/);
  await phase('date');
  assert.ok(await page.locator('#hero-title .name-letter').count() > 0, 'La data entra mentre acaba el rebot dels noms');
  assert.equal(await page.locator('#hero-title').evaluate(el => getComputedStyle(el).opacity), '1');
  assert.equal(await page.locator('.hero-opening').evaluate(el => el.classList.contains('reveal-pending')), true);
  assert.equal(await page.locator('.home-hero > .art').evaluate(el => el.classList.contains('reveal-pending')), true);
  const messageHeight = await page.locator('.hero-opening').evaluate(el => el.getBoundingClientRect().height);
  await phase('message');
  assert.equal(await page.locator('#hero-title .name-letter').count(), 0);
  assert.equal(await page.locator('.hero-date').evaluate(el => getComputedStyle(el).opacity), '1');
  assert.ok(await page.locator('.type-letter').count() > 100);
  assert.ok(await page.locator('.type-letter').evaluateAll(letters => letters.some(el => getComputedStyle(el).opacity === '0')));
  assert.equal(await page.locator('.hero-opening').evaluate(el => el.getBoundingClientRect().height), messageHeight);
  assert.equal(await page.locator('.home-hero > .art').evaluate(el => el.classList.contains('reveal-pending')), true);
  await phase('complete');
  assert.equal(await page.locator('.type-letter').count(), 0);
  assert.equal(await page.locator('.hero-opening').evaluate(el => getComputedStyle(el).opacity), '1');
  await page.waitForFunction(() => !document.querySelector('.home-hero > .art').classList.contains('reveal-pending'));
  await page.close();
});

test('Reduir el moviment durant l’escriptura mostra tot el text i cancel·la les lletres', async () => {
  const page = await browser.newPage({ reducedMotion: 'no-preference' });
  await load(page);
  await page.waitForFunction(() => document.querySelector('.home-hero').dataset.intro === 'message');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.querySelectorAll('.name-letter,.type-letter,.reveal-pending').length === 0);
  assert.equal(await page.locator('#hero-title').textContent(), 'Sara i Pau');
  assert.equal(await page.locator('.hero-opening').textContent(), 'Hi ha llocs, persones i moments que sempre formaran part de la nostra història. Tornem on tot va començar per a celebrar el nostre amor amb vosaltres.');
  assert.equal(await page.evaluate(() => document.getAnimations().some(animation => animation.playState === 'running')), false);
  await page.close();
});

test('Les entrades apareixen en fer scroll i respecten el teclat i el moviment reduït', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
  await load(page);
  const message = page.locator('.closing-message');
  assert.equal(await message.evaluate(el => el.classList.contains('reveal-pending') && getComputedStyle(el).opacity === '0'), true);
  await page.waitForFunction(() => document.querySelector('.home-hero').dataset.intro === 'complete');
  await message.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const el = document.querySelector('.closing-message');
    return !el.classList.contains('reveal-pending') && getComputedStyle(el).opacity === '1';
  });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('.home-hero').dataset.intro === 'complete');
  await page.evaluate(() => document.querySelector('.footer-names a').focus({ preventScroll: true }));
  assert.equal(await page.locator('.footer-names').evaluate(el => el.classList.contains('reveal-pending')), false);
  assert.ok(await page.locator('.reveal-pending').count() > 0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.querySelectorAll('.reveal-pending').length === 0);
  assert.equal(await page.evaluate(() => document.getAnimations().some(animation => animation.playState === 'running')), false);
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('.reveal-pending').count(), 0);
  assert.equal(await message.evaluate(el => getComputedStyle(el).opacity), '1');
  await page.close();
});

test('La recàrrega comença dalt i la benvinguda bloqueja el scroll fins al final', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference', hasTouch: true });
  await load(page);
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('intro-locked')), true);
  assert.equal(await page.locator('.page-scrollbar').isVisible(), false);
  await page.mouse.wheel(0, 700);
  await page.keyboard.press('PageDown');
  await page.evaluate(() => scrollTo({ top: 700, behavior: 'instant' }));
  assert.equal(await page.evaluate(() => scrollY), 0);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 600 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y: 200 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.equal(await page.evaluate(() => scrollY), 0);
  await page.waitForFunction(() => document.querySelector('.home-hero').dataset.intro === 'complete');
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('intro-locked')), false);
  await page.evaluate(() => scrollTo({ top: 700, behavior: 'instant' }));
  assert.ok(await page.evaluate(() => scrollY > 500));
  await page.evaluate(() => history.replaceState(null, '', '#rsvp'));
  await page.reload({ waitUntil: 'networkidle' });
  assert.deepEqual(await page.evaluate(() => ({ y: scrollY, hash: location.hash, locked: document.documentElement.classList.contains('intro-locked') })), { y: 0, hash: '', locked: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => !document.documentElement.classList.contains('intro-locked'));
  assert.equal(await page.evaluate(() => scrollY), 0);
  await page.evaluate(() => scrollTo({ top: 700, behavior: 'instant' }));
  assert.ok(await page.evaluate(() => scrollY > 500));
  await page.close();
});

test('Les metadades i la imatge es poden llegir sense JavaScript amb agents de WhatsApp i Telegram', async () => {
  for (const userAgent of ['WhatsApp/2.0', 'TelegramBot (like TwitterBot)']) {
    const context = await browser.newContext({ userAgent, javaScriptEnabled: false });
    for (const path of ['index.html', 'detalls.html', 'historia.html']) {
      const response = await context.request.get(`${origin}${prefix}/${path}`);
      assert.equal(response.status(), 200);
      const html = await response.text();
      assert.match(html, /<meta property="og:title" content="Sara ∞ Pau">/);
      assert.match(html, /<meta property="og:description" content="9 d'octubre de 2027">/);
      const imageUrl = new URL(html.match(/<meta property="og:image" content="([^"]+)">/)[1]);
      assert.equal(imageUrl.protocol, 'https:');
      const image = await context.request.get(`${origin}${imageUrl.pathname}`);
      assert.equal(image.status(), 200);
      assert.equal(image.headers()['content-type'], 'image/png');
      const png = await image.body();
      assert.equal(png.readUInt32BE(16), 1200);
      assert.equal(png.readUInt32BE(20), 630);
    }
    await context.close();
  }
});

test('La barra principal se superposa al dibuix, permet arrossegar i s’oculta en obrir el pop-up', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
  await load(page);
  const thumb = page.locator('.page-scrollbar-thumb');
  const rail = page.locator('.page-scrollbar');
  assert.equal(await rail.count(), 1);
  assert.equal(await page.evaluate(() => document.documentElement.clientWidth === innerWidth), true);
  assert.equal(await rail.evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
  const box = await thumb.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 120, { steps: 5 });
  await page.mouse.up();
  await page.waitForFunction(() => scrollY > 100);
  const dragged = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 150);
  await page.waitForFunction(y => scrollY > y, dragged);
  const wheeled = await page.evaluate(() => scrollY);
  await page.keyboard.press('PageDown');
  await page.waitForFunction(y => scrollY > y, wheeled);
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.locator('.celebration').scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(() => document.documentElement.clientWidth === innerWidth && document.documentElement.scrollWidth <= innerWidth), true);
  assert.equal(await rail.evaluate(el => el.getBoundingClientRect().right === innerWidth), true);
  assert.equal(await page.locator('.art-banquet').evaluate(el => el.getBoundingClientRect().right > innerWidth), true);
  if (process.env.SCREENSHOTS_DIR) await page.screenshot({ path: resolve(process.env.SCREENSHOTS_DIR, 'banquet-overlay-1920.png') });
  await page.getByRole('button', { name: 'Afegir invitat', exact: true }).click();
  assert.equal(await rail.isVisible(), false);
  const close = page.getByRole('button', { name: 'Tancar finestra', exact: true });
  assert.equal(await close.textContent(), 'x');
  await close.click();
  assert.equal(await page.locator('#guest-dialog').evaluate(el => el.open), false);
  assert.equal(await rail.isVisible(), true);
  await page.close();
});

test('L’accés amb teclat, la localització i els enllaços antics funcionen', async () => {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  await load(page);
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('.skip-link').evaluate(el => el === document.activeElement), true);
  await page.keyboard.press('Enter');
  assert.equal(new URL(page.url()).hash, '#contingut');
  const church = page.getByRole('link', { name: /església major/ });
  assert.equal(new URL(await church.getAttribute('href')).searchParams.get('query'), 'Carrer Sant Roc, 1, 12540 Vila-real, Castelló');
  assert.equal(await page.locator('.timeline li').first().locator('p').last().evaluate(el => {
    const visible = el.cloneNode(true);
    visible.querySelectorAll('.sr-only').forEach(node => node.remove());
    return visible.textContent;
  }), 'Mos casarem a l’església major de Vila-real');
  for (const link of await page.locator('.timeline a').all()) {
    const name = await link.textContent();
    const address = new URL(await link.getAttribute('href')).searchParams.get('query');
    if (name.startsWith('Lluïssos')) assert.equal(address, 'Av. de la Mura, 12, 12540 Vila-real, Castelló');
    if (name.startsWith('El Invernadero')) assert.equal(address, 'Av. Gimeno Tomas, 36, 12560 Benicàssim, Castelló');
  }
  for (const link of await page.locator('a[target="_blank"]').all()) assert.match(await link.getAttribute('rel'), /noopener/);
  await load(page, 'detalls');
  await page.waitForURL(`${origin}${prefix}/index.html#detalls`);
  await page.waitForFunction(() => Math.abs(document.querySelector('#detalls')?.getBoundingClientRect().top) < 100);
  await load(page, 'historia');
  await page.waitForURL(`${origin}${prefix}/index.html`);
  await page.waitForSelector('#hero-title');
  assert.equal(await page.locator('nav').count(), 0);
  await page.close();
});

async function saveGuest(page, { name, attendance = 'no', bus = 'none', dietary = '' }) {
  await page.getByRole('button', { name: 'Afegir invitat', exact: true }).click();
  await page.locator('#guest-name').fill(name);
  await page.getByLabel(attendance === 'yes' ? 'Sí, allí estaré!' : 'No podré vindre').check();
  if (attendance === 'yes') {
    await page.locator(`[name="bus"][value="${bus}"]`).check();
    await page.locator('#dietary').fill(dietary);
  }
  await page.getByRole('button', { name: 'Guardar resposta', exact: true }).click();
  assert.equal(await page.locator('#guest-saved').isVisible(), true);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
}

test('Els invitats es guarden, s’editen en una graella de cinc columnes i s’envien una sola vegada', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await load(page);
  await page.locator('#rsvp').scrollIntoViewIfNeeded();
  await page.waitForLoadState('networkidle');
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  assert.equal(await page.locator('#send-replies').isVisible(), false);
  assert.equal(await page.locator('.guest-edit').count(), 0);
  assert.equal(await page.locator('.rsvp-description').textContent(), 'Afegix la resposta de tots els invitats del teu cercle');
  const add = page.getByRole('button', { name: 'Afegir invitat', exact: true });
  await add.click();
  await page.locator('#guest-name').fill('Esborrany');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#guest-dialog').evaluate(el => el.open), false);
  assert.equal(await page.locator('.guest-edit').count(), 0);
  await add.click();
  assert.equal(await page.locator('#guest-name').inputValue(), '');
  assert.equal(await page.locator('#form-status').isVisible(), false);
  const save = page.getByRole('button', { name: 'Guardar resposta', exact: true });
  await save.click();
  assert.equal(await page.locator('#guest-name').getAttribute('aria-invalid'), 'true');
  assert.equal(await page.locator('#form-status').textContent(), 'Els camps amb * són obligatoris.');
  await page.getByLabel('Sí, allí estaré!').check();
  assert.equal(await page.locator('[name="bus"]:required').count(), 4);
  const name = 'Aina <img src="/no-enviar"> Ferrer';
  await page.locator('#guest-name').fill(name);
  await save.click();
  assert.equal(await page.locator('#guest-saved').isVisible(), false);
  assert.equal(await page.locator('[name="bus"][aria-invalid="true"]').count(), 4);
  let first = true;
  for (const [value, summary] of [['none', 'No'], ['outbound', 'Anada'], ['return-midnight', 'Anada i tornada (00:00)'], ['return-two', 'Anada i tornada (02:00)']]) {
    if (!first) {
      await page.locator('.guest-edit').first().click();
      assert.equal(await page.locator('#guest-name').inputValue(), name);
    }
    const diet = value === 'none' ? '' : 'Sense gluten';
    await page.locator(`[name="bus"][value="${value}"]`).check();
    assert.equal(await page.locator('#form-status').isVisible(), false);
    await page.locator('#dietary').fill(diet);
    await save.click();
    assert.deepEqual(await page.locator('#reply-summary li').allTextContents(), [`Nom: ${name}`, 'Asistiràs: Sí', `Bus: ${summary}`, `Comentaris dieta: ${diet || '—'}`]);
    assert.equal(await page.locator('#guest-saved img').count(), 0);
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    assert.equal(await page.locator('#guest-dialog').evaluate(el => el.open), false);
    assert.equal(await page.locator('.guest-edit').count(), 1);
    assert.equal(await page.locator('.guest-initials').first().textContent(), 'AIN');
    first = false;
  }
  await page.locator('.guest-edit').first().click();
  assert.equal(await page.locator('[name="bus"]:checked').inputValue(), 'return-two');
  assert.equal(await page.locator('#dietary').inputValue(), 'Sense gluten');
  await page.getByLabel('No podré vindre').check();
  assert.equal(await page.locator('#attendance-fields').isVisible(), false);
  assert.equal(await page.locator('[name="bus"]:required').count(), 0);
  assert.equal(await page.locator('#dietary').inputValue(), '');
  await save.click();
  assert.deepEqual(await page.locator('#reply-summary li').allTextContents(), [`Nom: ${name}`, 'Asistiràs: No', 'Bus: No', 'Comentaris dieta: —']);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  for (const name of ['Berta Ferrer', 'Carles Roig', 'Dídac Martí', 'Eva Grau', 'Ferran Gil']) await saveGuest(page, { name });
  assert.equal(await page.locator('.guest-edit').count(), 6);
  assert.equal(await page.locator('#guest-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 5);
  assert.equal(await page.locator('.guest-edit').evaluateAll(buttons => buttons[5].getBoundingClientRect().top > buttons[0].getBoundingClientRect().top), true);
  await page.setViewportSize({ width: 320, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  if (process.env.SCREENSHOTS_DIR) await page.locator('#rsvp').screenshot({ path: resolve(process.env.SCREENSHOTS_DIR, 'invitats-320.png') });
  const send = page.getByRole('button', { name: 'Enviar respostes', exact: true });
  await send.click();
  assert.equal(await page.locator('#rsvp-loading').evaluate(el => el.open), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#rsvp-loading').evaluate(el => el.open), true);
  await page.evaluate(() => document.querySelector('#send-replies').click());
  await page.waitForFunction(() => document.querySelector('#rsvp').dataset.state === 'success');
  assert.equal(await page.locator('#rsvp-loading').evaluate(el => el.open), false);
  assert.equal((await page.locator('#rsvp-success h3').textContent()).trim(), 'Gràcies');
  assert.equal(await page.locator('#rsvp-success .icon-heart').isVisible(), true);
  assert.equal(await page.locator('#rsvp-title .icon-check').isVisible(), true);
  assert.equal(await page.locator('#rsvp-title .icon-cross').isVisible(), false);
  assert.equal(await page.locator('#rsvp-title').getAttribute('aria-label'), 'Confirmació: respostes rebudes');
  assert.equal(await page.locator('#rsvp-title').evaluate(el => el.clientHeight <= parseFloat(getComputedStyle(el).lineHeight) + 1), true);
  assert.equal(await page.locator('.reply-heart').count(), 0);
  assert.equal(await page.locator('#guest-manager').isVisible(), false);
  assert.equal(await page.locator('#rsvp-error').isVisible(), false);
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    document.querySelector('#send-replies').click();
    document.querySelector('#add-guest').click();
  });
  assert.equal(await page.locator('#rsvp').getAttribute('data-state'), 'success');
  assert.equal(await page.locator('#guest-dialog').evaluate(el => el.open), false);
  assert.equal(await page.locator('#rsvp-loading').evaluate(el => el.open), false);
  assert.deepEqual(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, cookies: document.cookie })), { local: 0, session: 0, cookies: '' });
  assert.deepEqual(requests, [], 'Guardar, editar i simular l’enviament no ha de fer peticions');
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('.guest-edit').count(), 0);
  assert.equal(await page.locator('#rsvp-success').isVisible(), false);
  assert.equal(await page.locator('#add-guest').isVisible(), true);
  assert.equal(await page.locator('#send-replies').isVisible(), false);
  await page.close();
});

test('Sense recepció en deu segons, es cancel·la l’enviament i no es pot tornar a enviar', async () => {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  await load(page);
  await page.evaluate(async () => {
    const old = document.querySelector('#rsvp');
    const next = old.cloneNode(true);
    old.replaceWith(next);
    const { setupRsvp } = await import('./assets/js/rsvp.js');
    window.sendCalls = 0;
    setupRsvp(next, {
      sendReplies: (_, { signal }) => {
        window.sendCalls++;
        signal.addEventListener('abort', () => { window.sendCancelled = true; });
        return new Promise(resolve => { window.lateReceipt = () => resolve({ received: true }); });
      },
    });
  });
  await saveGuest(page, { name: 'Berta Ferrer' });
  await page.getByRole('button', { name: 'Enviar respostes', exact: true }).click();
  assert.equal(await page.locator('#rsvp-loading').evaluate(el => el.open), true);
  await page.waitForFunction(() => document.querySelector('#rsvp').dataset.state === 'error', undefined, { timeout: 12000 });
  assert.equal(await page.locator('#rsvp-error').textContent(), 'Alguna cosa ha anat mal, tona-ho a intentar més tard');
  assert.equal(await page.locator('#rsvp-title .icon-cross').isVisible(), true);
  assert.equal(await page.locator('#rsvp-title .icon-check').isVisible(), false);
  assert.equal(await page.locator('#rsvp-title').getAttribute('aria-label'), 'Confirmació: error en l’enviament');
  assert.equal(await page.locator('#guest-manager').isVisible(), false);
  assert.equal(await page.locator('#rsvp-loading').evaluate(el => el.open), false);
  assert.equal(await page.evaluate(() => window.sendCancelled), true);
  await page.evaluate(async () => {
    window.lateReceipt();
    await Promise.resolve();
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    document.querySelector('#send-replies').click();
    document.querySelector('#add-guest').click();
  });
  assert.equal(await page.locator('#rsvp').getAttribute('data-state'), 'error');
  assert.equal(await page.locator('#rsvp-success').isVisible(), false);
  assert.equal(await page.locator('#guest-dialog').evaluate(el => el.open), false);
  assert.equal(await page.evaluate(() => window.sendCalls), 1);
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('#rsvp-error').isVisible(), false);
  assert.equal(await page.locator('.guest-edit').count(), 0);
  await page.close();
});

test('Els camps creixen fins a quatre línies, es contrauen i mantenen les barres uniformes', async () => {
  const page = await browser.newPage({ viewport: { width: 320, height: 844 }, reducedMotion: 'reduce' });
  await load(page);
  await page.getByRole('button', { name: 'Afegir invitat', exact: true }).click();
  const name = page.locator('#guest-name');
  const diet = page.locator('#dietary');
  await name.fill('Aina Ferrer');
  assert.equal(await name.evaluate(el => el.rows), 1);
  const initialHeight = await name.evaluate(el => el.getBoundingClientRect().height);
  await name.fill('Aina\nFerrer\nSoler');
  assert.equal(await name.evaluate(el => el.rows), 3);
  assert.ok(await name.evaluate(el => el.getBoundingClientRect().height) > initialHeight);
  await name.fill('Aina Ferrer Soler Roig '.repeat(5).trim());
  assert.equal(await name.evaluate(el => el.rows), 4);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.waitForFunction(() => document.querySelector('#guest-name').rows < 4);
  await page.setViewportSize({ width: 320, height: 844 });
  await name.fill('Aina Ferrer');
  assert.equal(await name.evaluate(el => el.rows), 1);
  await page.getByLabel('Sí, allí estaré!').check();
  await page.locator('[name="bus"][value="none"]').check();
  await diet.fill('Sense gluten\nSense lactosa\nVegetariana\nSense fruits secs');
  assert.equal(await diet.evaluate(el => el.rows), 4);
  const cappedHeight = await diet.evaluate(el => el.getBoundingClientRect().height);
  const longDiet = Array.from({ length: 12 }, (_, index) => `Comentari ${index + 1}`).join('\n');
  await diet.fill(longDiet);
  assert.equal(await diet.evaluate(el => el.rows), 4);
  assert.equal(await diet.evaluate(el => el.getBoundingClientRect().height), cappedHeight);
  assert.equal(await diet.evaluate(el => el.scrollHeight > el.clientHeight && getComputedStyle(el).overflowY === 'auto'), true);
  await page.mouse.move(0, 0);
  const bars = await page.evaluate(() => [document.documentElement, document.querySelector('#guest-dialog'), document.querySelector('#dietary')].map(el => ({
    width: getComputedStyle(el, '::-webkit-scrollbar').width,
    track: getComputedStyle(el, '::-webkit-scrollbar-track').backgroundColor,
    thumb: getComputedStyle(el, '::-webkit-scrollbar-thumb').backgroundColor,
    radius: getComputedStyle(el, '::-webkit-scrollbar-thumb').borderRadius,
  })));
  assert.deepEqual(bars[0], bars[2]);
  assert.deepEqual({ ...bars[1], width: bars[0].width }, bars[0]);
  assert.equal(bars[0].track, 'rgba(0, 0, 0, 0)');
  assert.ok(parseFloat(bars[1].width) < parseFloat(bars[0].width));
  assert.ok(parseFloat(bars[0].width) <= 10);
  if (process.env.SCREENSHOTS_DIR) await page.locator('#guest-dialog').screenshot({ path: resolve(process.env.SCREENSHOTS_DIR, 'camps-320.png') });
  await page.getByRole('button', { name: 'Guardar resposta', exact: true }).click();
  assert.ok((await page.locator('#reply-summary').textContent()).includes(longDiet));
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.locator('.guest-edit').first().click();
  assert.equal(await diet.inputValue(), longDiet);
  assert.equal(await diet.evaluate(el => el.rows), 4);
  await diet.fill('');
  assert.equal(await diet.evaluate(el => el.rows), 1);
  assert.equal(await diet.evaluate(el => el.scrollHeight <= el.clientHeight), true);
  await page.close();
});

test('La còpia de l’IBAN alterna la icona i el tick amb clic, hover i pressió', async () => {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
  await load(page);
  const copy = page.getByRole('button', { name: 'Copia l’IBAN', exact: true });
  assert.equal(await copy.locator('.copy-icon').isVisible(), true);
  assert.equal(await copy.locator('.copy-check').isVisible(), false);
  await copy.click();
  await page.waitForFunction(() => document.querySelector('#copy-iban').dataset.copied === 'true');
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'ES11 0049 0070 1525 9029 9271');
  assert.equal(await copy.locator('.copy-check').isVisible(), true);
  assert.equal(await copy.locator('svg.copy-check path').count(), 1);
  assert.equal(await copy.locator('.copy-icon').isVisible(), false);
  assert.equal(await page.locator('#copy-status').getAttribute('class'), 'copy-status sr-only');
  assert.doesNotMatch(await page.locator('body').innerText(), /IBAN copiat!/);
  await page.mouse.move(0, 0);
  assert.equal(await copy.locator('.copy-check').isVisible(), true);
  await copy.hover();
  assert.equal(await copy.locator('.copy-icon').isVisible(), true);
  assert.equal(await copy.locator('.copy-check').isVisible(), false);
  await page.mouse.down();
  assert.equal(await copy.locator('.copy-check').isVisible(), true);
  await page.mouse.up();
  await page.waitForFunction(() => document.querySelector('#copy-iban').dataset.clicked === 'true');
  assert.equal(await copy.locator('.copy-check').isVisible(), true);
  await page.mouse.move(0, 0);
  assert.equal(await copy.locator('.copy-check').isVisible(), true);
  await copy.focus();
  await page.keyboard.press('Enter');
  assert.equal(await copy.locator('.copy-check').isVisible(), true);
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    const originalCopy = document.execCommand.bind(document);
    document.execCommand = command => { window.usedCopyFallback = command; return originalCopy(command); };
  });
  await page.getByRole('button', { name: 'Copia l’IBAN', exact: true }).click();
  assert.equal(await page.evaluate(() => window.usedCopyFallback), 'copy');
  assert.equal(await copy.getAttribute('data-copied'), 'true');
  assert.equal(await copy.locator('.copy-check').isVisible(), true);
  assert.equal(await page.locator('.clipboard-buffer').count(), 0);
  await page.evaluate(() => { document.execCommand = () => false; });
  await page.getByRole('button', { name: 'Copia l’IBAN', exact: true }).click();
  assert.match(await page.locator('#copy-status').textContent(), /copia’l manualment/);
  assert.equal(await copy.getAttribute('data-copied'), 'false');
  assert.equal(await copy.locator('.copy-icon').isVisible(), true);
  assert.equal(await page.locator('.clipboard-buffer').count(), 0);
  await page.close();
});
