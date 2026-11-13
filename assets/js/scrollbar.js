// La barra es superposa al contingut: el dibuix continua per davall fins al
// límit de la pantalla. El desplaçament de roda, teclat i tàctil continua natiu.
export function setupPageScrollbar() {
  const root = document.documentElement;
  const rail = document.createElement('div');
  rail.className = 'page-scrollbar';
  rail.setAttribute('aria-hidden', 'true');
  const thumb = document.createElement('div');
  thumb.className = 'page-scrollbar-thumb';
  rail.append(thumb);
  document.body.append(rail);
  root.classList.add('has-page-scrollbar');
  let frame = 0;
  let drag = null;

  const metrics = () => {
    const height = window.innerHeight;
    const range = Math.max(0, root.scrollHeight - height);
    const size = Math.min(height, Math.max(32, height * height / root.scrollHeight));
    return { range, size, travel: height - size };
  };
  const render = () => {
    frame = 0;
    const { range, size, travel } = metrics();
    rail.hidden = range <= 0;
    thumb.style.height = `${size}px`;
    thumb.style.top = `${range ? Math.min(travel, Math.max(0, window.scrollY / range * travel)) : 0}px`;
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(render); };
  thumb.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault();
    drag = { pointer: event.pointerId, y: event.clientY, scroll: window.scrollY };
    thumb.setPointerCapture(event.pointerId);
    root.classList.add('is-scrollbar-dragging');
  });
  thumb.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointer) return;
    const { range, travel } = metrics();
    window.scrollTo({ top: drag.scroll + (event.clientY - drag.y) * range / Math.max(1, travel), behavior: 'instant' });
  });
  const endDrag = () => {
    drag = null;
    root.classList.remove('is-scrollbar-dragging');
  };
  thumb.addEventListener('pointerup', endDrag);
  thumb.addEventListener('pointercancel', endDrag);
  thumb.addEventListener('lostpointercapture', endDrag);
  rail.addEventListener('pointerdown', event => {
    if (event.target !== rail || event.button !== 0) return;
    event.preventDefault();
    const { range, size, travel } = metrics();
    window.scrollTo({ top: (event.clientY - size / 2) / Math.max(1, travel) * range, behavior: 'auto' });
  });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  new ResizeObserver(schedule).observe(document.body);
  document.fonts.ready.then(schedule);
  render();
}
