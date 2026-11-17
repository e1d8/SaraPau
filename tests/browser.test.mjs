import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
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

async function load(page, filename = 'index', { rsvpMode = 'demo', endpoint = '' } = {}) {
  // Les proves generals utilitzen la simulació de manera explícita.
  await page.route('**/assets/js/rsvp-config.js', route => route.fulfill({
    contentType: 'text/javascript', body: `export const rsvpConfig = ${JSON.stringify({ mode: rsvpMode, endpoint })};`,
  }));
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
      for (const [index, illustration] of ['esglesia-major', 'autobus', 'cotidia', 'focs-artificials'].entries()) {
        const art = page.locator('.timeline-item').nth(index).locator(`.art-${illustration}`);
        assert.equal(await art.count(), 1);
        assert.equal(await art.evaluate(el => el.getBoundingClientRect().width > el.offsetWidth), true, 'La imatge creix visualment sense eixamplar la columna');
      }
      if (width > 760) {
        const tops = await page.locator('.timeline-time').evaluateAll(times => times.map(el => el.getBoundingClientRect().top));
        assert.ok(Math.abs(tops[0] - tops[1]) < 1, 'Les hores de la primera fila estan alineades');
        assert.ok(Math.abs(tops[2] - tops[3]) < 1, 'Les hores de la segona fila estan alineades');
      }
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
      assert.equal(await page.locator('#open-rsvp').textContent(), 'Vindràs?');
      assert.equal(await page.locator('#rsvp h2').count(), 0);
      assert.equal(await page.locator('#guest-dialog').evaluate(el => el.open), false);
      assert.equal(await page.locator('#form-status').isVisible(), false);
      assert.equal(await page.locator('#rsvp-notice').count(), 0);
      assert.equal(await page.locator('.home-hero > .art, #timeline-title').count(), 0);
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
          await openRsvp(page);
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
  const title = page.locator('#hero-title');
  assert.equal(await title.locator('.name-source').textContent(), 'Sara i Pau');
  assert.equal(await title.locator('.name-glyph').allTextContents().then(characters => characters.join('')), 'Sara i Pau');
  assert.equal(await title.evaluate(el => [el, el.parentElement, el.closest('.home-hero')].every(node => {
    const style = getComputedStyle(node);
    return style.clipPath === 'none' && style.maskImage === 'none' && style.overflow === 'visible';
  })), true, 'El títol i els seus contenidors deixen espai als ornaments');
  assert.equal(await page.getByRole('heading', { name: 'Sara i Pau', exact: true }).count(), 1);
  assert.equal(await title.locator('.name-letter').evaluateAll(letters => letters.some(el => el.getAnimations().some(animation => animation.playState === 'running'))), true);
  await phase('date');
  assert.equal(await page.locator('#hero-title').evaluate(el => getComputedStyle(el).opacity), '1');
  assert.equal(await page.locator('.hero-opening').evaluate(el => el.classList.contains('reveal-pending')), true);
  assert.equal(await page.locator('.timeline-item').first().evaluate(el => el.classList.contains('reveal-pending')), true);
  const messageHeight = await page.locator('.hero-opening').evaluate(el => el.getBoundingClientRect().height);
  await phase('message');
  assert.equal(await title.locator('.name-source').textContent(), 'Sara i Pau');
  assert.equal(await title.locator('.name-glyph').allTextContents().then(characters => characters.join('')), 'Sara i Pau');
  assert.equal(await page.locator('.hero-date').evaluate(el => getComputedStyle(el).opacity), '1');
  assert.ok(await page.locator('.type-letter').count() > 100);
  assert.ok(await page.locator('.type-letter').evaluateAll(letters => letters.some(el => getComputedStyle(el).opacity === '0')));
  assert.equal(await page.locator('.hero-opening').evaluate(el => el.getBoundingClientRect().height), messageHeight);
  assert.equal(await page.locator('.timeline-item').first().evaluate(el => el.classList.contains('reveal-pending')), true);
  await phase('complete');
  assert.equal(await page.locator('.type-letter').evaluateAll(letters => letters.every(el => getComputedStyle(el).opacity === '1')), true);
  assert.equal(await page.locator('.hero-opening').evaluate(el => getComputedStyle(el).opacity), '1');
  await page.waitForFunction(() => !document.querySelector('.timeline-item').classList.contains('reveal-pending'));
  await page.close();
});

test('La màscara ampliada conté els traços reals de cada lletra durant el rebot', async () => {
  for (const width of [320, 390, 820, 1366]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'no-preference' });
    await page.goto(`${origin}${prefix}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelectorAll('.name-letter').length > 0);
    const ink = await page.evaluate(() => {
      for (const animation of document.getAnimations()) {
        const { delay, duration } = animation.effect.getTiming();
        if (animation.effect.target?.matches('.name-letter')) {
          // Mostregem exactament el pic del keyframe, sense la corba temporal.
          animation.effect.updateTiming({ easing: 'linear' });
          animation.pause(); animation.currentTime = delay + duration * .6;
        } else if (animation.effect.target?.matches('.name-stage')) {
          animation.pause(); animation.currentTime = duration - 1;
        }
      }
      const stage = document.querySelector('.name-stage').getBoundingClientRect();
      const context = document.createElement('canvas').getContext('2d');
      return [...document.querySelectorAll('.name-letter')].filter(el => el.textContent.trim()).map(letter => {
        const style = getComputedStyle(letter);
        context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const metrics = context.measureText(letter.textContent);
        const baseline = (parseFloat(style.lineHeight) - metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) / 2 + metrics.fontBoundingBoxAscent;
        const [ox, oy] = style.transformOrigin.split(' ').map(parseFloat);
        const matrix = new DOMMatrix(style.transform);
        const left = parseFloat(style.paddingLeft) - metrics.actualBoundingBoxLeft;
        const right = parseFloat(style.paddingLeft) + metrics.actualBoundingBoxRight;
        const top = parseFloat(style.paddingTop) + baseline - metrics.actualBoundingBoxAscent;
        const bottom = parseFloat(style.paddingTop) + baseline + metrics.actualBoundingBoxDescent;
        const points = [[left, top], [right, top], [right, bottom], [left, bottom]].map(([x, y]) => {
          const p = new DOMPoint(x - ox, y - oy).matrixTransform(matrix);
          return { x: p.x + ox + parseFloat(style.left), y: p.y + oy + parseFloat(style.top) };
        });
        return { letter: letter.textContent, scale: matrix.a, fits: points.every(p => p.x > 0 && p.x < stage.width && p.y > 0 && p.y < stage.height) };
      });
    });
    assert.equal(ink.every(letter => letter.fits), true, `${width}px: ${JSON.stringify(ink)}`);
    assert.equal(ink.every(letter => Math.abs(letter.scale - 1.07) < .00001), true);
    if (process.env.SCREENSHOTS_DIR) await page.locator('.hero-copy').screenshot({ path: resolve(process.env.SCREENSHOTS_DIR, `name-bounce-${width}.png`) });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => !document.documentElement.classList.contains('intro-locked') && !document.getAnimations().some(animation => animation.playState === 'running'));
    assert.equal(await page.getByRole('heading', { name: 'Sara i Pau', exact: true }).count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('intro-locked')), false);
    await page.close();
  }
});

test('Els noms i el missatge conserven les lletres i la posició en acabar i en redimensionar', async () => {
  for (const width of [320, 390, 820, 1366]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'no-preference' });
    await page.goto(`${origin}${prefix}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelectorAll('.name-glyph').length > 0);
    await page.evaluate(() => {
      window.introRects = selector => [...document.querySelectorAll(selector)].filter(el => el.textContent.trim()).map(el => {
        const range = document.createRange(); range.selectNodeContents(el);
        const rect = range.getBoundingClientRect();
        return { text: el.textContent, x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      });
      window.nameNodes = [...document.querySelectorAll('.name-glyph')];
      window.nameAnimations = document.getAnimations().filter(animation => animation.effect.target?.matches('.name-letter,.name-stage'));
      for (const animation of window.nameAnimations) {
        const { delay, duration } = animation.effect.getTiming();
        if (animation.effect.target.matches('.name-letter')) animation.effect.setKeyframes([
          { opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 1, transform: 'translateY(0) scale(1)' },
        ]);
        animation.pause(); animation.currentTime = delay + duration - .001;
      }
      window.nameBefore = window.introRects('.name-glyph');
    });
    await page.evaluate(() => window.nameAnimations.forEach(animation => animation.play()));
    await page.waitForFunction(() => document.querySelectorAll('.type-letter').length > 0);
    await page.evaluate(() => {
      window.messageNodes = [...document.querySelectorAll('.type-letter')];
      window.messageAnimations = document.getAnimations().filter(animation => animation.effect.target?.matches('.type-letter'));
      for (const animation of window.messageAnimations) {
        const { delay, duration } = animation.effect.getTiming();
        animation.effect.setKeyframes([{ opacity: 1 }, { opacity: 1 }]);
        animation.pause(); animation.currentTime = delay + duration - .001;
      }
      window.messageBefore = window.introRects('.type-letter');
    });
    if (process.env.SCREENSHOTS_DIR) await page.locator('.hero-copy').screenshot({ path: resolve(process.env.SCREENSHOTS_DIR, `intro-before-${width}.png`) });
    await page.evaluate(() => window.messageAnimations.forEach(animation => animation.play()));
    await page.waitForFunction(() => document.querySelector('.home-hero').dataset.intro === 'complete');
    const stable = await page.evaluate(() => {
      const unchanged = (before, after) => before.length === after.length && before.every((rect, index) =>
        ['x', 'y', 'width', 'height'].every(key => Math.abs(rect[key] - after[index][key]) < .05));
      return {
        sameNodes: [...window.nameNodes, ...window.messageNodes].every(node => node.isConnected),
        names: unchanged(window.nameBefore, window.introRects('.name-glyph')),
        message: unchanged(window.messageBefore, window.introRects('.type-letter')),
      };
    });
    assert.deepEqual(stable, { sameNodes: true, names: true, message: true }, `${width}px: salt en acabar l'animació`);
    if (process.env.SCREENSHOTS_DIR) await page.locator('.hero-copy').screenshot({ path: resolve(process.env.SCREENSHOTS_DIR, `intro-after-${width}.png`) });
    await page.setViewportSize({ width: width < 760 ? 1366 : 320, height: 900 });
    await page.waitForFunction(() => {
      const source = document.querySelector('.name-source').firstChild;
      let offset = 0;
      return [...document.querySelectorAll('.name-glyph')].every(glyph => {
        const expected = document.createRange();
        expected.setStart(source, offset); expected.setEnd(source, offset + glyph.textContent.length);
        offset += glyph.textContent.length;
        const actual = document.createRange(); actual.selectNodeContents(glyph);
        return Math.abs(expected.getBoundingClientRect().x - actual.getBoundingClientRect().x) < .05;
      });
    });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.close();
  }
});

test('Reduir el moviment durant l’escriptura mostra tot el text i cancel·la les lletres', async () => {
  const page = await browser.newPage({ reducedMotion: 'no-preference' });
  await load(page);
  await page.waitForFunction(() => document.querySelector('.home-hero').dataset.intro === 'message');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.querySelectorAll('.reveal-pending').length === 0);
  assert.equal(await page.getByRole('heading', { name: 'Sara i Pau', exact: true }).count(), 1);
  assert.equal(await page.locator('.type-source').textContent(), 'Hi ha llocs, persones i moments que sempre formaran part de la nostra història. Tornem on tot va començar per a celebrar el nostre amor amb vosaltres.');
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

test('Cupido flota al costat de Vindràs i els cors pugen i esclaten sense interferir amb el botó', async () => {
  for (const width of [1366, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'no-preference' });
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    await load(page);
    page.on('request', request => requests.push(request.url()));
    // El focus salta la benvinguda, com en l'accés normal amb teclat.
    await page.locator('#open-rsvp').focus({ preventScroll: true });
    await page.locator('.rsvp-invitation').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.rsvp-invitation').classList.contains('is-floating') && !document.querySelector('.rsvp-invitation').classList.contains('reveal-pending'));
    assert.equal(await page.locator('.invitation-decor').getAttribute('aria-hidden'), 'true');
    assert.equal(await page.locator('.heart-bubble').count(), 6);
    assert.equal(await page.locator('.invitation-decor').evaluate(el => getComputedStyle(el).pointerEvents), 'none');
    const button = page.locator('#open-rsvp');
    const buttonRect = await button.boundingBox();
    assert.equal(await button.evaluate(el => {
      const rect = el.getBoundingClientRect();
      return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest('button') === el;
    }), true);
    const bob = await page.locator('.invitation-cupid').evaluate(el => {
      const animation = el.getAnimations()[0];
      animation.pause();
      animation.currentTime = 0;
      const first = getComputedStyle(el).transform;
      animation.currentTime = animation.effect.getTiming().duration * .4;
      return { first, next: getComputedStyle(el).transform };
    });
    assert.notEqual(bob.first, bob.next, 'Cupido es balanceja en l’aire');
    const sample = async progress => page.locator('.heart-bubble').first().evaluate((el, progress) => {
      for (const animation of el.getAnimations({ subtree: true })) {
        const { delay, duration } = animation.effect.getTiming();
        animation.pause(); animation.currentTime = delay + duration * progress;
      }
      return {
        y: el.getBoundingClientRect().top,
        heart: parseFloat(getComputedStyle(el.querySelector('.bubble-heart')).opacity),
        pop: parseFloat(getComputedStyle(el.querySelector('.bubble-pop')).opacity),
      };
    }, progress);
    const born = await sample(.14), risen = await sample(.65), popped = await sample(.86);
    assert.ok(born.heart > .5 && risen.heart > .5);
    assert.ok(risen.y < born.y - 40, 'Els cors ixen del botó i pugen');
    assert.equal(popped.heart, 0);
    assert.ok(popped.pop > .1, 'El cor es transforma en un esclat');
    assert.deepEqual(await button.boundingBox(), buttonRect, 'La decoració no mou el botó');
    const cupidRect = await page.locator('.invitation-cupid').boundingBox();
    assert.ok(cupidRect.x < buttonRect.x && cupidRect.y < buttonRect.y);
    assert.ok(cupidRect.x >= 0 && cupidRect.x + cupidRect.width <= width);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    if (process.env.SCREENSHOTS_DIR) {
      await page.locator('.heart-bubble').evaluateAll(bubbles => bubbles.forEach((el, index) => {
        for (const animation of el.getAnimations({ subtree: true })) {
          const { delay, duration } = animation.effect.getTiming();
          animation.pause(); animation.currentTime = delay + duration * [.22, .44, .63, .85, .55, .1][index];
        }
      }));
      await page.screenshot({ path: resolve(process.env.SCREENSHOTS_DIR, `vindras-flotant-${width}.png`) });
    }
    await page.setViewportSize({ width, height: 400 });
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForFunction(() => !document.querySelector('.rsvp-invitation').classList.contains('is-floating'));
    assert.equal(await page.locator('.invitation-decor').evaluate(el => el.getAnimations({ subtree: true }).length), 0);
    await page.locator('.rsvp-invitation').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.rsvp-invitation').classList.contains('is-floating'));
    await button.click();
    assert.equal(await page.locator('#guest-manager').isVisible(), true);
    await page.waitForFunction(() => !document.querySelector('.rsvp-invitation').classList.contains('is-floating'));
    assert.equal(await page.locator('.invitation-decor').evaluate(el => el.getAnimations({ subtree: true }).length), 0);
    await page.locator('#close-guest-dialog').click();
    await page.waitForFunction(() => document.querySelector('.rsvp-invitation').classList.contains('is-floating'));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('.heart-bubbles').isVisible(), false);
    assert.equal(await page.locator('.invitation-cupid').isVisible(), true);
    assert.equal(await page.locator('.invitation-decor').evaluate(el => el.getAnimations({ subtree: true }).length), 0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(() => document.querySelector('.invitation-cupid').getAnimations().length > 0);
    assert.equal(await page.locator('.heart-bubble').count(), 6, 'Reobrir o reprendre no acumula cors');
    assert.deepEqual(errors, []);
    assert.deepEqual(requests, [], 'La decoració animada utilitza recursos locals ja carregats');
    await page.close();
  }
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
  assert.equal(await page.locator('.art-rames-taronger').evaluate(el => el.getBoundingClientRect().right > innerWidth), true);
  if (process.env.SCREENSHOTS_DIR) await page.screenshot({ path: resolve(process.env.SCREENSHOTS_DIR, 'rames-taronger-overlay-1920.png') });
  await openRsvp(page);
  await page.getByRole('button', { name: 'Afegir invitat', exact: true }).click();
  assert.equal(await rail.isVisible(), false);
  const close = page.getByRole('button', { name: 'Tancar finestra', exact: true });
  assert.equal(await close.textContent(), 'x');
  await close.click();
  assert.equal(await page.locator('#guest-manager').isVisible(), true);
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
  const church = page.locator('.timeline li').first().getByRole('link');
  assert.equal(new URL(await church.getAttribute('href')).searchParams.get('query'), 'Carrer Sant Roc, 1, 12540 Vila-real, Castelló');
  assert.equal(await page.locator('.timeline li').first().locator('p').last().evaluate(el => {
    const visible = el.cloneNode(true);
    visible.querySelectorAll('.sr-only').forEach(node => node.remove());
    return visible.textContent;
  }), 'Mos casarem a l’església arxiprestal major Sant Jaume de Vila-real');
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

async function openRsvp(page) {
  if (!await page.locator('#guest-dialog').evaluate(el => el.open)) await page.locator('#open-rsvp').click();
}

async function saveGuest(page, { name, attendance = 'no', bus = 'none', dietary = '' }) {
  await openRsvp(page);
  await page.getByRole('button', { name: 'Afegir invitat', exact: true }).click();
  await page.locator('#guest-name').fill(name);
  await page.getByLabel(attendance === 'yes' ? 'Sí, allí estaré!' : 'No podré vindre').check();
  if (attendance === 'yes') {
    await page.locator(`[name="bus"][value="${bus}"]`).check();
    await page.locator('#dietary').fill(dietary);
  }
  await page.locator('#save-guest').click();
  assert.equal(await page.locator('#guest-saved').isVisible(), true);
  await page.locator('#continue-replies').click();
}

test('Les capçaleres queden fixes i els botons compartixen tipografia i amplària segons el text', async () => {
  for (const width of [1366, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await load(page);
    await openRsvp(page);
    assert.equal(await page.locator('#manager-title').textContent(), 'Invitats');
    await page.locator('#add-guest').hover();
    assert.equal(await page.locator('#add-guest').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(212, 222, 149)');
    await page.mouse.move(0, 0);
    const buttonStyle = async selector => page.locator(selector).evaluate(el => {
      const style = getComputedStyle(el);
      return { font: style.fontFamily, size: style.fontSize, weight: style.fontWeight, lineHeight: style.lineHeight };
    });
    const triggerStyle = await buttonStyle('#open-rsvp');
    const assertButton = async selector => {
      await page.mouse.move(0, 0);
      assert.deepEqual(await buttonStyle(selector), triggerStyle, `${selector}: mateix text que Vindràs?`);
      const size = await page.locator(selector).evaluate(el => {
        const style = getComputedStyle(el);
        const range = document.createRange();
        range.selectNodeContents(el);
        const expected = range.getBoundingClientRect().width + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
        const width = el.getBoundingClientRect().width;
        const parent = getComputedStyle(el.parentElement);
        const available = el.parentElement.clientWidth - parseFloat(parent.paddingLeft) - parseFloat(parent.paddingRight);
        return { width, expected, available };
      });
      assert.ok(Math.abs(size.width - size.expected) < 2 || size.width < size.expected || Math.abs(size.width - size.available) < 2,
        `${selector}: amplària ajustada al text o al límit disponible ${JSON.stringify(size)}`);
      assert.equal(await page.locator(selector).evaluate(el => getComputedStyle(el).textTransform), 'none');
      if (!await page.locator(selector).isDisabled()) {
        await page.locator(selector).hover();
        assert.equal(await page.locator(selector).evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(212, 222, 149)', `${selector}: mateix ressaltat verd clar que el +`);
        await page.mouse.move(0, 0);
      }
    };
    const assertPinned = async (scrollSelector, fixedSelectors) => {
      const scroll = page.locator(scrollSelector);
      assert.equal(await scroll.evaluate(el => el.scrollHeight > el.clientHeight), true, `${scrollSelector}: hi ha contingut per desplaçar`);
      await scroll.evaluate(el => { el.scrollTop = 0; });
      const rects = () => page.locator(fixedSelectors).evaluateAll(elements => elements.map(el => {
        const rect = el.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
      }));
      const before = await rects();
      await scroll.evaluate(el => { el.scrollTop = el.scrollHeight; });
      assert.ok(await scroll.evaluate(el => el.scrollTop) > 0);
      assert.deepEqual(await rects(), before, 'Desplaçar el contingut no mou la capçalera ni el botó');
      assert.equal(await page.locator('#guest-dialog').evaluate(el => el.scrollHeight <= el.clientHeight + 1), true);
      assert.equal(await page.locator(fixedSelectors).evaluateAll(elements => elements.every(el => {
        const rect = el.getBoundingClientRect();
        return rect.top >= 0 && rect.bottom <= innerHeight && rect.left >= 0 && rect.right <= innerWidth;
      })), true);
    };
    await assertButton('#send-replies');
    for (const name of ['Aina', 'Berta', 'Carles', 'Dídac', 'Eva', 'Ferran']) await saveGuest(page, { name });
    await page.setViewportSize({ width, height: 320 });
    await assertPinned('#guest-list-scroll', '#manager-title,#rsvp-description,#close-guest-dialog,#send-replies');
    if (process.env.SCREENSHOTS_DIR) await page.locator('#guest-dialog').screenshot({ path: resolve(process.env.SCREENSHOTS_DIR, `invitats-fixos-${width}.png`) });
    await page.setViewportSize({ width, height: 568 });
    await page.locator('#add-guest').click();
    await page.locator('#guest-name').fill(['Invitat', 'amb', 'quatre', 'línies'].join('\n'));
    await page.getByLabel('Sí, allí estaré!').check();
    await page.locator('[name="bus"][value="none"]').check();
    await page.locator('#dietary').fill(Array.from({ length: 8 }, () => 'Comentari').join('\n'));
    await assertButton('#save-guest');
    await assertPinned('#guest-fields', '#guest-dialog-title,#close-guest-dialog,#save-guest');
    if (process.env.SCREENSHOTS_DIR) await page.locator('#guest-dialog').screenshot({ path: resolve(process.env.SCREENSHOTS_DIR, `formulari-fix-${width}.png`) });
    await page.locator('#save-guest').click();
    await assertButton('#another-guest');
    await assertButton('#continue-replies');
    assert.ok(await page.locator('#another-guest').evaluate(el => el.getBoundingClientRect().width) < await page.locator('#open-rsvp').evaluate(el => el.getBoundingClientRect().width));
    await page.locator('#continue-replies').click();
    await page.locator('.guest-edit').first().click();
    await assertButton('#save-guest');
    await page.locator('#close-guest-dialog').click();
    await page.locator('#send-replies').click();
    await assertButton('#confirm-send');
    await assertPinned('#review-scroll', '#review-title,#close-guest-dialog,#confirm-send');
    if (process.env.SCREENSHOTS_DIR) await page.locator('#guest-dialog').screenshot({ path: resolve(process.env.SCREENSHOTS_DIR, `resum-fix-${width}.png`) });
    await page.close();
  }
});

test('Els missatges del formulari reben el focus sense caixes i els botons conserven el focus de teclat', async () => {
  for (const outcome of ['success', 'error']) {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    await load(page);
    await page.evaluate(async () => {
      const old = document.querySelector('#rsvp');
      const next = old.cloneNode(true);
      old.replaceWith(next);
      const { setupRsvp } = await import('./assets/js/rsvp.js');
      setupRsvp(next, { sendReplies: () => new Promise((resolve, reject) => {
        window.finishSubmission = success => success ? resolve({ received: true }) : reject(new Error('Prova local'));
      }) });
    });
    const assertStatusFocus = async selector => {
      const status = await page.locator(selector).evaluate(el => ({
        focused: el === document.activeElement, outline: getComputedStyle(el).outlineStyle,
      }));
      assert.equal(status.focused, true, `${selector}: conservar el focus per anunciar el missatge`);
      assert.equal(status.outline, 'none', `${selector}: no mostrar una caixa al voltant del text`);
    };
    const assertButtonFocus = async selector => {
      const focus = await page.locator(selector).evaluate(el => ({
        active: document.activeElement?.id, focused: el === document.activeElement,
        visible: el.matches(':focus-visible'), outline: getComputedStyle(el).outlineStyle,
        width: parseFloat(getComputedStyle(el).outlineWidth),
      }));
      assert.ok(focus.focused && focus.visible && focus.outline !== 'none' && focus.width > 0,
        `${selector}: el focus de teclat ha de continuar visible ${JSON.stringify(focus)}`);
    };
    await page.keyboard.press('Tab');
    await page.locator('#open-rsvp').focus();
    await page.keyboard.press('Enter');
    await page.locator('#add-guest').focus();
    await assertButtonFocus('#add-guest');
    await page.keyboard.press('Enter');
    await page.locator('#guest-name').fill('Prova local');
    await page.getByLabel('No podré vindre').check();
    await page.keyboard.press('Tab');
    await page.locator('#rsvp-form button[type="submit"]').focus();
    await page.keyboard.press('Enter');
    await assertStatusFocus('#guest-saved h4');
    await page.keyboard.press('Tab');
    await assertButtonFocus('#another-guest');
    await page.keyboard.press('Tab');
    await assertButtonFocus('#continue-replies');
    await page.keyboard.press('Enter');
    await page.locator('#send-replies').focus();
    await page.keyboard.press('Enter');
    await assertStatusFocus('#review-title');
    await page.locator('#confirm-send').focus();
    await assertButtonFocus('#confirm-send');
    await page.keyboard.press('Enter');
    await assertStatusFocus('#loading-title');
    await page.evaluate(success => window.finishSubmission(success), outcome === 'success');
    await page.waitForFunction(expected => document.querySelector('#rsvp').dataset.state === expected, outcome);
    await assertStatusFocus(outcome === 'success' ? '#rsvp-success h3' : '#rsvp-error-title');
    await page.keyboard.press(outcome === 'success' ? 'Shift+Tab' : 'Tab');
    await assertButtonFocus('#close-guest-dialog');
    await page.keyboard.press('Enter');
    await assertButtonFocus('#open-rsvp');
    await page.close();
  }
});

test('Vindràs descarta canvis pendents, conserva invitats i permet revisar abans d’enviar una sola vegada', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await load(page);
  await page.locator('#rsvp').scrollIntoViewIfNeeded();
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  assert.equal(await page.locator('#guest-dialog').evaluate(el => el.open), false);
  assert.equal(await page.locator('.rsvp-panel h2').count(), 0);
  await openRsvp(page);
  const send = page.locator('#send-replies');
  assert.equal(await send.isVisible(), true);
  assert.equal(await send.isDisabled(), true);
  assert.equal(await send.textContent(), 'Enviar respostes 💌→');
  assert.equal(await page.locator('.rsvp-description').textContent(), 'Afegix la resposta de tots els invitats del teu cercle');
  await page.locator('#close-guest-dialog').click();
  assert.equal(await page.locator('#open-rsvp').isVisible(), true);
  await openRsvp(page);
  const add = page.locator('#add-guest');
  await add.click();
  assert.equal(await page.locator('#guest-dialog-title').textContent(), 'Invitat 1');
  const save = page.locator('#save-guest');
  assert.equal(await save.textContent(), '→');
  await page.locator('#guest-name').fill('Esborrany');
  await page.getByLabel('Sí, allí estaré!').check();
  await page.locator('#dietary').fill('Sense gluten');
  await page.locator('#close-guest-dialog').click();
  assert.equal(await page.locator('#guest-dialog').evaluate(el => el.open), true);
  assert.equal(await page.locator('#guest-manager').isVisible(), true);
  assert.equal(await page.locator('.guest-edit').count(), 0);
  await add.click();
  assert.equal(await page.locator('#guest-name').inputValue(), '');
  assert.equal(await page.locator('#dietary').inputValue(), '');
  assert.equal(await page.locator('[name="attendance"]:checked').count(), 0);
  assert.equal(await page.locator('#form-status').isVisible(), false);
  await save.click();
  assert.equal(await page.locator('#guest-name').getAttribute('aria-invalid'), 'true');
  assert.equal(await page.locator('#form-status').textContent(), 'Els camps amb * són obligatoris.');
  const name = 'Aina <img src="/no-enviar"> Ferrer';
  await page.locator('#guest-name').fill(name);
  await page.getByLabel('Sí, allí estaré!').check();
  await save.click();
  assert.equal(await page.locator('[name="bus"][aria-invalid="true"]').count(), 4);
  let first = true;
  for (const bus of ['none', 'outbound', 'return-midnight', 'return-two']) {
    if (!first) {
      await page.locator('.guest-edit').first().click();
      assert.equal(await save.textContent(), 'Guardar modificacions');
      assert.equal(await page.locator('#guest-dialog-title').textContent(), 'Invitat 1');
      assert.equal(await page.locator('#guest-name').inputValue(), name);
    }
    await page.locator(`[name="bus"][value="${bus}"]`).check();
    await page.locator('#dietary').fill(bus === 'none' ? '' : 'Sense gluten');
    await save.click();
    if (first) {
      assert.equal(await page.locator('#guest-saved h4').textContent(), 'Voleu respondre per un altre invitat?');
      assert.equal(await page.locator('#close-guest-dialog').isVisible(), false);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#guest-saved').isVisible(), true);
      const colors = await page.locator('.another-guest-actions .button').evaluateAll(buttons => buttons.map(el => getComputedStyle(el).backgroundColor));
      assert.notEqual(colors[0], colors[1]);
      assert.equal(colors[1], 'rgb(186, 192, 149)');
      if (process.env.SCREENSHOTS_DIR) await page.locator('#guest-dialog').screenshot({ path: resolve(process.env.SCREENSHOTS_DIR, 'altre-invitat-390.png') });
      await page.locator('#continue-replies').click();
    }
    assert.equal(await page.locator('#guest-manager').isVisible(), true);
    assert.equal(await page.locator('.guest-edit').count(), 1);
    assert.equal(await page.locator('.guest-initials').first().textContent(), 'AIN');
    first = false;
  }
  await page.locator('.guest-edit').first().click();
  assert.equal(await page.locator('[name="bus"]:checked').inputValue(), 'return-two');
  assert.equal(await page.locator('#dietary').inputValue(), 'Sense gluten');
  await page.locator('#guest-name').fill('Canvi descartat');
  await page.locator('#dietary').fill('Dieta descartada');
  await page.locator('[name="bus"][value="none"]').check();
  await page.locator('#close-guest-dialog').click();
  assert.equal(await page.locator('#guest-manager').isVisible(), true);
  assert.equal(await page.locator('.guest-edit').count(), 1);
  await page.locator('.guest-edit').first().click();
  assert.equal(await page.locator('#guest-name').inputValue(), name);
  assert.equal(await page.locator('#dietary').inputValue(), 'Sense gluten');
  assert.equal(await page.locator('[name="bus"]:checked').inputValue(), 'return-two');
  await page.getByLabel('No podré vindre').check();
  assert.equal(await page.locator('#attendance-fields').isVisible(), false);
  assert.equal(await page.locator('[name="bus"]:required').count(), 0);
  assert.equal(await page.locator('#dietary').inputValue(), '');
  await save.click();
  assert.equal(await page.locator('#guest-manager').isVisible(), true);
  await page.locator('#close-guest-dialog').click();
  await openRsvp(page);
  assert.equal(await page.locator('.guest-edit').count(), 1);
  assert.equal(await send.isDisabled(), false);
  await add.click();
  for (const [number, name] of [[2, 'Berta Ferrer'], [3, 'Carles Roig']]) {
    assert.equal(await page.locator('#guest-dialog-title').textContent(), `Invitat ${number}`);
    assert.equal(await page.locator('#guest-name').inputValue(), '');
    await page.locator('#guest-name').fill(name);
    await page.getByLabel('No podré vindre').check();
    await save.click();
    await page.locator('#another-guest').click();
  }
  assert.equal(await page.locator('#guest-dialog-title').textContent(), 'Invitat 4');
  await page.locator('#guest-name').fill('Dídac Martí');
  await page.locator('#close-guest-dialog').click();
  assert.equal(await page.locator('#guest-manager').isVisible(), true);
  assert.equal(await page.locator('.guest-edit').count(), 3);
  assert.deepEqual(await page.locator('.guest-initials').allTextContents(), ['AIN', 'BER', 'CAR']);
  await add.click();
  assert.equal(await page.locator('#guest-dialog-title').textContent(), 'Invitat 4');
  assert.equal(await page.locator('#guest-name').inputValue(), '');
  await page.locator('#guest-name').fill('Dídac Martí');
  await page.getByLabel('No podré vindre').check();
  await save.click();
  await page.locator('#continue-replies').click();
  for (const name of ['Eva Grau', 'Ferran Gil']) await saveGuest(page, { name });
  assert.equal(await page.locator('.guest-edit').count(), 6);
  assert.equal(await page.locator('#guest-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 5);
  assert.equal(await page.locator('.guest-edit').evaluateAll(buttons => buttons[5].getBoundingClientRect().top > buttons[0].getBoundingClientRect().top), true);
  await page.setViewportSize({ width: 320, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  if (process.env.SCREENSHOTS_DIR) await page.locator('#guest-dialog').screenshot({ path: resolve(process.env.SCREENSHOTS_DIR, 'invitats-320.png') });
  await send.click();
  assert.equal(await page.locator('#rsvp-review').isVisible(), true);
  assert.equal(await page.locator('#rsvp').getAttribute('data-state'), 'collecting');
  assert.equal(await page.locator('#rsvp-loading').evaluate(el => el.open), false);
  assert.equal(await page.locator('#confirm-send').textContent(), 'Enviar 💌→');
  assert.equal(await page.locator('#reply-summary > li').count(), 6);
  assert.deepEqual(await page.locator('#reply-summary > li').first().locator('dd').allTextContents(), [name, 'No', 'No', '—']);
  assert.equal(await page.locator('#reply-summary img').count(), 0, 'Els noms es mostren com a text literal');
  for (const [width, height] of [[1366, 900], [820, 900], [390, 844], [320, 568]]) {
    await page.setViewportSize({ width, height });
    const measure = () => page.locator('#review-title,#close-guest-dialog,#confirm-send').evaluateAll(buttons => buttons.map(el => {
      const rect = el.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
    }));
    await page.locator('#review-scroll').evaluate(el => { el.scrollTop = 0; });
    const before = await measure();
    assert.ok(Math.abs((before[0].top + before[0].bottom) / 2 - (before[1].top + before[1].bottom) / 2) < 1, 'El títol del resum i la x compartixen fila');
    assert.equal(await page.locator('#review-scroll').evaluate(el => el.scrollHeight > el.clientHeight), true);
    await page.locator('#review-scroll').evaluate(el => { el.scrollTop = el.scrollHeight; });
    assert.ok(await page.locator('#review-scroll').evaluate(el => el.scrollTop) > 0);
    assert.deepEqual(await measure(), before, 'La x i Enviar es mantenen fixos en desplaçar el resum');
    assert.ok(before.every(rect => rect.top >= 0 && rect.bottom <= height && rect.left >= 0 && rect.right <= width));
    assert.equal(await page.locator('#guest-dialog').evaluate(el => el.scrollHeight <= el.clientHeight + 1), true);
    if (process.env.SCREENSHOTS_DIR) await page.locator('#guest-dialog').screenshot({ path: resolve(process.env.SCREENSHOTS_DIR, `revisio-${width}.png`) });
  }
  await page.locator('#close-guest-dialog').click();
  assert.equal(await page.locator('#guest-manager').isVisible(), true);
  assert.equal(await page.locator('.guest-edit').count(), 6);
  await page.locator('.guest-edit').first().click();
  await page.locator('#guest-name').fill('Aina actualitzada');
  await save.click();
  await send.click();
  assert.equal(await page.locator('#reply-summary > li').first().locator('dd').first().textContent(), 'Aina actualitzada');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#guest-manager').isVisible(), true);
  await send.click();
  await page.locator('#confirm-send').click();
  assert.equal(await page.locator('#rsvp-loading').evaluate(el => el.open), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#rsvp-loading').evaluate(el => el.open), true);
  await page.evaluate(() => document.querySelector('#send-replies').click());
  await page.waitForFunction(() => document.querySelector('#rsvp').dataset.state === 'success');
  assert.equal(await page.locator('#rsvp-loading').evaluate(el => el.open), false);
  assert.equal(await page.locator('#rsvp-success h3').textContent(), 'Heu enviat les respostes. Gràcies');
  assert.equal(await page.locator('#rsvp-success .icon-heart').isVisible(), true);
  if (process.env.SCREENSHOTS_DIR) await page.locator('#guest-dialog').screenshot({ path: resolve(process.env.SCREENSHOTS_DIR, 'respostes-enviades-320.png') });
  assert.equal(await page.locator('#guest-manager').isVisible(), false);
  assert.equal(await page.locator('#rsvp-error').isVisible(), false);
  await page.locator('#close-guest-dialog').click();
  await openRsvp(page);
  assert.equal(await page.locator('#rsvp-success').isVisible(), true);
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    document.querySelector('#send-replies').click();
    document.querySelector('#add-guest').click();
  });
  assert.equal(await page.locator('#rsvp').getAttribute('data-state'), 'success');
  assert.equal(await page.locator('#rsvp-loading').evaluate(el => el.open), false);
  assert.deepEqual(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, cookies: document.cookie })), { local: 0, session: 0, cookies: '' });
  assert.deepEqual(requests, [], 'Gestionar i simular l’enviament no ha de fer peticions');
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('#guest-dialog').evaluate(el => el.open), false);
  await openRsvp(page);
  assert.equal(await page.locator('.guest-edit').count(), 0);
  assert.equal(await send.isDisabled(), true);
  await page.close();
});

test('Google rep un POST amb tots els invitats i només una recepció vàlida desbloqueja l’èxit', async () => {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  const endpoint = 'https://script.google.com/macros/s/test-deployment/exec';
  let payload, release, posted;
  const gate = new Promise(resolve => { release = resolve; });
  const postSeen = new Promise(resolve => { posted = resolve; });
  await page.route(endpoint, async route => {
    assert.equal(route.request().method(), 'POST');
    payload = JSON.parse(new URLSearchParams(route.request().postData()).get('payload'));
    posted();
    await gate;
    const receipt = { type: 'sarapau:rsvp:receipt', version: 1, requestId: payload.requestId, received: true, count: payload.guests.length };
    const inner = 'https://script.googleusercontent.com/test-receipt?message=' + encodeURIComponent(JSON.stringify(receipt));
    await route.fulfill({ contentType: 'text/html', body: `<iframe src="${inner}"></iframe>` });
  });
  await page.route('https://script.googleusercontent.com/test-receipt?*', route => {
    const receipt = JSON.parse(new URL(route.request().url()).searchParams.get('message'));
    return route.fulfill({ contentType: 'text/html', body: `<script>
      const receipt = ${JSON.stringify(receipt)}, target = ${JSON.stringify(origin)};
      window.top.postMessage({...receipt,requestId:'wrong-request'},target);
      window.top.postMessage({...receipt,count:999},target);
      window.top.postMessage({type:'test:invalid-receipts-sent'},target);
      setTimeout(()=>window.top.postMessage(receipt,target),200);
    </script>` });
  });
  await load(page, 'index', { rsvpMode: 'google', endpoint });
  await page.evaluate(() => window.addEventListener('message', event => {
    if (event.data?.type === 'test:invalid-receipts-sent') window.invalidReceiptsSent = true;
  }));
  await saveGuest(page, { name: 'Sara Ferrer', attendance: 'yes', bus: 'return-midnight', dietary: 'Sense gluten' });
  await saveGuest(page, { name: 'Pau Martí' });
  await page.locator('#send-replies').click();
  assert.equal(payload, undefined, 'Obrir el resum encara no envia dades a Google');
  assert.deepEqual(await page.locator('#reply-summary > li').first().locator('dd').allTextContents(), ['Sara Ferrer', 'Sí', 'Anada i tornada (00:00)', 'Sense gluten']);
  assert.deepEqual(await page.locator('#reply-summary > li').nth(1).locator('dd').allTextContents(), ['Pau Martí', 'No', 'No', '—']);
  await page.locator('#confirm-send').click();
  await postSeen;
  assert.deepEqual(payload.guests, [
    { name: 'Sara Ferrer', attending: true, bus: 'return-midnight', dietary: 'Sense gluten' },
    { name: 'Pau Martí', attending: false, bus: 'none', dietary: '' },
  ]);
  assert.equal(payload.replyTo, origin);
  assert.equal(await page.locator('#rsvp').getAttribute('data-state'), 'sending');
  // Un emissor alié amb un missatge semblant no confirma l'enviament.
  await page.evaluate(requestId => window.dispatchEvent(new MessageEvent('message', {
    origin: 'https://script.googleusercontent.com', source: window,
    data: { type: 'sarapau:rsvp:receipt', version: 1, requestId, received: true, count: 2 },
  })), payload.requestId);
  assert.equal(await page.locator('#rsvp').getAttribute('data-state'), 'sending');
  release();
  await page.waitForFunction(() => window.invalidReceiptsSent === true);
  assert.equal(await page.locator('#rsvp').getAttribute('data-state'), 'sending');
  await page.waitForFunction(() => document.querySelector('#rsvp').dataset.state === 'success');
  assert.equal(await page.locator('iframe[name^="rsvp-"]').count(), 0);
  assert.equal(await page.locator('form[target^="rsvp-"]').count(), 0);
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
  await page.close();
});

test('Sense endpoint no hi ha èxit simulat i un timeout retira el transport de Google', async () => {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  await load(page, 'index', { rsvpMode: 'google' });
  await saveGuest(page, { name: 'Sara Ferrer' });
  await page.locator('#send-replies').click();
  await page.locator('#confirm-send').click();
  await page.waitForFunction(() => document.querySelector('#rsvp').dataset.state === 'error');
  assert.equal(await page.locator('#rsvp').getAttribute('data-error'), 'CONFIGURATION_ERROR');
  assert.equal(await page.locator('iframe[name^="rsvp-"]').count(), 0);
  const endpoint = 'https://script.google.com/macros/s/test-timeout/exec';
  await page.route(endpoint, route => route.fulfill({ contentType: 'text/html', body: 'Sense confirmació' }));
  const result = await page.evaluate(async endpoint => {
    const { sendToGoogleSheets } = await import('./assets/js/google-sheets.js');
    try {
      await sendToGoogleSheets([{ name: 'Pau', attendance: 'no', bus: '', dietary: '' }], { endpoint, timeoutMs: 150 });
      return 'unexpected success';
    } catch (error) { return error.message; }
  }, endpoint);
  assert.equal(result, 'Temps de recepció esgotat');
  assert.equal(await page.locator('iframe[name^="rsvp-"]').count(), 0);
  await page.close();
});

test('El rebuig de Google conserva el codi de diagnòstic sense mostrar èxit', async () => {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  const endpoint = 'https://script.google.com/macros/s/test-rejected/exec';
  let rejectedReceipt;
  await page.route(endpoint, route => {
    const payload = JSON.parse(new URLSearchParams(route.request().postData()).get('payload'));
    const receipt = rejectedReceipt = { type: 'sarapau:rsvp:receipt', version: 1, requestId: payload.requestId, received: false, count: 0, error: 'NOT_CONFIGURED' };
    return route.fulfill({ contentType: 'text/html', body: `<script>window.top.postMessage(${JSON.stringify(receipt)},${JSON.stringify(origin)});</script>` });
  });
  await load(page, 'index', { rsvpMode: 'google', endpoint });
  await saveGuest(page, { name: 'Prova local' });
  await page.locator('#send-replies').click();
  await page.locator('#confirm-send').click();
  await page.waitForFunction(() => document.querySelector('#rsvp').dataset.state === 'error');
  assert.equal(await page.locator('#rsvp').getAttribute('data-error'), 'NOT_CONFIGURED');
  assert.equal(await page.locator('#rsvp-success').isVisible(), false);
  await page.locator('#toggle-error-details').click();
  assert.equal(await page.locator('#error-message').textContent(), JSON.stringify(rejectedReceipt, null, 2));
  assert.deepEqual(JSON.parse(await page.locator('#error-message').textContent()), rejectedReceipt);
  await page.close();
});

test('Sense recepció en trenta segons, es cancel·la l’enviament i no es pot tornar a enviar', async () => {
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
  await page.clock.install();
  await page.locator('#send-replies').click();
  await page.locator('#confirm-send').click();
  assert.equal(await page.locator('#rsvp-loading').evaluate(el => el.open), true);
  await page.clock.runFor(29000);
  assert.equal(await page.locator('#rsvp').getAttribute('data-state'), 'sending');
  await page.clock.runFor(1100);
  await page.waitForFunction(() => document.querySelector('#rsvp').dataset.state === 'error');
  assert.equal(await page.locator('#rsvp').getAttribute('data-error'), 'TIMEOUT');
  assert.equal(await page.locator('#rsvp-error').textContent(), 'Alguna cosa ha anat mal, tona-ho a intentar més tard');
  assert.equal(await page.locator('#guest-dialog').getAttribute('aria-labelledby'), 'rsvp-error-title');
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
  assert.equal(await page.locator('#guest-dialog').evaluate(el => el.open), true);
  await page.locator('#close-guest-dialog').click();
  await openRsvp(page);
  assert.equal(await page.locator('#rsvp-error').isVisible(), true);
  assert.equal(await page.evaluate(() => window.sendCalls), 1);
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('#rsvp-error').isVisible(), false);
  assert.equal(await page.locator('.guest-edit').count(), 0);
  await page.close();
});

test('L’error conserva la traça tècnica original en pantalla i TXT sense afegir les dades del formulari', async () => {
  const cases = [
    { code: 'CONFIGURATION_ERROR', message: 'Falta configurar l’URL d’Apps Script.', width: 1366, height: 900 },
    { code: 'TIMEOUT', message: 'Temps de recepció esgotat', width: 820, height: 900 },
    { code: 'NOT_CONFIGURED', message: 'Google no ha confirmat el guardat.', width: 390, height: 844 },
    { code: 'SERVER_ERROR', message: 'Detall del transport <img src="/no-carregar">.\n'.repeat(40), width: 320, height: 568 },
    { code: 'SEND_FAILED', message: 'No s’ha pogut completar l’enviament.', unexpected: true, width: 320, height: 568 },
  ];
  for (const scenario of cases) {
    const page = await browser.newPage({ viewport: { width: scenario.width, height: scenario.height }, reducedMotion: 'reduce' });
    await load(page);
    await page.evaluate(async scenario => {
      const old = document.querySelector('#rsvp');
      const next = old.cloneNode(true);
      old.replaceWith(next);
      const { setupRsvp } = await import('./assets/js/rsvp.js');
      const { RsvpError } = await import('./assets/js/google-sheets.js');
      window.sendCalls = 0;
      setupRsvp(next, { sendReplies: async () => {
        window.sendCalls++;
        const error = scenario.unexpected ? new TypeError('Cannot read properties of null (reading "getRange")') : new RsvpError(scenario.code, scenario.message);
        window.originalTechnicalError = error.stack;
        throw error;
      } });
    }, scenario);
    await saveGuest(page, { name: 'Nom privat', attendance: 'yes', dietary: 'dieta privada' });
    await page.locator('#send-replies').click();
    await page.locator('#confirm-send').click();
    await page.waitForFunction(() => document.querySelector('#rsvp').dataset.state === 'error');
    assert.equal(await page.locator('#rsvp-error-title').textContent(), 'Error :(');
    assert.equal(await page.locator('#guest-dialog').getAttribute('aria-labelledby'), 'rsvp-error-title');
    assert.equal(await page.locator('#rsvp-error-title').evaluate(el => el === document.activeElement), true);
    const requests = [];
    page.on('request', request => requests.push(request.url()));
    const initialUrl = page.url();
    const initialPages = page.context().pages().length;
    const toggle = page.locator('#toggle-error-details');
    assert.equal(await toggle.textContent(), 'Mostrar error');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await page.locator('#error-details').isVisible(), false);
    await toggle.focus();
    await page.keyboard.press('Enter');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(await toggle.textContent(), 'Ocultar error');
    assert.equal(await page.locator('#error-code').textContent(), scenario.code);
    const technical = await page.evaluate(() => window.originalTechnicalError);
    assert.equal(await page.locator('#error-message').textContent(), technical);
    if (scenario.unexpected) assert.match(technical, /^TypeError: Cannot read properties of null/);
    assert.equal(await page.locator('#error-details img').count(), 0);
    const iso = await page.locator('#error-time').getAttribute('datetime');
    assert.equal(new Date(iso).toISOString(), iso);
    const details = await page.locator('#error-details').textContent();
    assert.doesNotMatch(details, /Nom privat|dieta privada|config-privada/);
    if (scenario.code === 'SERVER_ERROR') {
      const before = await page.locator('#rsvp-error-title,#close-guest-dialog').evaluateAll(elements => elements.map(el => {
        const rect = el.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom };
      }));
      assert.ok(Math.abs((before[0].top + before[0].bottom) / 2 - (before[1].top + before[1].bottom) / 2) < 1);
      await page.locator('#rsvp-error-view').evaluate(el => { el.scrollTop = el.scrollHeight; });
      assert.ok(await page.locator('#rsvp-error-view').evaluate(el => el.scrollTop) > 0);
      assert.deepEqual(await page.locator('#rsvp-error-title,#close-guest-dialog').evaluateAll(elements => elements.map(el => {
        const rect = el.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom };
      })), before);
      if (process.env.SCREENSHOTS_DIR) await page.locator('#guest-dialog').screenshot({ path: resolve(process.env.SCREENSHOTS_DIR, 'error-llarg-320.png') });
    }
    // Espiar només el cicle de vida de les URLs locals, sense canviar el Blob.
    await page.evaluate(() => {
      const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
      window.createdReports = []; window.revokedReports = [];
      URL.createObjectURL = blob => { const url = create(blob); window.createdReports.push(url); return url; };
      URL.revokeObjectURL = url => { window.revokedReports.push(url); revoke(url); };
    });
    const downloaded = page.waitForEvent('download');
    await page.locator('#download-error').click();
    const download = await downloaded;
    assert.match(download.suggestedFilename(), /^sarapau-error-\d{4}-\d{2}-\d{2}-\d{6}\.txt$/);
    assert.equal(await download.failure(), null);
    const report = await readFile(await download.path(), 'utf8');
    assert.ok(report.includes('Diagnòstic d’enviament'));
    assert.ok(report.includes(`Codi: ${scenario.code}`));
    assert.ok(report.includes(`Error tècnic:\n${technical}`));
    assert.ok(report.includes(`Data i hora (UTC): ${iso}`));
    assert.ok(report.includes(await page.locator('#error-time').textContent()));
    assert.doesNotMatch(report, /Nom privat|dieta privada|config-privada/);
    await page.waitForFunction(() => window.createdReports.length === 1 && window.revokedReports.includes(window.createdReports[0]));
    assert.equal(page.url(), initialUrl);
    assert.equal(page.context().pages().length, initialPages);
    assert.equal(await page.locator('#guest-dialog').evaluate(el => el.open), true);
    await page.locator('#close-guest-dialog').click();
    await openRsvp(page);
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator('#error-time').getAttribute('datetime'), iso);
    await toggle.click();
    assert.equal(await page.locator('#error-details').isVisible(), false);
    assert.equal(await toggle.textContent(), 'Mostrar error');
    await page.evaluate(() => {
      document.querySelector('#send-replies').click();
      document.querySelector('#confirm-send').click();
      document.querySelector('#add-guest').click();
    });
    assert.equal(await page.evaluate(() => window.sendCalls), 1);
    assert.equal(await page.locator('#rsvp').getAttribute('data-state'), 'error');
    assert.deepEqual(requests, [], 'Consultar i descarregar el diagnòstic no transmet dades');
    if (process.env.SCREENSHOTS_DIR && scenario.code === 'NOT_CONFIGURED') {
      await toggle.click();
      await page.locator('#guest-dialog').screenshot({ path: resolve(process.env.SCREENSHOTS_DIR, 'error-diagnostic-390.png') });
    }
    await page.reload({ waitUntil: 'networkidle' });
    await openRsvp(page);
    assert.equal(await page.locator('#rsvp').getAttribute('data-state'), 'collecting');
    assert.equal(await page.locator('#error-code').textContent(), '');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    await page.close();
  }
});

test('Els camps creixen fins a quatre línies, es contrauen i mantenen les barres uniformes', async () => {
  const page = await browser.newPage({ viewport: { width: 320, height: 844 }, reducedMotion: 'reduce' });
  await load(page);
  await openRsvp(page);
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
  await page.locator('#save-guest').click();
  assert.equal(await page.locator('#guest-saved').isVisible(), true);
  await page.locator('#continue-replies').click();
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
