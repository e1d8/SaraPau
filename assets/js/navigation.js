// S'executa al capçal, abans que el navegador restaure la posició de lectura.
history.scrollRestoration = 'manual';
const reloading = performance.getEntriesByType('navigation')[0]?.type === 'reload';
if (reloading && location.hash) {
  history.replaceState(history.state, '', location.pathname + location.search);
}
const startAtTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
startAtTop();
if (reloading) window.addEventListener('pageshow', startAtTop, { once: true });
