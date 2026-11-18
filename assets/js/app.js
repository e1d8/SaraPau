import { icon } from './icons.js';
import { wedding as w } from './content.js';
import { setupRsvp } from './rsvp.js';
import { setupPageScrollbar, setupScrollGuides } from './scrollbar.js';
import { setupMotion } from './motion.js';
import { weddingCouple } from './couple.js';

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const art = (name, extra = '') => `<span class="art art-${name} ${extra}" aria-hidden="true"></span>`;
const external = (url, label, extra = '') => `<a class="${extra}" href="${escape(url)}" target="_blank" rel="noopener noreferrer"><span class="link-text">${escape(label)}</span><span class="sr-only"> (s’obri en una altra pestanya)</span></a>`;
const placeLink = key => {
  const place = w.places[key];
  return external(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`, place.name);
};

function rsvp() {
  return `<section class="rsvp section" id="rsvp" aria-label="Confirmació">
    <p class="closing-message">${escape(w.home.farewell)}</p>
    <div class="rsvp-panel"><div class="rsvp-invitation">
      <div class="invitation-decor" aria-hidden="true">${art('cupid', 'invitation-cupid')}<span class="heart-bubbles">${Array.from({ length: 6 }, () => `<span class="heart-bubble">${icon('heart', 'bubble-heart')}${icon('burst', 'bubble-pop')}</span>`).join('')}</span></div>
      <button class="button rsvp-trigger" id="open-rsvp" type="button" aria-haspopup="dialog" aria-controls="guest-dialog">Vindràs?</button>
    </div><div class="rsvp-success" id="rsvp-success" role="status" hidden><p class="success-title" id="rsvp-success-title" tabindex="-1">Respostes enviades</p><h3 class="success-thanks">Gràcies</h3>${icon('heart')}</div></div>
    <dialog class="guest-dialog" id="guest-dialog" aria-labelledby="manager-title" aria-describedby="rsvp-description">
      <div class="guest-dialog-header" id="guest-dialog-header"><h3 id="manager-title">Invitats</h3><h3 class="review-title" id="review-title" tabindex="-1" hidden>Resum de respostes</h3><h3 id="guest-dialog-title" hidden>Invitat 1</h3><h3 id="delete-guest-title" tabindex="-1" hidden>Borrar l’invitat?</h3><h3 id="rsvp-error-title" tabindex="-1" hidden>Error :(</h3><button class="close-dialog" id="close-guest-dialog" type="button" aria-label="Tancar finestra"><span aria-hidden="true">x</span></button></div>
      <p class="rsvp-description" id="rsvp-description" tabindex="-1">Afegix la resposta de tots els invitats del teu cercle</p>
      <div id="guest-manager">
        <div class="dialog-scroll" id="guest-list-scroll">
        <div class="guest-list" id="guest-grid" role="group" aria-label="Respostes dels invitats"><button class="guest-tile guest-add" id="add-guest" type="button" aria-label="Afegir invitat"><svg class="guest-add-outline" aria-hidden="true" focusable="false"><rect x="1.5" y="1.5" rx="10" vector-effect="non-scaling-stroke" stroke-dasharray="4 5 2.5 5"/></svg><span aria-hidden="true">+</span></button></div>
        </div>
        <div class="dialog-actions"><button class="button send-replies" id="send-replies" type="button" disabled>Enviar respostes ${icon('mail')}</button></div>
      </div>
      <form id="rsvp-form" hidden novalidate autocomplete="off" aria-labelledby="guest-dialog-title">
        <div class="dialog-scroll" id="guest-fields">
        <div class="form-field"><label for="guest-name">Nom i cognoms <span aria-hidden="true">*</span></label><textarea class="auto-grow" id="guest-name" name="name" rows="1" required maxlength="160" autocomplete="off" aria-describedby="form-status"></textarea></div>
        <fieldset class="attendance"><legend>Mos acompanyaràs? <span aria-hidden="true">*</span></legend><label class="radio-label"><input type="radio" name="attendance" value="yes" required aria-describedby="form-status">${icon('check', 'radio-tick')}<span>Sí, allí estaré!</span></label><label class="radio-label"><input type="radio" name="attendance" value="no" required aria-describedby="form-status">${icon('check', 'radio-tick')}<span>No podré vindre</span></label></fieldset>
        <div id="attendance-fields" hidden>
          <fieldset class="bus-choice"><legend>Te farà falta bus per anar i tornar? <span aria-hidden="true">*</span></legend>${w.busOptions.map(option => `<label class="radio-label"><input type="radio" name="bus" value="${escape(option.value)}" disabled aria-describedby="form-status">${icon('check', 'radio-tick')}<span>${escape(option.label)}</span></label>`).join('')}</fieldset>
          <div class="form-field"><label for="dietary">Al·lèrgies, intoleràncies, dieta vegetariana, vegana...?</label><textarea class="auto-grow" id="dietary" name="dietary" rows="1" maxlength="1500" disabled></textarea></div>
        </div>
        <p class="field-error form-status" id="form-status" role="status" aria-live="polite" hidden></p>
        </div>
        <div class="dialog-actions"><button class="button guest-submit" id="save-guest" type="submit" aria-label="Guardar resposta">${icon('arrow')}</button></div>
      </form>
      <div class="guest-saved" id="guest-saved" hidden><h4 id="another-guest-title" tabindex="-1">Voleu respondre per un altre invitat?</h4><div class="another-guest-actions"><button class="button" id="another-guest" type="button">Sí</button><button class="button button-alternative" id="continue-replies" type="button">No</button></div></div>
      <div class="delete-guest" id="delete-guest" hidden><div class="dialog-scroll delete-guest-content"><p id="delete-guest-name"></p></div><div class="dialog-actions another-guest-actions"><button class="button" id="confirm-delete-guest" type="button">Sí</button><button class="button button-alternative" id="cancel-delete-guest" type="button">No</button></div></div>
      <div class="rsvp-review" id="rsvp-review" hidden>
        <div class="dialog-scroll review-scroll" id="review-scroll" role="region" aria-labelledby="review-title" tabindex="0"><ol class="review-guests" id="reply-summary"></ol></div>
        <div class="dialog-actions review-actions"><button class="button review-submit" id="confirm-send" type="button">Enviar ${icon('mail')}</button></div>
      </div>
      <div class="dialog-scroll error-view" id="rsvp-error-view" hidden>
        <p class="rsvp-error" id="rsvp-error" role="alert">Alguna cosa ha anat mal, tona-ho a intentar més tard</p>
        <button class="error-link" id="toggle-error-details" type="button" aria-expanded="false" aria-controls="error-details"><span class="link-text">Mostrar error</span></button>
        <div id="error-details" hidden>
          <dl class="error-diagnostic"><div><dt>Codi</dt><dd id="error-code"></dd></div><div><dt>Error tècnic</dt><dd id="error-message"></dd></div><div><dt>Data i hora (Europe/Madrid)</dt><dd><time id="error-time"></time></dd></div></dl>
          <button class="error-link" id="download-error" type="button"><span class="link-text">Descarregar error (.txt)</span></button>
        </div>
      </div>
    </dialog>
    <dialog class="loading-dialog" id="rsvp-loading" aria-labelledby="loading-title"><span class="loading-spinner" aria-hidden="true"></span><h3 id="loading-title" tabindex="-1">Enviant respostes...</h3></dialog>
  </section>`;
}

function landing() {
  return `<main id="contingut">
    <section class="home-hero" aria-labelledby="hero-title"><div class="hero-copy"><h1 class="signature" id="hero-title">${escape(w.couple)}</h1><p class="hero-date"><time datetime="${escape(w.date)}">${escape(w.dateShort)}</time></p><p class="hero-opening">${escape(w.home.opening)}</p></div>${weddingCouple()}</section>
    <section class="timeline section" id="detalls" aria-label="Programa de la boda"><ol>${w.timeline.map(item => `<li class="timeline-item image-${escape(item.imageSide)}${item.kind === 'transport' ? ' is-transport' : ''}">${art(item.illustration, `timeline-art${item.imageFlipped ? ' is-flipped' : ''}`)}<div class="timeline-copy"><p class="timeline-time">${escape(item.time)}</p><h3>${escape(item.title)}</h3><p>${item.parts.map(part => typeof part === 'string' ? escape(part) : part.link === false ? escape(w.places[part.place].name) : placeLink(part.place)).join('')}</p></div></li>`).join('')}</ol></section>
    ${rsvp()}
    <section class="celebration section" aria-label="La nostra gent"><div class="banquet-divider" aria-hidden="true">${art('rames-taronger')}</div><p class="gift-message">${escape(w.home.giftMessage)}</p><div class="bank-account"><p><span class="sr-only">Compte bancari: </span><span id="iban">${escape(w.bankAccount)}</span></p><button class="copy-iban" id="copy-iban" type="button" aria-label="Copia l’IBAN" title="Copia l’IBAN">${icon('copy', 'copy-icon')}${icon('check', 'copy-check')}</button></div><p class="copy-status sr-only" id="copy-status" role="status" aria-live="polite"></p></section>
  </main><footer class="site-footer"><h2>Algun dubte?</h2><p class="footer-names">${w.contacts.map(contact => external(`https://wa.me/${contact.phone}`, contact.name)).join(' <span class="name-separator">·</span> ')}</p></footer>`;
}

document.querySelector('#app').innerHTML = landing();
setupRsvp();
setupPageScrollbar();
setupScrollGuides();
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
