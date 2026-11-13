import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { wedding } from '../assets/js/content.js';
import { validateReply, sendRepliesWithTimeout, simulateSendReplies } from '../assets/js/rsvp.js';

const root = resolve(import.meta.dirname, '..');

test('L’RSVP exigix nom, assistència i bus quan s’hi assistix', () => {
  assert.deepEqual(Object.keys(validateReply({ name: '  ', attendance: '', bus: '' })), ['name', 'attendance']);
  for (const { value: bus } of wedding.busOptions) {
    assert.deepEqual(validateReply({ name: ' Aina Ferrer ', attendance: 'yes', bus }), {});
  }
  assert.deepEqual(validateReply({ name: 'Aina Ferrer', attendance: 'yes', bus: '' }), { bus: true });
  assert.deepEqual(validateReply({ name: 'Aina Ferrer', attendance: 'no', bus: '' }), {});
  assert.ok(validateReply({ name: 'Aina Ferrer', attendance: 'maybe' }).attendance);
  assert.ok(validateReply({ name: 'Aina Ferrer', attendance: 'yes', bus: 'unknown' }).bus);
});

test('L’enviament necessita recepció explícita i cancel·la el transport en esgotar el termini', async () => {
  const replies = [{ name: 'Aina Ferrer', attendance: 'no', bus: '', dietary: '' }];
  assert.deepEqual(await sendRepliesWithTimeout(replies, {
    sendReplies: async payload => { assert.deepEqual(payload, replies); return { received: true }; },
  }), { received: true });
  let transportSignal;
  let acknowledge;
  await assert.rejects(sendRepliesWithTimeout(replies, {
    timeoutMs: 15,
    sendReplies: (_, { signal }) => {
      transportSignal = signal;
      return new Promise(resolve => { acknowledge = resolve; });
    },
  }), /Temps de recepció esgotat/);
  assert.equal(transportSignal.aborted, true);
  acknowledge({ received: true });
  await assert.rejects(sendRepliesWithTimeout(replies, {
    timeoutMs: 15, sendReplies: async () => ({ received: false }),
  }), /Temps de recepció esgotat/);
  await assert.rejects(sendRepliesWithTimeout(replies, {
    sendReplies: async () => { throw new Error('Error de transport'); },
  }), /Error de transport/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(simulateSendReplies(replies, { signal: controller.signal }), /cancel·lat/);
});

test('La landing utilitza valencià i recursos locals; les rutes antigues redirigixen', async () => {
  for (const filename of ['index.html', 'detalls.html', 'historia.html']) {
    const html = await readFile(resolve(root, filename), 'utf8');
    assert.match(html, /lang="ca-valencia"/);
    if (filename === 'index.html') {
      assert.match(html, /connect-src 'none'/);
      assert.match(html, /form-action 'none'/);
    } else {
      assert.match(html, /http-equiv="refresh" content="0; url=index\.html/);
    }
    assert.doesNotMatch(html, /<iframe|<script[^>]+https?:|Designed by Canva|Terms & Support|Privacy policy/i);
    for (const [, url] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
      assert.ok(!url.startsWith('/'), `${filename}: ruta absoluta ${url}`);
      await access(resolve(root, url.split('#')[0]));
    }
  }
});

test('Totes les fotografies i les màscares tenen el recurs corresponent', async () => {
  for (const filename of Object.values(wedding.photos)) await access(resolve(root, 'assets/photos', filename));
  const cssFile = resolve(root, 'assets/css/site.css');
  const css = await readFile(cssFile, 'utf8');
  for (const [, url] of css.matchAll(/url\("([^"]+)"\)/g)) await access(resolve(dirname(cssFile), url));
  assert.match(css, /background:var\(--white\)/);
  assert.doesNotMatch(css, /#a80605|#f88080|#05a857|#07e978|#3bf99a|#7cfbbc|#befddd/i);
  for (const color of ['#636b2f', '#bac095', '#d4de95', '#3d4127']) assert.ok(css.includes(color));
});

test('El codi de l’RSVP no inclou transport ni emmagatzematge', async () => {
  const js = await readFile(resolve(root, 'assets/js/rsvp.js'), 'utf8');
  assert.doesNotMatch(js, /fetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|document\.cookie/);
  assert.match(js, /event\.preventDefault\(\)/);
  const assets = await readdir(resolve(root, 'assets/js'));
  assert.deepEqual(assets.sort(), ['app.js', 'content.js', 'rsvp.js']);
});
