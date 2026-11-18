const RECEIPT_TYPE = 'sarapau:rsvp:receipt';
export const RSVP_TIMEOUT_MS = 30000;

export class RsvpError extends Error {
  constructor(code, message, response) {
    super(message);
    this.name = 'RsvpError';
    this.code = code;
    if (response !== undefined) this.response = response;
  }
}

export function validateGoogleEndpoint(value) {
  let url;
  try { url = new URL(value); } catch { throw new RsvpError('CONFIGURATION_ERROR', 'Falta configurar l’URL d’Apps Script.'); }
  if (url.origin !== 'https://script.google.com' || !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname) || url.search || url.hash || url.username || url.password) {
    throw new RsvpError('CONFIGURATION_ERROR', 'L’URL ha de ser la publicació d’Apps Script acabada en /exec.');
  }
  return url.href;
}

export function isGoogleReceiptOrigin(origin) {
  try {
    const url = new URL(origin);
    return url.protocol === 'https:' && !url.port && (
      url.hostname === 'script.google.com' || url.hostname === 'script.googleusercontent.com' ||
      /^[a-z0-9-]+-script\.googleusercontent\.com$/.test(url.hostname)
    );
  } catch { return false; }
}

function belongsToFrame(source, frame) {
  try {
    for (let depth = 0; source && depth < 8; depth++) {
      if (source === frame.contentWindow) return true;
      const parent = source.parent;
      if (parent === source) break;
      source = parent;
    }
  } catch { /* Un missatge alié no confirma cap enviament. */ }
  return false;
}

// POST a un iframe amb resposta explícita de Google. No necessita CORS,
// scripts externs ni un fetch opac que poguera simular un èxit sense guardat.
export function sendToGoogleSheets(replies, { endpoint, signal, requestId = crypto.randomUUID(), timeoutMs = RSVP_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    let action;
    try { action = validateGoogleEndpoint(endpoint); } catch (error) { reject(error); return; }
    if (signal?.aborted) { reject(new RsvpError('ABORTED', 'Enviament cancel·lat')); return; }
    const guests = replies.map(reply => ({
      name: reply.name,
      attending: reply.attendance === 'yes',
      busOutbound: reply.attendance === 'yes' && reply.busOutbound,
      busReturnTime: reply.attendance === 'yes' ? reply.busReturnTime : null,
      dietary: reply.attendance === 'yes' ? reply.dietary : '',
    }));
    const frame = document.createElement('iframe');
    frame.name = `rsvp-${requestId}`;
    frame.hidden = true;
    frame.tabIndex = -1;
    frame.setAttribute('aria-hidden', 'true');
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
    frame.referrerPolicy = 'no-referrer';
    const form = document.createElement('form');
    form.hidden = true;
    form.method = 'POST';
    form.action = action;
    form.target = frame.name;
    form.acceptCharset = 'UTF-8';
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'payload';
    input.value = JSON.stringify({ version: 2, requestId, replyTo: location.origin, guests });
    form.append(input);
    let settled = false;
    const finish = (error, receipt) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      window.removeEventListener('message', receive);
      signal?.removeEventListener('abort', cancel);
      form.remove();
      frame.remove();
      if (error) reject(error); else resolve(receipt);
    };
    const cancel = () => finish(new RsvpError('ABORTED', 'Enviament cancel·lat'));
    const receive = event => {
      const data = event.data;
      if (!isGoogleReceiptOrigin(event.origin) || !belongsToFrame(event.source, frame) ||
          !data || data.type !== RECEIPT_TYPE || data.version !== 1 || data.requestId !== requestId) return;
      if (data.received === false) {
        const code = typeof data.error === 'string' && /^[A-Z_]{1,40}$/.test(data.error) ? data.error : 'GOOGLE_REJECTED';
        finish(new RsvpError(code, 'Google no ha confirmat el guardat.', data));
      }
      else if (data.received === true && data.count === guests.length) finish(null, { received: true, count: data.count, requestId });
    };
    const timer = setTimeout(() => finish(new RsvpError('TIMEOUT', 'Temps de recepció esgotat')), timeoutMs);
    window.addEventListener('message', receive);
    signal?.addEventListener('abort', cancel, { once: true });
    frame.addEventListener('error', () => finish(new RsvpError('FRAME_ERROR', 'No s’ha pogut contactar amb Google.')));
    try {
      document.body.append(frame, form);
      HTMLFormElement.prototype.submit.call(form);
    } catch (error) { finish(error); }
  });
}
