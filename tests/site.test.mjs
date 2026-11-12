import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { wedding } from '../assets/js/content.js';
import { validateReply } from '../assets/js/rsvp.js';

const root = resolve(import.meta.dirname, '..');

test('L’RSVP exigix nom, assistència i una quantitat vàlida quan correspon', () => {
  assert.deepEqual(Object.keys(validateReply({ name: '  ', attendance: '', guests: '' })), ['name', 'attendance']);
  for (const guests of ['', '0', '-1', '1.5', 'abc', 'Infinity', '1e3', '9007199254740992']) {
    assert.ok(validateReply({ name: 'Aina Ferrer', attendance: 'yes', guests }).guests, guests);
  }
  assert.deepEqual(validateReply({ name: ' Aina Ferrer ', attendance: 'yes', guests: '3' }), {});
  assert.deepEqual(validateReply({ name: 'Aina Ferrer', attendance: 'no', guests: '' }), {});
  assert.ok(validateReply({ name: 'Aina Ferrer', attendance: 'maybe', guests: '1' }).attendance);
});

test('Les tres pàgines utilitzen valencià, recursos locals i bloquegen enviaments', async () => {
  for (const filename of ['index.html', 'detalls.html', 'historia.html']) {
    const html = await readFile(resolve(root, filename), 'utf8');
    assert.match(html, /lang="ca-valencia"/);
    assert.match(html, /connect-src 'none'/);
    assert.match(html, /form-action 'none'/);
    assert.doesNotMatch(html, /<iframe|<script[^>]+https?:|Designed by Canva|Terms & Support|Privacy policy/i);
    for (const [, url] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
      assert.ok(!url.startsWith('/'), `${filename}: ruta absoluta ${url}`);
      await access(resolve(root, url));
    }
  }
});

test('Totes les fotografies i les màscares tenen el recurs corresponent', async () => {
  for (const filename of Object.values(wedding.photos)) await access(resolve(root, 'assets/photos', filename));
  const cssFile = resolve(root, 'assets/css/site.css');
  const css = await readFile(cssFile, 'utf8');
  for (const [, url] of css.matchAll(/url\("([^"]+)"\)/g)) await access(resolve(dirname(cssFile), url));
  assert.match(css, /background:var\(--white\)/);
  assert.doesNotMatch(css, /#a80605|#f88080/i);
});

test('El codi de l’RSVP no inclou transport ni emmagatzematge', async () => {
  const js = await readFile(resolve(root, 'assets/js/rsvp.js'), 'utf8');
  assert.doesNotMatch(js, /fetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|document\.cookie/);
  assert.match(js, /event\.preventDefault\(\)/);
  const assets = await readdir(resolve(root, 'assets/js'));
  assert.deepEqual(assets.sort(), ['app.js', 'content.js', 'rsvp.js']);
});
