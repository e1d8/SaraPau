import { icon as iconMarkup } from './icons.js';
import { wedding } from './content.js';
import { rsvpConfig } from './rsvp-config.js';
import { sendToGoogleSheets, RSVP_TIMEOUT_MS, RsvpError } from './google-sheets.js';

export function validateReply({ name, attendance, bus }) {
  const errors = {};
  if (!name?.trim()) errors.name = true;
  if (!['yes', 'no'].includes(attendance)) errors.attendance = true;
  if (attendance === 'yes' && !wedding.busOptions.some(option => option.value === bus)) errors.bus = true;
  return errors;
}

// Simulació local. No transmet ni persistix les respostes.
export function simulateSendReplies(replies, { signal } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new Error('Enviament cancel·lat')); return; }
    const cancel = () => {
      clearTimeout(timer);
      reject(new Error('Enviament cancel·lat'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', cancel);
      resolve({ received: true });
    }, 1000);
    signal?.addEventListener('abort', cancel, { once: true });
  });
}

export function sendConfiguredReplies(replies, options = {}) {
  if (rsvpConfig.mode === 'demo') return simulateSendReplies(replies, options);
  if (rsvpConfig.mode !== 'google') throw new Error('Mode d’RSVP desconegut.');
  return sendToGoogleSheets(replies, { ...options, endpoint: rsvpConfig.endpoint });
}

// Només una confirmació explícita de recepció resol l’enviament. En esgotar
// el termini, s’avorta el transport i qualsevol resposta tardana s’ignora.
export function sendRepliesWithTimeout(replies, { sendReplies = sendConfiguredReplies, timeoutMs = RSVP_TIMEOUT_MS, signal, requestId } = {}) {
  return new Promise((resolve, reject) => {
    const transport = new AbortController();
    let settled = false;
    const finish = (error, receipt) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      if (error) { transport.abort(); reject(error); }
      else resolve(receipt);
    };
    const cancel = () => finish(new RsvpError('ABORTED', 'Enviament cancel·lat'));
    const timer = setTimeout(() => finish(new RsvpError('TIMEOUT', 'Temps de recepció esgotat')), timeoutMs);
    if (signal?.aborted) { cancel(); return; }
    signal?.addEventListener('abort', cancel, { once: true });
    Promise.resolve().then(() => {
      if (!settled) return sendReplies(replies, { signal: transport.signal, timeoutMs, requestId });
    }).then(receipt => {
      if (receipt?.received === true) finish(null, receipt);
    }).catch(error => finish(error));
  });
}

export function setupRsvp(root = document, { sendReplies = sendConfiguredReplies, timeoutMs = RSVP_TIMEOUT_MS } = {}) {
  const form = root.querySelector('#rsvp-form');
  if (!form) return;
  const section = root.querySelector('#rsvp') || root;
  const trigger = root.querySelector('#open-rsvp');
  const invitation = root.querySelector('.rsvp-invitation');
  const manager = root.querySelector('#guest-manager');
  const managerTitle = root.querySelector('#manager-title');
  const description = root.querySelector('#rsvp-description');
  const grid = root.querySelector('#guest-grid');
  const add = root.querySelector('#add-guest');
  const send = root.querySelector('#send-replies');
  const confirmSend = root.querySelector('#confirm-send');
  const review = root.querySelector('#rsvp-review');
  const summary = root.querySelector('#reply-summary');
  const reviewScroll = root.querySelector('#review-scroll');
  const reviewTitle = root.querySelector('#review-title');
  const guestFields = root.querySelector('#guest-fields');
  const dialog = root.querySelector('#guest-dialog');
  const dialogTitle = root.querySelector('#guest-dialog-title');
  const header = root.querySelector('#guest-dialog-header');
  const saved = root.querySelector('#guest-saved');
  const deletion = root.querySelector('#delete-guest');
  const deletionTitle = root.querySelector('#delete-guest-title');
  const deletionName = root.querySelector('#delete-guest-name');
  const submit = root.querySelector('#save-guest');
  const loading = root.querySelector('#rsvp-loading');
  const success = root.querySelector('#rsvp-success');
  const failure = root.querySelector('#rsvp-error-view');
  const errorTitle = root.querySelector('#rsvp-error-title');
  const errorToggle = root.querySelector('#toggle-error-details');
  const errorDetails = root.querySelector('#error-details');
  const errorCode = root.querySelector('#error-code');
  const errorMessage = root.querySelector('#error-message');
  const errorTime = root.querySelector('#error-time');
  const attendanceFields = form.querySelector('#attendance-fields');
  const busControls = [...form.querySelectorAll('[name="bus"]')];
  const dietary = form.elements.dietary;
  const status = form.querySelector('#form-status');
  const textFields = [...form.querySelectorAll('textarea.auto-grow')];
  let replies = [];
  let state = 'collecting';
  let view = 'manager';
  let editingIndex = null;
  let deletingIndex = null;
  let savedIndex = null;
  let attempted = false;
  let pending = null;
  let generation = 0;
  let diagnostic = null;
  let attempt = null;

  const setErrorExpanded = expanded => {
    errorDetails.hidden = !expanded;
    errorToggle.setAttribute('aria-expanded', String(expanded));
    errorToggle.querySelector('.link-text').textContent = expanded ? 'Ocultar error' : 'Mostrar error';
  };
  const describeError = error => {
    const known = error instanceof RsvpError && /^[A-Z_]{1,40}$/.test(error.code);
    let technical;
    if (error instanceof RsvpError && error.response !== undefined) technical = JSON.stringify(error.response, null, 2);
    else if (typeof error?.stack === 'string') technical = error.stack;
    else if (typeof error === 'string') technical = error;
    else {
      try { technical = JSON.stringify(error, null, 2) ?? String(error); }
      catch { technical = String(error); }
    }
    diagnostic = {
      code: known ? error.code : 'SEND_FAILED',
      technical,
      occurredAt: new Date(),
    };
    errorCode.textContent = diagnostic.code;
    errorMessage.textContent = diagnostic.technical;
    errorTime.dateTime = diagnostic.occurredAt.toISOString();
    errorTime.textContent = new Intl.DateTimeFormat('ca-ES', {
      dateStyle: 'short', timeStyle: 'medium', timeZone: 'Europe/Madrid',
    }).format(diagnostic.occurredAt);
    setErrorExpanded(false);
  };

  const resizeTextFields = () => {
    if (!dialog.open || form.hidden) return;
    const scrollTop = guestFields.scrollTop;
    textFields.forEach(field => {
      if (!field.getClientRects().length) return;
      field.classList.remove('is-scrollable');
      field.rows = 1;
      const style = getComputedStyle(field);
      const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      const lines = Math.max(1, Math.ceil((field.scrollHeight - padding - 1) / parseFloat(style.lineHeight)));
      field.rows = Math.min(4, lines);
      field.classList.toggle('is-scrollable', lines > 4);
    });
    guestFields.scrollTop = scrollTop;
  };

  const setState = value => {
    state = value;
    invitation.hidden = value === 'success';
    success.hidden = value !== 'success';
    section.dataset.state = value;
    section.setAttribute('aria-busy', String(value === 'sending'));
    if (value !== 'error') delete section.dataset.error;
  };
  const focusView = () => {
    if (!dialog.open || state === 'sending') return;
    const target = view === 'guest' ? form.elements.name : view === 'another' ? saved.querySelector('h4') :
      view === 'review' ? root.querySelector('#review-title') : view === 'success' ? root.querySelector('#rsvp-success-title') :
      view === 'error' ? errorTitle : view === 'delete' ? deletionTitle : root.querySelector('#rsvp-description');
    target.focus({ preventScroll: true });
    resizeTextFields();
  };
  const showView = (value, focus = true) => {
    view = value;
    dialog.dataset.view = value;
    manager.hidden = value !== 'manager';
    form.hidden = value !== 'guest';
    saved.hidden = value !== 'another';
    deletion.hidden = value !== 'delete';
    deletionTitle.hidden = value !== 'delete';
    review.hidden = value !== 'review';
    failure.hidden = value !== 'error';
    header.hidden = value === 'another';
    managerTitle.hidden = value !== 'manager';
    description.hidden = value !== 'manager';
    reviewTitle.hidden = value !== 'review';
    dialogTitle.hidden = value !== 'guest';
    errorTitle.hidden = value !== 'error';
    dialog.setAttribute('aria-labelledby', {
      manager: 'manager-title', delete: 'delete-guest-title', guest: 'guest-dialog-title', another: 'another-guest-title', review: 'review-title',
      success: 'rsvp-success-title', error: 'rsvp-error-title',
    }[value]);
    if (value === 'manager') dialog.setAttribute('aria-describedby', 'rsvp-description');
    else if (value === 'delete') dialog.setAttribute('aria-describedby', 'delete-guest-name');
    else dialog.removeAttribute('aria-describedby');
    dialog.scrollTop = 0;
    if (value === 'guest') guestFields.scrollTop = 0;
    if (focus) focusView();
  };
  const readReply = () => ({
    name: form.elements.name.value.trim(),
    attendance: form.elements.attendance.value,
    bus: form.elements.bus.value,
    dietary: dietary.value.trim(),
  });
  const showErrors = errors => {
    form.querySelectorAll('[aria-invalid]').forEach(control => control.removeAttribute('aria-invalid'));
    for (const field of Object.keys(errors)) {
      form.querySelectorAll(`[name="${field}"]`).forEach(control => control.setAttribute('aria-invalid', 'true'));
    }
    const invalid = Object.keys(errors).length > 0;
    status.textContent = invalid ? 'Els camps amb * són obligatoris.' : '';
    status.hidden = !invalid;
  };
  const updateAttendance = () => {
    const attending = form.elements.attendance.value === 'yes';
    attendanceFields.hidden = !attending;
    busControls.forEach(control => {
      control.disabled = !attending;
      control.required = attending;
      if (!attending) control.checked = false;
    });
    dietary.disabled = !attending;
    if (!attending) dietary.value = '';
    resizeTextFields();
  };

  const renderGuests = () => {
    grid.querySelectorAll('.guest-card').forEach(card => card.remove());
    replies.forEach((reply, index) => {
      const card = document.createElement('div');
      card.className = 'guest-card';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'guest-edit';
      button.dataset.index = String(index);
      button.setAttribute('aria-label', `Editar resposta de ${reply.name}`);
      button.title = reply.name;
      const name = document.createElement('button');
      name.type = 'button';
      name.setAttribute('aria-label', `Editar resposta de ${reply.name}`);
      name.addEventListener('click', () => openGuest(index));
      name.className = 'guest-name-label';
      name.textContent = reply.name;
      name.title = reply.name;
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.setAttribute('aria-hidden', 'true');
      icon.setAttribute('focusable', 'false');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M5.2 14.8c3.6-4 7.3-8.2 11-11.8 1.1-.9 2.1-.7 3 .1l1.3 1.3c.9.9.8 2-.1 2.9-3.8 3.7-7.6 7.6-11.7 11.1-1.5.5-3.1 1.1-4.7 1.2.3-1.6.8-3.3 1.2-4.8ZM14.8 4.5c.8 1.5 2.3 3 3.9 3.8M5.2 14.8c1.4.4 2.7 1.9 3.5 3.6');
      const tip = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      tip.setAttribute('class', 'pencil-tip');
      tip.setAttribute('d', 'm4.8 16.8-.8 2.8 2.8-.7c-.3-.9-1.1-1.7-2-2.1Z');
      icon.append(path, tip);
      button.append(icon);
      button.addEventListener('click', () => openGuest(index));
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'guest-delete';
      remove.setAttribute('aria-label', `Borrar invitat ${reply.name}`);
      remove.title = `Borrar ${reply.name}`;
      remove.innerHTML = iconMarkup('trash');
      remove.addEventListener('click', () => {
        if (state !== 'collecting' || view !== 'manager') return;
        deletingIndex = index;
        deletionName.textContent = reply.name;
        showView('delete');
      });
      card.append(name, button, remove);
      grid.insertBefore(card, add);
    });
    send.disabled = replies.length === 0 || state !== 'collecting';
    confirmSend.disabled = send.disabled;
  };

  const renderSummary = () => {
    summary.replaceChildren(...replies.map((reply, index) => {
      const item = document.createElement('li');
      const heading = document.createElement('h4');
      heading.textContent = `Invitat ${index + 1}`;
      const details = document.createElement('dl');
      const attending = reply.attendance === 'yes';
      const bus = wedding.busOptions.find(option => option.value === reply.bus);
      const rows = [
        ['Nom', reply.name], ['Asistiràs', attending ? 'Sí' : 'No'],
        ['Bus', attending ? bus.summary : 'No'],
        ['Comentaris dieta', attending && reply.dietary ? reply.dietary : '—'],
      ];
      rows.forEach(([label, value]) => {
        const row = document.createElement('div');
        const term = document.createElement('dt');
        const description = document.createElement('dd');
        term.textContent = `${label}: `;
        description.textContent = value;
        row.append(term, description);
        details.append(row);
      });
      item.append(heading, details);
      return item;
    }));
    reviewScroll.scrollTop = 0;
  };

  const openGuest = (index = null) => {
    if (state !== 'collecting' || !dialog.open) return;
    editingIndex = index;
    savedIndex = null;
    attempted = false;
    form.reset();
    showErrors({});
    dialogTitle.textContent = `Invitat ${(index ?? replies.length) + 1}`;
    if (index === null) submit.innerHTML = iconMarkup('arrow');
    else submit.textContent = 'Guardar modificacions';
    submit.setAttribute('aria-label', index === null ? 'Guardar resposta' : 'Guardar modificacions');
    if (index !== null) {
      const reply = replies[index];
      form.elements.name.value = reply.name;
      form.elements.attendance.value = reply.attendance;
      updateAttendance();
      form.elements.bus.value = reply.bus;
      dietary.value = reply.dietary;
    } else updateAttendance();
    showView('guest');
  };
  const showManager = () => {
    showView('manager');
    const button = savedIndex === null ? add : grid.querySelector(`[data-index="${savedIndex}"]`);
    button?.focus({ preventScroll: true });
  };
  const requestClose = () => {
    if (state === 'sending' || view === 'another') return;
    if (view === 'guest') {
      savedIndex = editingIndex;
      editingIndex = null;
      attempted = false;
      form.reset();
      showErrors({});
      updateAttendance();
      showManager();
    } else if (view === 'review' || view === 'delete') {
      if (view === 'delete') savedIndex = deletingIndex;
      deletingIndex = null;
      showManager();
    }
    else dialog.close();
  };

  const reset = () => {
    generation++;
    pending?.abort();
    pending = null;
    setState('collecting');
    replies = [];
    editingIndex = savedIndex = deletingIndex = null;
    attempted = false;
    dialog.close();
    loading.close();
    form.reset();
    summary.replaceChildren();
    diagnostic = null;
    attempt = null;
    errorCode.textContent = errorMessage.textContent = errorTime.textContent = '';
    errorTime.removeAttribute('datetime');
    setErrorExpanded(false);
    showErrors({});
    showView('manager', false);
    updateAttendance();
    renderGuests();
  };

  trigger.addEventListener('click', () => {
    if (state === 'sending' || state === 'success' || dialog.open) return;
    if (state === 'error') {
      setState('collecting');
      renderGuests();
      showView('manager', false);
    }
    dialog.showModal();
    focusView();
  });
  add.addEventListener('click', () => openGuest());
  root.querySelector('#close-guest-dialog').addEventListener('click', requestClose);
  root.querySelector('#continue-replies').addEventListener('click', showManager);
  root.querySelector('#cancel-delete-guest').addEventListener('click', () => {
    savedIndex = deletingIndex;
    deletingIndex = null;
    showManager();
  });
  root.querySelector('#confirm-delete-guest').addEventListener('click', () => {
    if (state !== 'collecting' || view !== 'delete' || deletingIndex === null) return;
    const index = deletingIndex;
    replies.splice(index, 1);
    deletingIndex = null;
    savedIndex = replies.length ? Math.min(index, replies.length - 1) : null;
    renderGuests();
    showManager();
  });
  root.querySelector('#another-guest').addEventListener('click', () => openGuest());
  dialog.addEventListener('cancel', event => {
    if (view === 'another' || state === 'sending') event.preventDefault();
    else if (view === 'guest' || view === 'review' || view === 'delete') { event.preventDefault(); requestClose(); }
  });
  dialog.addEventListener('close', () => {
    if (state !== 'success') trigger.focus({ preventScroll: true });
  });
  errorToggle.addEventListener('click', () => {
    if (state === 'error' && diagnostic) setErrorExpanded(errorDetails.hidden);
  });
  root.querySelector('#download-error').addEventListener('click', () => {
    if (state !== 'error' || !diagnostic || errorDetails.hidden) return;
    // Conservar l'error rebut, sense afegir-hi el formulari ni la configuració.
    const report = [
      'Sara i Pau — Diagnòstic d’enviament', '',
      `Codi: ${diagnostic.code}`, `Error tècnic:\n${diagnostic.technical}`,
      `Data i hora (Europe/Madrid): ${errorTime.textContent}`,
      `Data i hora (UTC): ${diagnostic.occurredAt.toISOString()}`, '',
    ].join('\n');
    const iso = diagnostic.occurredAt.toISOString();
    const url = URL.createObjectURL(new Blob([report], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `sarapau-error-${iso.slice(0, 10)}-${iso.slice(11, 19).replaceAll(':', '')}.txt`;
    link.hidden = true;
    try {
      document.body.append(link);
      link.click();
    } finally {
      link.remove();
      // Deixar que el navegador inicie la descàrrega abans d'alliberar el Blob.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  });
  form.addEventListener('change', event => {
    if (event.target.name === 'attendance') updateAttendance();
    if (attempted) showErrors(validateReply(readReply()));
  });
  form.addEventListener('input', () => {
    resizeTextFields();
    if (attempted) showErrors(validateReply(readReply()));
  });
  window.addEventListener('resize', resizeTextFields);
  document.fonts.ready.then(resizeTextFields);
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state !== 'collecting' || !dialog.open || form.hidden) return;
    attempted = true;
    const reply = readReply();
    const errors = validateReply(reply);
    showErrors(errors);
    const first = Object.keys(errors)[0];
    if (first) { form.querySelector(`[name="${first}"]`).focus(); return; }
    savedIndex = editingIndex ?? replies.length;
    replies[savedIndex] = reply;
    renderGuests();
    if (editingIndex === null) showView('another');
    else showManager();
  });

  loading.addEventListener('cancel', event => event.preventDefault());
  send.addEventListener('click', () => {
    if (state !== 'collecting' || !replies.length || !dialog.open || view !== 'manager') return;
    renderSummary();
    showView('review');
  });
  confirmSend.addEventListener('click', async () => {
    if (state !== 'collecting' || !replies.length || !dialog.open || view !== 'review') return;
    const current = generation;
    const payload = JSON.stringify(replies);
    if (!attempt || attempt.payload !== payload) attempt = { payload, requestId: crypto.randomUUID() };
    setState('sending');
    send.disabled = true;
    confirmSend.disabled = true;
    pending = new AbortController();
    loading.showModal();
    loading.querySelector('h3').focus();
    let received = false;
    let sendError;
    try {
      await sendRepliesWithTimeout(replies.map(reply => ({ ...reply })), { sendReplies, timeoutMs, signal: pending.signal, requestId: attempt.requestId });
      received = true;
    } catch (error) {
      sendError = error;
    }
    if (generation !== current) return;
    pending = null;
    setState(received ? 'success' : 'error');
    if (!received) {
      describeError(sendError);
      section.dataset.error = diagnostic.code;
      console.warn('RSVP: enviament no confirmat.', { code: diagnostic.code }, sendError);
    }
    showView(received ? 'success' : 'error', false);
    loading.close();
    if (received) {
      dialog.close();
      root.querySelector('#rsvp-success-title').focus({ preventScroll: true });
    } else focusView();
  });

  window.addEventListener('pageshow', event => {
    if (event.persisted && state === 'collecting') reset();
  });
  reset();
}
