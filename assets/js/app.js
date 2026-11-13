import { wedding as w } from './content.js';
import { setupRsvp } from './rsvp.js';
import { setupPageScrollbar } from './scrollbar.js';
import { setupMotion } from './motion.js';

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const art = (name, extra = '') => `<span class="art art-${name} ${extra}" aria-hidden="true"></span>`;
// Traços dibuixats a mà: els mateixos gràfics per als resultats i el porta-retalls.
const iconPaths = {
  check: '<path class="ink-fill" d="M2.8 11.3c.5-.8 1.3-.9 1.9-.4l1.5 1.7 1.1 1 .7 1.3 1.1 1c1.2-1.7 2.2-3.3 3.7-4.8l1.3-1.7 1.9-1.9 1.4-1.9 1.9-1.6c.7-.6 1.7-.5 2.1.2.5.8 0 1.5-.7 2.3L19 9l-1.5 1.6-1.2 1.8-2 2.3-1.2 1.9-1.8 2.1c-.8 1.2-1.4 2.2-2.5 1.2L7.1 18l-1-1.6-1.7-1.7-.8-1.4c-.5-.6-1.2-1.2-.8-2Z"/>',
  cross: '<path class="ink-fill" d="M4.6 3.7c.7-.5 1.4-.1 2 .5 4.6 4.7 8.4 9.7 12.8 14.5.8.9.8 1.7.2 2.1-.8.6-1.6.1-2.2-.6C13.2 15.7 9 10.6 4.6 6c-.8-.9-.7-1.8 0-2.3Z"/><path class="ink-fill" d="M18.6 3.2c.8-.6 1.6-.6 2.1.1.5.8-.1 1.6-.8 2.3C15.6 10 11.1 15.5 6.3 20c-.8.8-1.7 1.1-2.3.4-.5-.7-.2-1.4.5-2.2C9 13.3 13.7 7.7 18.6 3.2Z"/>',
  heart: '<path class="ink-fill" d="M11.4 21.1c-1.3-1.3-2.8-2.1-4-3.5l-1.6-1.4c-1.3-1.4-2.3-2.6-3-4.4l-.6-1.3c-.7-2.7-.2-4.7 1.6-6.1l1.5-.8c2.1-.6 3.9.1 5.1 1.6l1.5 2.1c.6-1.1 1.2-2.4 2.4-3.2l1.4-.9c2.1-.9 4.2.2 5.5 1.8l.7 1.5c.6 1.8.3 3.2-.5 4.8l-1 1.6c-1.1 1.8-2.8 3-4.2 4.5l-1.7 1.3-1.7 1.6c-.5.5-.9 1-1.4.8Z"/>',
  copy: '<path d="M9.2 7.7c3-.3 6-.1 9.1-.2 1.1 0 1.8.6 1.7 1.8l.2 9.4c0 1.2-.5 1.8-1.7 1.9l-9.2.2c-1.2 0-1.8-.6-1.8-1.8l-.2-9.2c0-1.3.6-2 1.9-2.1Z"/><path d="m7.5 16.7-2.3.1c-1.2 0-1.8-.6-1.8-1.8l.2-10c0-1.1.5-1.8 1.7-1.9l8.8.2c1.2 0 1.8.6 1.8 1.7l-.1 2.4"/>',
};
const icon = (name, extra = '') => `<svg class="handdrawn-icon icon-${name} ${extra}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${iconPaths[name]}</svg>`;
const external = (url, label, extra = '') => `<a class="${extra}" href="${escape(url)}" target="_blank" rel="noopener noreferrer"><span class="link-text">${escape(label)}</span><span class="sr-only"> (s’obri en una altra pestanya)</span></a>`;
const placeLink = key => {
  const place = w.places[key];
  return external(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`, place.name);
};

function rsvp() {
  return `<section class="rsvp section" id="rsvp" aria-labelledby="rsvp-title">
    <div class="rsvp-panel">
      <h2 class="form-heading" id="rsvp-title">Confirmació<span class="rsvp-result" aria-hidden="true" hidden>${icon('check')}${icon('cross')}</span></h2>
      <div id="guest-manager">
        <p class="rsvp-description">Afegix la resposta de tots els invitats del teu cercle</p>
        <div class="guest-grid" id="guest-grid" role="group" aria-label="Respostes dels invitats"><button class="guest-tile guest-add" id="add-guest" type="button" aria-label="Afegir invitat"><svg class="guest-add-outline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M15 3C37 2 66 4 86 2Q97 1 97 15C98 40 96 64 98 83Q99 96 84 97C61 98 38 96 16 98Q3 99 3 85C2 63 4 38 2 16Q1 4 15 3Z" vector-effect="non-scaling-stroke" stroke-dasharray="4 5 2.5 5"/></svg><span aria-hidden="true">+</span></button></div>
        <button class="button send-replies" id="send-replies" type="button" hidden>Enviar respostes</button>
      </div>
      <div class="rsvp-success" id="rsvp-success" hidden><h3 tabindex="-1">Gràcies ${icon('heart')}</h3></div>
      <p class="rsvp-error" id="rsvp-error" role="alert" tabindex="-1" hidden>Alguna cosa ha anat mal, tona-ho a intentar més tard</p>
    </div>
    <dialog class="guest-dialog" id="guest-dialog" aria-labelledby="guest-dialog-title">
      <div class="guest-dialog-header"><h3 id="guest-dialog-title">Afegir invitat</h3><button class="close-dialog" id="close-guest-dialog" type="button" aria-label="Tancar finestra"><span aria-hidden="true">x</span></button></div>
      <form id="rsvp-form" novalidate autocomplete="off" aria-labelledby="guest-dialog-title">
        <div class="form-field"><label for="guest-name">Nom i cognoms <span aria-hidden="true">*</span></label><textarea class="auto-grow" id="guest-name" name="name" rows="1" required maxlength="160" autocomplete="off" aria-describedby="form-status"></textarea></div>
        <fieldset class="attendance"><legend>Mos acompanyaràs? <span aria-hidden="true">*</span></legend><label class="radio-label"><input type="radio" name="attendance" value="yes" required aria-describedby="form-status">${icon('check', 'radio-tick')}<span>Sí, allí estaré!</span></label><label class="radio-label"><input type="radio" name="attendance" value="no" required aria-describedby="form-status">${icon('check', 'radio-tick')}<span>No podré vindre</span></label></fieldset>
        <div id="attendance-fields" hidden>
          <fieldset class="bus-choice"><legend>Te farà falta bus per anar i tornar? <span aria-hidden="true">*</span></legend>${w.busOptions.map(option => `<label class="radio-label"><input type="radio" name="bus" value="${escape(option.value)}" disabled aria-describedby="form-status">${icon('check', 'radio-tick')}<span>${escape(option.label)}</span></label>`).join('')}</fieldset>
          <div class="form-field"><label for="dietary">Al·lèrgies, intoleràncies, dieta vegetariana, vegana...?</label><textarea class="auto-grow" id="dietary" name="dietary" rows="1" maxlength="1500" disabled></textarea></div>
        </div>
        <p class="field-error form-status" id="form-status" role="status" aria-live="polite" hidden></p>
        <button class="button" type="submit">Guardar resposta</button>
      </form>
      <div class="guest-saved" id="guest-saved" hidden><h4 tabindex="-1">Resposta guardada</h4><ul class="reply-summary" id="reply-summary"></ul><button class="button" id="continue-replies" type="button">Continuar</button></div>
    </dialog>
    <dialog class="loading-dialog" id="rsvp-loading" aria-labelledby="loading-title"><span class="loading-spinner" aria-hidden="true"></span><h3 id="loading-title" tabindex="-1">Enviant respostes...</h3></dialog>
  </section>`;
}

function landing() {
  return `<main id="contingut">
    <section class="home-hero" aria-labelledby="hero-title"><div class="hero-copy"><h1 class="signature" id="hero-title">${escape(w.couple)}</h1><p class="hero-date"><time datetime="${escape(w.date)}">${escape(w.dateShort)}</time></p><p class="hero-opening">${escape(w.home.opening)}</p></div>${art('wedding-table')}</section>
    <section class="timeline section" id="detalls" aria-labelledby="timeline-title"><h2 id="timeline-title">EL PROGRAMA DE LA BODA</h2><ol>${w.timeline.map(item => `<li class="timeline-item image-${escape(item.imageSide)}${item.kind === 'transport' ? ' is-transport' : ''}">${art(item.illustration, `timeline-art${item.imageFlipped ? ' is-flipped' : ''}`)}<div class="timeline-copy"><p class="timeline-time">${escape(item.time)}</p><h3>${escape(item.title)}</h3><p>${item.parts.map(part => typeof part === 'string' ? escape(part) : placeLink(part.place)).join('')}</p></div></li>`).join('')}</ol></section>
    ${rsvp()}
    <section class="celebration section" aria-label="La nostra gent"><div class="banquet-divider" aria-hidden="true">${art('banquet')}</div><p class="closing-message">${escape(w.home.farewell)}</p><div class="bank-account"><p><span class="sr-only">Compte bancari: </span><span id="iban">${escape(w.bankAccount)}</span></p><button class="copy-iban" id="copy-iban" type="button" aria-label="Copia l’IBAN" title="Copia l’IBAN">${icon('copy', 'copy-icon')}${icon('check', 'copy-check')}</button></div><p class="copy-status sr-only" id="copy-status" role="status" aria-live="polite"></p></section>
  </main><footer class="site-footer"><h2>Algun dubte?</h2><p class="footer-names">${w.contacts.map(contact => external(`https://wa.me/${contact.phone}`, contact.name)).join(' <span class="name-separator">·</span> ')}</p></footer>`;
}

document.querySelector('#app').innerHTML = landing();
setupRsvp();
setupPageScrollbar();
setupMotion();

function copyWithSelection(text) {
  const active = document.activeElement;
  const selection = window.getSelection();
  const ranges = selection ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange()) : [];
  const buffer = document.createElement('textarea');
  buffer.value = text;
  buffer.className = 'clipboard-buffer';
  buffer.readOnly = true;
  document.body.append(buffer);
  buffer.select();
  let copied = false;
  try { copied = document.execCommand('copy'); } catch { /* Es mostrarà l’alternativa manual. */ }
  buffer.remove();
  if (selection) {
    selection.removeAllRanges();
    ranges.forEach(range => selection.addRange(range));
  }
  active?.focus({ preventScroll: true });
  return copied;
}

const copyButton = document.querySelector('#copy-iban');
copyButton.addEventListener('pointerleave', () => { delete copyButton.dataset.clicked; });
copyButton.addEventListener('click', async () => {
  const status = document.querySelector('#copy-status');
  status.textContent = '';
  copyButton.dataset.clicked = String(copyButton.matches(':hover'));
  let copied = false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(w.bankAccount);
      copied = true;
    }
  } catch { /* Prova la còpia per selecció si el navegador denega l’accés. */ }
  if (!copied) copied = copyWithSelection(w.bankAccount);
  copyButton.dataset.copied = String(copied);
  if (!copied || !copyButton.matches(':hover')) delete copyButton.dataset.clicked;
  status.classList.toggle('sr-only', copied);
  status.textContent = copied ? 'Copiat al porta-retalls.' : 'No s’ha pogut copiar. Selecciona l’IBAN i copia’l manualment.';
});

// Les seccions es creen abans de resoldre l’àncora en entrar des d’una altra pàgina.
if (location.hash) {
  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target) requestAnimationFrame(() => target.scrollIntoView());
}
