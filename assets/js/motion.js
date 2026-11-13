// La benvinguda prioritza els noms, la data i el missatge. Després, cada
// element entra una sola vegada quan arriba a la pantalla, sense moure el disseny.
export function setupMotion() {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  if (preference.matches || !('IntersectionObserver' in window) || !Element.prototype.animate) return;
  const targets = [...document.querySelectorAll('.hero-copy > *, .home-hero > .art, .timeline > h2, .timeline-item, .rsvp-panel > .form-heading, .rsvp-description, .guest-grid, .celebration > .banquet-divider, .closing-message, .bank-account, .site-footer > *')];
  const hero = document.querySelector('.home-hero');
  const introduction = [
    { element: hero.querySelector('h1'), phase: 'names', duration: 850, emphasis: true },
    { element: hero.querySelector('.hero-date'), phase: 'date', duration: 500 },
    { element: hero.querySelector('.hero-opening'), phase: 'message', duration: 650 },
  ];
  const animations = new Set();
  let introActive = !location.hash && scrollY < 80;
  let stopped = false;
  const reveal = (element, instant = false, { duration = 650, emphasis = false } = {}) => {
    if (!element.classList.contains('reveal-pending')) return Promise.resolve();
    element.classList.remove('reveal-pending');
    observer.unobserve(element);
    if (instant || preference.matches) return Promise.resolve();
    const animation = element.animate([
      { opacity: 0, translate: emphasis ? '0 14px' : '0 18px', scale: emphasis ? .96 : 1 },
      { opacity: 1, translate: '0 0', scale: 1 },
    ], { duration, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
    animations.add(animation);
    return animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
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
    hero.dataset.intro = 'complete';
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
  if (!introActive) { observeRemaining(); return; }
  const runIntroduction = async () => {
    for (const step of introduction) {
      if (stopped) return;
      hero.dataset.intro = step.phase;
      await reveal(step.element, false, step);
    }
    if (stopped) return;
    introActive = false;
    hero.dataset.intro = 'complete';
    observeRemaining();
  };
  document.fonts.ready.then(() => { if (!stopped) runIntroduction(); });
}
