// La benvinguda prioritza els noms, la data i el missatge. Després, cada
// element entra una sola vegada quan arriba a la pantalla, sense moure el disseny.
export function setupMotion() {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  if (preference.matches || !('IntersectionObserver' in window) || !Element.prototype.animate) return;
  const targets = [...document.querySelectorAll('.hero-copy > *, .home-hero > .art, .timeline > h2, .timeline-item, .rsvp-panel > .form-heading, .rsvp-description, .guest-grid, .celebration > .banquet-divider, .closing-message, .bank-account, .site-footer > *')];
  const hero = document.querySelector('.home-hero');
  const introduction = [
    { element: hero.querySelector('h1'), phase: 'names', signature: true },
    { element: hero.querySelector('.hero-date'), phase: 'date', duration: 500 },
    { element: hero.querySelector('.hero-opening'), phase: 'message', letters: 'typewriter' },
  ];
  const animations = new Set();
  const restorations = new Set();
  const track = animation => {
    animations.add(animation);
    return animation.finished.then(() => {}, () => {}).finally(() => animations.delete(animation));
  };
  let introActive = !location.hash && scrollY < 80;
  let stopped = false;
  const unlockScroll = () => document.documentElement.classList.remove('intro-locked');
  if (introActive) document.documentElement.classList.add('intro-locked');
  const reveal = (element, instant = false, { duration = 650, emphasis = false } = {}) => {
    if (!element.classList.contains('reveal-pending')) return Promise.resolve();
    element.classList.remove('reveal-pending');
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
    element.replaceChildren(source, stage);
    element.classList.add('name-animating');
    let restored = false;
    const restore = () => {
      if (restored) return;
      restored = true;
      element.replaceChildren(document.createTextNode(text));
      element.classList.remove('name-animating');
      restorations.delete(restore);
    };
    restorations.add(restore);
    const promises = [];
    let lastAnimation;
    let offset = 0;
    let delay = 0;
    try {
      const box = element.getBoundingClientRect();
      const ink = source.getBoundingClientRect();
      const style = getComputedStyle(element);
      const bleed = parseFloat(style.fontSize);
      const lineHeight = parseFloat(style.lineHeight);
      const stageWidth = box.width + 2 * bleed;
      const left = ink.left - box.left + bleed - bleed * .15;
      const right = ink.right - box.left + bleed + bleed * .15;
      const start = (1.4 * stageWidth - left) / (1.5 * stageWidth) * 100;
      const end = (1.1 * stageWidth - right) / (1.5 * stageWidth) * 100;
      const curtainDuration = characters.reduce((total, character) => total + (/\s/.test(character) ? 45 : 80), 0) + 220;
      promises.push(track(stage.animate([
        { maskPosition: `${start}% 0` }, { maskPosition: `${end}% 0` },
      ], { duration: curtainDuration, easing: 'linear', fill: 'backwards' })));
      const range = document.createRange();
      characters.forEach(character => {
        range.setStart(source.firstChild, offset);
        range.setEnd(source.firstChild, offset + character.length);
        const bounds = range.getBoundingClientRect();
        const letter = document.createElement('span');
        letter.className = 'name-letter';
        const glyph = document.createElement('span');
        glyph.className = 'name-glyph';
        glyph.textContent = character;
        letter.append(glyph);
        stage.append(letter);
        // La màscara i cada lletra tenen un em extra per costat. Els dos
        // marges es compensen: el text conserva la posició i l'espaiat originals.
        letter.style.left = `${bounds.left - box.left}px`;
        letter.style.width = `${bounds.width}px`;
        letter.style.transformOrigin = `${bleed + bounds.width / 2}px ${bleed + lineHeight * .65}px`;
        lastAnimation = letter.animate([
          { opacity: 0, transform: 'translateY(12px) scale(.55)', offset: 0 },
          { opacity: 1, transform: 'translateY(-3px) scale(1.07)', offset: .6 },
          { opacity: 1, transform: 'translateY(1px) scale(.985)', offset: .82 },
          { opacity: 1, transform: 'translateY(0) scale(1)', offset: 1 },
        ], { duration: 520, delay, easing: 'cubic-bezier(.22,.7,.3,1)', fill: 'backwards' });
        promises.push(track(lastAnimation));
        delay += /\s/.test(character) ? 45 : 80;
        offset += character.length;
      });
      Promise.all(promises).then(restore, restore);
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
    } catch (error) { restore(); throw error; }
  };
  const typewrite = async element => {
    element.classList.remove('reveal-pending');
    const text = element.textContent;
    const characters = typeof Intl.Segmenter === 'function'
      ? [...new Intl.Segmenter('ca', { granularity: 'grapheme' }).segment(text)].map(part => part.segment)
      : [...text];
    const source = document.createElement('span');
    source.className = 'sr-only';
    source.textContent = text;
    const letters = document.createElement('span');
    letters.className = 'type-letters';
    letters.setAttribute('aria-hidden', 'true');
    element.replaceChildren(source, letters);
    let restored = false;
    const restore = () => {
      if (restored) return;
      restored = true;
      element.replaceChildren(document.createTextNode(text));
      restorations.delete(restore);
    };
    restorations.add(restore);
    const promises = [];
    let delay = 0;
    try {
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
    } finally { restore(); }
  };
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) reveal(entry.target); });
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
    introActive = false;
    unlockScroll();
    hero.dataset.intro = 'complete';
    targets.forEach(element => reveal(element, true));
    animations.forEach(animation => animation.cancel());
    [...restorations].forEach(restore => restore());
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
      else await reveal(step.element, false, step);
    }
    if (stopped) return;
    introActive = false;
    unlockScroll();
    hero.dataset.intro = 'complete';
    observeRemaining();
  };
  document.fonts.ready.then(() => { if (!stopped) return runIntroduction(); }).catch(showEverything);
}
