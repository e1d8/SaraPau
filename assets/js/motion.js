// La benvinguda prioritza els noms, la data i el missatge. Després, cada
// element entra una sola vegada quan arriba a la pantalla, sense moure el disseny.
export function setupMotion() {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  if (preference.matches || !('IntersectionObserver' in window) || !Element.prototype.animate) return;
  const targets = [...document.querySelectorAll('.hero-copy > *, .home-hero > .art, .timeline > h2, .timeline-item, .rsvp-panel > .form-heading, .rsvp-description, .guest-grid, .celebration > .banquet-divider, .closing-message, .bank-account, .site-footer > *')];
  const hero = document.querySelector('.home-hero');
  const introduction = [
    { element: hero.querySelector('h1'), phase: 'names', letters: 'name' },
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
  const revealLetters = async (element, kind) => {
    element.classList.remove('reveal-pending');
    const text = element.textContent;
    const characters = typeof Intl.Segmenter === 'function'
      ? [...new Intl.Segmenter('ca', { granularity: 'grapheme' }).segment(text)].map(part => part.segment)
      : [...text];
    const source = document.createElement('span');
    source.className = kind === 'name' ? 'name-source' : 'sr-only';
    source.textContent = text;
    const letters = document.createElement('span');
    letters.className = kind === 'name' ? 'name-letters' : 'type-letters';
    letters.setAttribute('aria-hidden', 'true');
    element.replaceChildren(source, letters);
    element.classList.toggle('name-animating', kind === 'name');
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
    let delay = 0;
    let offset = 0;
    const box = element.getBoundingClientRect();
    const range = document.createRange();
    let lastNameAnimation;
    let settling = false;
    try {
      if (kind === 'name') {
        const duration = characters.reduce((total, character) => total + (/\s/.test(character) ? 45 : 80), 0) + 220;
        const ink = source.getBoundingClientRect();
        const padding = parseFloat(getComputedStyle(element).fontSize) * .15;
        const left = Math.max(0, ink.left - box.left - padding);
        const right = Math.min(box.width, ink.right - box.left + padding);
        // La cortina recorre els noms, en lloc de gastar el recorregut en els
        // marges buits del títol. La vora és suau i no dividix les lletres.
        const start = (1.4 * box.width - left) / (1.5 * box.width) * 100;
        const end = (1.1 * box.width - right) / (1.5 * box.width) * 100;
        promises.push(track(letters.animate([
          { maskPosition: `${start}% 0` }, { maskPosition: `${end}% 0` },
        ], { duration, easing: 'linear', fill: 'backwards' })));
      }
      characters.forEach(character => {
        const letter = document.createElement('span');
        letter.className = kind === 'name' ? 'name-letter' : 'type-letter';
        letter.textContent = character;
        letters.append(letter);
        if (kind === 'name') {
          // La posició prové del text cal·ligràfic complet, però cada capa
          // dibuixa una lletra sencera. Els ornaments poden sobrepassar la
          // seua amplària sense quedar tallats per cap màscara rectangular.
          range.setStart(source.firstChild, offset);
          range.setEnd(source.firstChild, offset + character.length);
          const bounds = range.getBoundingClientRect();
          letter.style.left = `${bounds.left - box.left}px`;
          lastNameAnimation = letter.animate([
            { opacity: 0, transform: 'translateY(12px) scale(.55)', offset: 0 },
            { opacity: 1, transform: 'translateY(-3px) scale(1.07)', offset: .6 },
            { opacity: 1, transform: 'translateY(1px) scale(.985)', offset: .82 },
            { opacity: 1, transform: 'translateY(0) scale(1)', offset: 1 },
          ], { duration: 520, delay, easing: 'cubic-bezier(.22,.7,.3,1)', fill: 'backwards' });
          promises.push(track(lastNameAnimation));
          delay += /\s/.test(character) ? 45 : 80;
        } else {
          promises.push(track(letter.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: 1, delay, easing: 'steps(1, end)', fill: 'backwards',
          })));
          delay += /[.!?]/.test(character) ? 120 : /[,;:]/.test(character) ? 50 : 18;
        }
        offset += character.length;
      });
      if (lastNameAnimation) {
        // La data entra durant l'últim assentament del rebot, sense cap pausa.
        Promise.all(promises).then(restore, restore);
        settling = true;
        const timing = lastNameAnimation.effect.getTiming();
        const handoff = timing.delay + timing.duration * .78;
        await new Promise(resolve => {
          const check = () => {
            if (stopped || lastNameAnimation.playState === 'finished' || lastNameAnimation.currentTime >= handoff) resolve();
            else requestAnimationFrame(check);
          };
          check();
        });
      } else await Promise.all(promises);
    } finally { if (!settling) restore(); }
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
      if (step.letters) await revealLetters(step.element, step.letters);
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
