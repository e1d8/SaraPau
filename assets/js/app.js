import { wedding as w } from './content.js';
import { setupRsvp } from './rsvp.js';

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const art = (name, extra = '') => `<span class="art art-${name} ${extra}" aria-hidden="true"></span>`;
const photo = (name, alt, extra = '', eager = false) => `<img class="${extra}" src="assets/photos/${escape(w.photos[name])}" alt="${escape(alt)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async">`;
const external = (url, label, extra = '') => `<a class="${extra}" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)}<span class="sr-only"> (s’obri en una altra pestanya)</span></a>`;
const button = (url, label, outline = false) => `<a class="button${outline ? ' button-outline' : ''}" href="${escape(url)}">${escape(label)}</a>`;
const page = document.body.dataset.page;

function header() {
  const items = [['home', 'index.html', 'Inici'], ['details', 'detalls.html', 'Detalls de la boda'], ['story', 'historia.html', 'La nostra història']];
  return `<header class="site-header"><nav aria-label="Navegació principal">${items.map(([id, href, label]) => `<a href="${href}"${id === page ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav></header>`;
}

function footer({ dark = false, invitation = false } = {}) {
  return `<footer class="site-footer${dark ? ' site-footer-dark' : ''}">
    <div class="footer-inner">
      <p class="footer-message">${escape(invitation ? 'Tenim moltes ganes de celebrar-ho amb vosaltres!' : w.home.farewell)}</p>
      ${invitation ? button('index.html#rsvp', 'Confirma l’assistència', dark) : ''}
      <p class="signature footer-signature">${escape(w.couple)}</p>
      <div class="contacts"><h2>Tens algun dubte?</h2>${w.contacts.map(contact => `<div><p class="signature contact-name">${escape(contact.name)}</p><a href="mailto:${escape(contact.email)}">${escape(contact.email)}</a></div>`).join('')}</div>
    </div>
    ${dark ? '' : '<a class="back-top" href="#inici">↑ Torna a l’inici</a>'}
  </footer>`;
}

function letterCard() {
  return `<div class="letter-card">
    ${art('letter-frame')}
    ${photo('invitation', 'Una parella compartix un moment davall del vel, en blanc i negre.', 'letter-photo')}
    <div class="letter-copy"><p>${escape(w.home.invitation)}</p><p class="with-love">Amb estima,</p><p class="signature">${escape(w.couple)}</p></div>
  </div>`;
}

function postcard() {
  return `<div class="postcard">
    ${photo('postcard', 'Una parella abraçada en una fotografia de demostració en blanc i negre.')}
    ${art('postcard')}
    <p class="signature">${escape(w.couple)}</p>
  </div>`;
}

function rsvp() {
  return `<section class="rsvp section" id="rsvp" aria-labelledby="rsvp-title">
    <div class="rsvp-intro">${postcard()}<h2 id="rsvp-title">Confirma<br>l’assistència</h2><p>${escape(w.home.rsvp)}</p><p class="reply-by">Per favor, respon abans del<br><strong>${escape(w.replyBy)}.</strong></p></div>
    <div class="rsvp-panel">
      <form id="rsvp-form" novalidate autocomplete="off" aria-labelledby="rsvp-title" aria-describedby="rsvp-notice">
        <h3 class="form-heading">Confirmació</h3>
        <p class="form-notice" id="rsvp-notice">Formulari de prova: no s’enviarà cap resposta.</p>
        <div class="form-field"><label for="guest-name">Nom i cognoms <span aria-hidden="true">*</span></label><input id="guest-name" name="name" type="text" required maxlength="160" autocomplete="off" aria-describedby="name-error"><p class="field-error" id="name-error" data-error="name"></p></div>
        <fieldset class="attendance"><legend>Ens acompanyaràs? <span aria-hidden="true">*</span></legend><label class="radio-label"><input type="radio" name="attendance" value="yes" required aria-describedby="attendance-error"><span>Sí, allí estaré!</span></label><label class="radio-label"><input type="radio" name="attendance" value="no" required aria-describedby="attendance-error"><span>No podré vindre</span></label><p class="field-error" id="attendance-error" data-error="attendance"></p></fieldset>
        <div id="attendance-fields" hidden>
          <div class="form-field"><label for="guest-count">Nombre d’assistents <span aria-hidden="true">*</span></label><p class="field-help" id="guests-help">Inclou-te a tu i les persones que t’acompanyen.</p><input id="guest-count" name="guests" type="number" min="1" step="1" value="1" disabled aria-describedby="guests-help guests-error"><p class="field-error" id="guests-error" data-error="guests"></p></div>
          <div class="form-field"><label for="dietary">Al·lèrgies o necessitats alimentàries</label><textarea id="dietary" name="dietary" rows="2" maxlength="1500" disabled></textarea></div>
        </div>
        <div class="form-field"><label for="guest-message">Vols deixar-nos un missatge?</label><textarea id="guest-message" name="message" rows="3" maxlength="2000"></textarea></div>
        <p class="field-help">Els camps amb * són obligatoris.</p>
        <p class="field-error form-status" id="form-status" role="status" aria-live="polite"></p>
        <button class="button" type="submit">Confirma l’assistència</button>
      </form>
      <div class="rsvp-success" id="rsvp-success" hidden>
        <svg class="reply-heart" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 51C25 44 9 34 9 22 9 9 26 7 32 19 38 7 55 9 55 22 55 34 39 44 32 51Z"/></svg><h3 tabindex="-1">Gràcies per provar-lo!</h3><p id="reply-summary"></p><p>Esta confirmació és només una prova. No s’ha enviat cap dada i la resposta desapareixerà quan recarregues la pàgina.</p><button class="button button-outline" type="button" id="edit-reply">Edita la resposta</button>
      </div>
    </div>
  </section>`;
}

function home() {
  return `${header()}<main id="contingut">
    <section class="home-hero" aria-labelledby="hero-title"><div class="hero-copy"><p class="eyebrow">Vos convidem amb molta il·lusió</p><p class="hero-subtitle">a celebrar la boda de</p><h1 class="signature" id="hero-title">${escape(w.couple)}</h1><p class="hero-date"><time datetime="${escape(w.date)}">${escape(w.dateShort)}</time></p><p class="hero-location">${escape(w.location)}</p></div>${art('hero-table')}</section>
    <section class="invitation section" aria-labelledby="invitation-title"><h2 id="invitation-title">Ens<br>casem!</h2>${letterCard()}</section>
    <section class="explore section" aria-label="Descobriu la nostra boda"><article>${art('champagne')}<h2>Detalls de la boda</h2><p>${escape(w.home.details)}</p>${button('detalls.html', 'Descobrix els detalls')}</article><article>${art('angel')}<h2>La nostra història</h2><p>${escape(w.home.story)}</p>${button('historia.html', 'Llig la nostra història')}</article></section>
    ${rsvp()}<div class="banquet-divider" aria-hidden="true">${art('banquet')}</div>
  </main>${footer()}`;
}

function localMap() {
  return `<div class="local-map" role="img" aria-label="Il·lustració de la ubicació de la celebració a Napa Valley. Consulta l’enllaç per a veure les indicacions reals."><span class="map-road road-one"></span><span class="map-road road-two"></span><span class="map-road road-three"></span><span class="map-pin" aria-hidden="true">♡</span><span class="map-label">Napa Valley</span></div>`;
}

function details() {
  return `${header()}<main id="contingut">
    <section class="details-hero" aria-labelledby="details-title"><p>Tot el que necessites saber<br>per al nostre gran dia</p><div class="details-scene">${art('wedding-table')}<h1 class="signature" id="details-title">Detalls<br>de la boda</h1></div></section>
    <section class="ceremony section" aria-label="Data, hora i lloc de la celebració"><div><h2>Cerimònia<br>i celebració</h2><h3>Data</h3><p><time datetime="${escape(w.date)}">${escape(w.dateLong)}</time></p><h3>Hora</h3><p>${escape(w.time)}</p></div><div class="calendar">${art('calendar')}<p>Dia i hora</p></div><div><h2 class="venue-name">${escape(w.venue.name)}</h2><p>${escape(w.venue.address)}</p>${external(w.venue.mapsUrl, 'Consulta Google Maps', 'text-link')}</div></section>
    <section class="timeline section" aria-labelledby="timeline-title"><h2 id="timeline-title">El programa de la boda</h2><ol>${w.timeline.map(item => `<li><p class="timeline-time">${escape(item.time)}</p><h3>${escape(item.title)}</h3><p>${escape(item.text)}</p></li>`).join('')}</ol></section>
    <section class="dresscode section" aria-labelledby="dresscode-title"><h2 id="dresscode-title">Com vestir</h2><p>${escape(w.dresscode)}</p><div class="swatches" role="img" aria-label="Tons d’inspiració: verd, verd clar, blanc, negre i groc">${['primary', 'light', 'white', 'black', 'gold'].map(color => art('paint-swatch', `swatch-${color}`)).join('')}</div></section>
    <section class="directions section" aria-labelledby="directions-title"><div class="directions-letter">${art('letter-frame')}<div class="directions-letter-content"><p>${escape(w.venue.description)}</p>${localMap()}${external(w.venue.mapsUrl, 'Com arribar-hi', 'button')}</div></div><div class="directions-copy"><h2 id="directions-title">Com arribar-hi</h2><h3>En cotxe</h3><p>${escape(w.venue.car)}</p><hr><h3>En transport públic</h3><p>${escape(w.venue.transit)}</p></div></section>
    <section class="entourage-registry section" aria-label="Acompanyants i regals"><div class="entourage"><h2>Ens acompanyen</h2><p>${escape(w.entourageIntro)}</p><dl>${w.entourage.map(item => `<div><dt>${escape(item.role)}</dt><dd>${escape(item.names)}</dd></div>`).join('')}</dl></div><div class="registry">${art('gift')}<h2>Llista de regals</h2><p>${escape(w.registry.text)}</p>${w.registry.url ? external(w.registry.url, 'Consulta la llista', 'button') : '<button class="button" type="button" id="registry-button" aria-expanded="false" aria-controls="registry-note">Consulta la llista</button>'}${w.registry.url ? '' : `<p class="registry-note" id="registry-note" role="status" hidden>${escape(w.registry.placeholder)}</p>`}</div></section>
    <section class="accommodation section" aria-labelledby="accommodation-title"><div class="banquet-divider" aria-hidden="true">${art('banquet')}</div><h2 id="accommodation-title">On allotjar-se</h2><p class="accommodation-intro">${escape(w.accommodationIntro)}</p><div class="hotel-grid">${w.hotels.map(hotel => `<article><h3>${escape(hotel.name)}</h3><p><strong>${escape(hotel.distance)}</strong><br>${escape(hotel.text)}</p>${external(hotel.mapsUrl, 'Com arribar-hi', 'button button-outline')}</article>`).join('')}</div></section>
  </main>${footer({ invitation: true })}`;
}

function photoMemory(photoKey, className) {
  return `<div class="photo-memory ${className}">${photo(photoKey, 'Un record de la parella en una fotografia de demostració.')}${art('photo-frame')}</div>`;
}

function chapter(index, illustration) {
  const content = w.story.chapters[index];
  return `<div class="chapter-copy">${art(illustration)}<h2><span>Capítol ${index + 1}</span>${escape(content.title)}</h2><p>${escape(content.text)}</p></div>`;
}

function story() {
  return `${header()}<main id="contingut">
    <section class="story-hero" aria-labelledby="story-title"><h1 class="signature" id="story-title">La nostra història</h1><p class="sr-only">${escape(w.story.opening)}</p><div class="story-portrait"><p class="story-handwriting" aria-hidden="true">${escape(w.story.opening)}</p>${photo('story', 'Una parella abraçada en una fotografia de demostració en blanc i negre.', '', true)}<p class="signature">${escape(w.couple)}</p></div></section>
    <section class="chapter chapter-one section" aria-label="Capítol 1: El principi">${chapter(0, 'cupid')}<div class="memories">${photoMemory('memoryOne', 'memory-one')}${photoMemory('memoryTwo', 'memory-two')}</div></section>
    <section class="chapter chapter-two section" aria-label="Capítol 2: Créixer junts">${chapter(1, 'heart')}</section>
    <section class="chapter chapter-three section" aria-label="Capítol 3: Comença el nostre per sempre"><div class="forever-memory">${photoMemory('forever', 'memory-forever')}<p class="signature">${escape(w.couple)}</p></div>${chapter(2, 'rings')}</section>
  </main>${footer({ invitation: true, dark: true })}`;
}

document.querySelector('#app').innerHTML = ({ home, details, story }[page] || home)();
setupRsvp();
document.querySelector('#registry-button')?.addEventListener('click', event => {
  const note = document.querySelector('#registry-note');
  note.hidden = !note.hidden;
  event.currentTarget.setAttribute('aria-expanded', String(!note.hidden));
});

// Les seccions es creen abans de resoldre l’àncora en entrar des d’una altra pàgina.
if (location.hash) {
  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target) requestAnimationFrame(() => target.scrollIntoView());
}
