import { wedding as w } from './content.js';
import { setupRsvp } from './rsvp.js';
import { setupPageScrollbar } from './scrollbar.js';

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const art = (name, extra = '') => `<span class="art art-${name} ${extra}" aria-hidden="true"></span>`;
const external = (url, label, extra = '') => `<a class="${extra}" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)}<span class="sr-only"> (s’obri en una altra pestanya)</span></a>`;
const placeLink = key => {
  const place = w.places[key];
  return external(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`, place.name);
};

function rsvp() {
  return `<section class="rsvp section" id="rsvp" aria-labelledby="rsvp-title">
    <div class="rsvp-panel">
      <h2 class="form-heading" id="rsvp-title">Confirmació</h2>
      <div id="guest-manager">
        <p class="rsvp-description">Afegix la resposta de tots els invitats del teu cercle</p>
        <div class="guest-grid" id="guest-grid" role="group" aria-label="Respostes dels invitats"><button class="guest-tile guest-add" id="add-guest" type="button" aria-label="Afegir invitat"><span aria-hidden="true">+</span></button></div>
        <button class="button send-replies" id="send-replies" type="button" hidden>Enviar respostes</button>
      </div>
      <div class="rsvp-success" id="rsvp-success" hidden><svg class="reply-heart" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 51C25 44 9 34 9 22 9 9 26 7 32 19 38 7 55 9 55 22 55 34 39 44 32 51Z"/></svg><h3 tabindex="-1">Gràcies</h3></div>
      <p class="rsvp-error" id="rsvp-error" role="alert" tabindex="-1" hidden>Alguna cosa ha anat mal, tona-ho a intentar més tard</p>
    </div>
    <dialog class="guest-dialog" id="guest-dialog" aria-labelledby="guest-dialog-title">
      <div class="guest-dialog-header"><h3 id="guest-dialog-title">Afegir invitat</h3><button class="close-dialog" id="close-guest-dialog" type="button" aria-label="Tancar finestra"><span aria-hidden="true">x</span></button></div>
      <form id="rsvp-form" novalidate autocomplete="off" aria-labelledby="guest-dialog-title">
        <div class="form-field"><label for="guest-name">Nom i cognoms <span aria-hidden="true">*</span></label><textarea class="auto-grow" id="guest-name" name="name" rows="1" required maxlength="160" autocomplete="off" aria-describedby="form-status"></textarea></div>
        <fieldset class="attendance"><legend>Mos acompanyaràs? <span aria-hidden="true">*</span></legend><label class="radio-label"><input type="radio" name="attendance" value="yes" required aria-describedby="form-status"><span>Sí, allí estaré!</span></label><label class="radio-label"><input type="radio" name="attendance" value="no" required aria-describedby="form-status"><span>No podré vindre</span></label></fieldset>
        <div id="attendance-fields" hidden>
          <fieldset class="bus-choice"><legend>Te farà falta bus per anar i tornar? <span aria-hidden="true">*</span></legend>${w.busOptions.map(option => `<label class="radio-label"><input type="radio" name="bus" value="${escape(option.value)}" disabled aria-describedby="form-status"><span>${escape(option.label)}</span></label>`).join('')}</fieldset>
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
    <section class="home-hero" aria-labelledby="hero-title"><div class="hero-copy"><p class="hero-opening">${escape(w.home.opening)}</p><h1 class="signature" id="hero-title">${escape(w.couple)}</h1><p class="hero-date"><time datetime="${escape(w.date)}">${escape(w.dateShort)}</time></p><p class="hero-location">${escape(w.location)}</p></div>${art('wedding-table')}</section>
    <section class="timeline section" id="detalls" aria-labelledby="timeline-title"><h2 id="timeline-title">EL PROGRAMA DE LA BODA</h2><ol>${w.timeline.map(item => `<li class="timeline-item image-${escape(item.imageSide)}">${art(item.illustration, `timeline-art${item.imageFlipped ? ' is-flipped' : ''}`)}<div class="timeline-copy"><p class="timeline-time">${escape(item.time)}</p><h3>${escape(item.title)}</h3><p>${item.parts.map(part => typeof part === 'string' ? escape(part) : placeLink(part.place)).join('')}</p></div></li>`).join('')}</ol></section>
    ${rsvp()}
    <section class="celebration section" aria-label="La nostra gent"><div class="banquet-divider" aria-hidden="true">${art('banquet')}</div><p class="closing-message">${escape(w.home.farewell)}</p><div class="bank-account"><p><span class="sr-only">Compte bancari: </span><span id="iban">${escape(w.bankAccount)}</span></p><button class="copy-iban" id="copy-iban" type="button" aria-label="Copia l’IBAN" title="Copia l’IBAN"><svg class="copy-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg><svg class="copy-check" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L20 5"/></svg></button></div><p class="copy-status sr-only" id="copy-status" role="status" aria-live="polite"></p></section>
  </main><footer class="site-footer"><h2>Algun dubte?</h2><p class="footer-names">${w.contacts.map(contact => external(`https://wa.me/${contact.phone}`, contact.name)).join(' <span class="name-separator">·</span> ')}</p></footer>`;
}

document.querySelector('#app').innerHTML = landing();
setupRsvp();
setupPageScrollbar();

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
