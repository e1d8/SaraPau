// La benvinguda prioritza els noms, la data i el missatge. Després, cada
// element entra una sola vegada quan arriba a la pantalla, sense moure el disseny.
export function setupMotion() {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  setupInvitationMotion(preference);
  if (preference.matches || !('IntersectionObserver' in window) || !Element.prototype.animate) return;
  const targets = [...document.querySelectorAll('.hero-copy > *, .timeline-item, .rsvp-invitation, .celebration > .banquet-divider, .closing-message, .gift-message, .bank-account, .site-footer > *')];
  const hero = document.querySelector('.home-hero');
  const branches = createNameOrnament('branches');
  hero.querySelector('.hero-date').append(branches);
  const introduction = [
    { element: hero.querySelector('h1'), phase: 'names', signature: true },
    { element: hero.querySelector('.hero-date'), phase: 'date', duration: 500 },
    { element: hero.querySelector('.hero-opening'), phase: 'message', letters: 'typewriter' },
  ];
  const animations = new Set();
  const track = animation => {
    animations.add(animation);
    return animation.finished.then(() => {}, () => {}).finally(() => animations.delete(animation));
  };
  let introActive = !location.hash && scrollY < 80;
  if (introActive) branches.classList.add('ornament-pending');
  let stopped = false;
  const visible = new Set();
  let revealTimer = null;
  let lastRevealAt = -Infinity;
  const unlockScroll = () => document.documentElement.classList.remove('intro-locked');
  if (introActive) document.documentElement.classList.add('intro-locked');
  const drawOrnament = ornament => {
    ornament.classList.remove('ornament-pending');
    ornament.querySelectorAll('path').forEach(path => {
      track(path.animate([
        { strokeDashoffset: '1', opacity: 0, offset: 0 },
        { opacity: .2, offset: .3 },
        { opacity: .75, offset: .8 },
        { strokeDashoffset: '0', opacity: 1, offset: 1 },
      ], {
        duration: Number(path.dataset.duration), delay: Number(path.dataset.delay),
        easing: 'ease-in-out', fill: 'backwards',
      }));
    });
  };
  const reveal = (element, instant = false, { duration = 650, emphasis = false } = {}) => {
    if (!element.classList.contains('reveal-pending')) return Promise.resolve();
    element.classList.remove('reveal-pending');
    visible.delete(element);
    observer.unobserve(element);
    if (instant || preference.matches) return Promise.resolve();
    const animation = element.animate([
      { opacity: 0, translate: emphasis ? '0 14px' : '0 18px', scale: emphasis ? .96 : 1 },
      { opacity: 1, translate: '0 0', scale: 1 },
    ], { duration, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
    return track(animation);
  };
  const revealSignature = async element => {
    element.classList.remove('reveal-pending');
    const text = element.textContent;
    const characters = typeof Intl.Segmenter === 'function'
      ? [...new Intl.Segmenter('ca', { granularity: 'grapheme' }).segment(text)].map(part => part.segment)
      : [...text];
    const source = document.createElement('span');
    source.className = 'name-source';
    source.textContent = text;
    const stage = document.createElement('span');
    stage.className = 'name-stage';
    stage.setAttribute('aria-hidden', 'true');
    const ornament = createNameOrnament();
    element.replaceChildren(source, ornament, stage);
    element.classList.add('name-animating');
    let nameResizeObserver;
    let lastAnimation;
    let offset = 0;
    let delay = 0;
    try {
      const entries = characters.map(character => {
        const letter = document.createElement('span');
        letter.className = 'name-letter';
        const glyph = document.createElement('span');
        glyph.className = 'name-glyph';
        glyph.textContent = character;
        letter.append(glyph);
        stage.append(letter);
        const entry = { character, offset, letter };
        offset += character.length;
        return entry;
      });
      const layout = () => {
        const box = element.getBoundingClientRect();
        const ink = source.getBoundingClientRect();
        const style = getComputedStyle(element);
        const bleed = parseFloat(style.fontSize);
        const lineHeight = parseFloat(style.lineHeight);
        // Els anells seguixen la mida del nom, sense participar en el flux del text.
        ornament.style.width = `${Math.min(box.width - 4, ink.width + bleed * 1.2)}px`;
        ornament.style.height = `${box.height + bleed * .2}px`;
        ornament.style.top = `${-bleed * .22}px`;
        const stageWidth = box.width + 2 * bleed;
        const left = ink.left - box.left + bleed - bleed * .15;
        const right = ink.right - box.left + bleed + bleed * .15;
        const start = (1.4 * stageWidth - left) / (1.5 * stageWidth) * 100;
        const end = (1.1 * stageWidth - right) / (1.5 * stageWidth) * 100;
        const range = document.createRange();
        entries.forEach(({ character, offset, letter }) => {
          range.setStart(source.firstChild, offset);
          range.setEnd(source.firstChild, offset + character.length);
          const bounds = range.getBoundingClientRect();
          letter.style.left = `${bounds.left - box.left}px`;
          letter.style.width = `${bounds.width}px`;
          letter.style.transformOrigin = `${bleed + bounds.width / 2}px ${bleed + lineHeight * .65}px`;
        });
        // La posició final de la màscara és també el valor base: acabar
        // l'animació no canvia el dibuix ni la composició del nom.
        stage.style.maskPosition = `${end}% 0`;
        return { start, end };
      };
      const { start, end } = layout();
      nameResizeObserver = new ResizeObserver(layout);
      nameResizeObserver.observe(element);
      window.addEventListener('pagehide', event => { if (!event.persisted) nameResizeObserver.disconnect(); });
      const curtainDuration = characters.reduce((total, character) => total + (/\s/.test(character) ? 45 : 80), 0) + 220;
      track(stage.animate([
        { maskPosition: `${start}% 0` }, { maskPosition: `${end}% 0` },
      ], { duration: curtainDuration, easing: 'linear', fill: 'backwards' }));
      drawOrnament(ornament);
      entries.forEach(({ character, letter }) => {
        lastAnimation = letter.animate([
          { opacity: 0, transform: 'translateY(12px) scale(.55)', offset: 0 },
          { opacity: 1, transform: 'translateY(-3px) scale(1.07)', offset: .6 },
          { opacity: 1, transform: 'translateY(1px) scale(.985)', offset: .82 },
          { opacity: 1, transform: 'translateY(0) scale(1)', offset: 1 },
        ], { duration: 520, delay, easing: 'cubic-bezier(.22,.7,.3,1)', fill: 'backwards' });
        track(lastAnimation);
        delay += /\s/.test(character) ? 45 : 80;
      });
      // Les capes es queden pintades en la mateixa posició quan acaben.
      // Substituir-les per text pla tornaria a canviar l'espaiat de la font.
      if (!lastAnimation) return;
      const timing = lastAnimation.effect.getTiming();
      const handoff = timing.delay + timing.duration * .78;
      // La data entra mentre s'assenta l'últim rebot.
      await new Promise(resolve => {
        const check = () => {
          if (stopped || lastAnimation.playState === 'finished' || lastAnimation.currentTime >= handoff) resolve();
          else requestAnimationFrame(check);
        };
        check();
      });
    } catch (error) {
      nameResizeObserver?.disconnect();
      element.replaceChildren(document.createTextNode(text));
      element.classList.remove('name-animating');
      throw error;
    }
  };
  const typewrite = async element => {
    element.classList.remove('reveal-pending');
    const text = element.textContent;
    const characters = typeof Intl.Segmenter === 'function'
      ? [...new Intl.Segmenter('ca', { granularity: 'grapheme' }).segment(text)].map(part => part.segment)
      : [...text];
    const source = document.createElement('span');
    source.className = 'type-source sr-only';
    source.textContent = text;
    const letters = document.createElement('span');
    letters.className = 'type-letters';
    letters.setAttribute('aria-hidden', 'true');
    element.replaceChildren(source, letters);
    const promises = [];
    let delay = 0;
    characters.forEach(character => {
      const letter = document.createElement('span');
      letter.className = 'type-letter';
      letter.textContent = character;
      letters.append(letter);
      promises.push(track(letter.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1, delay, easing: 'steps(1, end)', fill: 'backwards',
      })));
      delay += /[.!?]/.test(character) ? 120 : /[,;:]/.test(character) ? 50 : 18;
    });
    await Promise.all(promises);
  };
  const revealNext = () => {
    if (stopped || introActive || revealTimer !== null) return;
    const next = targets.find(element => visible.has(element) && element.classList.contains('reveal-pending'));
    if (!next) return;
    const wait = Math.max(0, lastRevealAt + 250 - performance.now());
    if (wait > 0) {
      revealTimer = setTimeout(() => { revealTimer = null; revealNext(); }, wait);
      return;
    }
    lastRevealAt = performance.now();
    reveal(next, false, { duration: 450 });
    revealNext();
  };
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    });
    revealNext();
  }, { threshold: .08, rootMargin: '0px 0px -24px 0px' });
  targets.forEach(element => {
    if (element.getBoundingClientRect().bottom > 0) element.classList.add('reveal-pending');
  });
  const observeRemaining = () => {
    targets.forEach(element => {
      if (element.classList.contains('reveal-pending')) observer.observe(element);
    });
  };
  const showEverything = () => {
    stopped = true;
    clearTimeout(revealTimer);
    revealTimer = null;
    visible.clear();
    introActive = false;
    unlockScroll();
    hero.dataset.intro = 'complete';
    branches.classList.remove('ornament-pending');
    targets.forEach(element => reveal(element, true));
    animations.forEach(animation => animation.cancel());
    observer.disconnect();
  };
  document.addEventListener('focusin', event => {
    // El teclat pot saltar la benvinguda i accedir al contingut immediatament.
    if (introActive) showEverything();
    let element = event.target;
    while (element instanceof Element) {
      reveal(element, true);
      animations.forEach(animation => { if (animation.effect?.target === element) animation.cancel(); });
      element = element.parentElement;
    }
  });
  preference.addEventListener('change', event => { if (event.matches) showEverything(); });
  window.addEventListener('beforeprint', showEverything);
  window.addEventListener('resize', () => { if (introActive) showEverything(); });
  if (!introActive) { observeRemaining(); return; }
  const runIntroduction = async () => {
    for (const step of introduction) {
      if (stopped) return;
      hero.dataset.intro = step.phase;
      if (step.signature) await revealSignature(step.element);
      else if (step.letters) await typewrite(step.element);
      else {
        if (step.phase === 'date') drawOrnament(branches);
        await reveal(step.element, false, step);
      }
    }
    if (stopped) return;
    introActive = false;
    unlockScroll();
    hero.dataset.intro = 'complete';
    observeRemaining();
  };
  document.fonts.ready.then(() => { if (!stopped) return runIntroduction(); }).catch(showEverything);
}

// Anells sobre els noms i rametes baix de la data, dibuixats en dos moments.
function createNameOrnament(part = 'rings') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('hero-ornament', part === 'rings' ? 'name-ornament' : 'date-ornament');
  svg.setAttribute('viewBox', part === 'rings' ? '0 0 640 200' : '232 160 176 40');
  svg.setAttribute('preserveAspectRatio', part === 'rings' ? 'none' : 'xMidYMid meet');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const strokes = part === 'rings' ? [
    ['M316 11C308 3 296 7 295 18S302 37 313 34C324 31 324 18 316 11', 0, 1100],
    ['M329 10C321 4 310 11 311 23S324 38 332 30C339 23 337 14 329 10', 100, 1100],
    ['M283 23C274 25 266 23 262 22M354 22C362 25 371 24 378 22', 200, 950],
  ] : [
    // Les fulles apareixen després de la tija, com un dibuix a ploma.
    ['M236 183C264 174 285 193 319 192S372 175 404 183', 0, 650],
    ['M265 183C255 174 252 164 258 166C266 169 267 177 265 183M265 183C257 185 247 179 250 176C255 173 263 178 265 183', 150, 450],
    ['M284 189C276 181 277 171 281 173C288 177 286 184 284 189M284 189C276 193 267 190 268 187C270 182 278 185 284 189', 250, 450],
    ['M355 187C354 178 358 169 362 172C367 178 360 184 355 187M355 187C363 183 372 184 372 188C369 193 361 191 355 187', 350, 450],
    ['M375 182C375 173 381 164 385 168C388 174 381 179 375 182M375 182C383 178 392 178 393 182C390 187 381 186 375 182', 450, 450],
  ];
  for (const [d, delay, duration] of strokes) {
    const path = document.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('d', d);
    path.setAttribute('pathLength', '1');
    path.setAttribute('vector-effect', 'non-scaling-stroke');
    path.dataset.delay = delay;
    path.dataset.duration = duration;
    svg.append(path);
  }
  return svg;
}

// Sis cors reutilitzables: les animacions només viuen mentre es veu el botó.
function setupInvitationMotion(preference) {
  const invitation = document.querySelector('.rsvp-invitation');
  if (!invitation) return;
  const section = invitation.closest('#rsvp');
  let inView = !('IntersectionObserver' in window);
  const update = () => invitation.classList.toggle('is-floating',
    inView && !preference.matches && !document.hidden && !section.querySelector('dialog[open]'));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      update();
    }, { rootMargin: '32px 0px' });
    observer.observe(invitation);
  }
  new MutationObserver(update).observe(section, { attributes: true, attributeFilter: ['open'], subtree: true });
  preference.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);
  update();
}
