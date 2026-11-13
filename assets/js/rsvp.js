import { wedding } from './content.js';

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

// Només una confirmació explícita de recepció resol l’enviament. En esgotar
// el termini, s’avorta el transport i qualsevol resposta tardana s’ignora.
export function sendRepliesWithTimeout(replies, { sendReplies = simulateSendReplies, timeoutMs = 10000, signal } = {}) {
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
    const cancel = () => finish(new Error('Enviament cancel·lat'));
    const timer = setTimeout(() => finish(new Error('Temps de recepció esgotat')), timeoutMs);
    if (signal?.aborted) { cancel(); return; }
    signal?.addEventListener('abort', cancel, { once: true });
    Promise.resolve().then(() => {
      if (!settled) return sendReplies(replies, { signal: transport.signal });
    }).then(receipt => {
      if (receipt?.received === true) finish(null, receipt);
    }).catch(error => finish(error));
  });
}

export function setupRsvp(root = document, { sendReplies = simulateSendReplies, timeoutMs = 10000 } = {}) {
  const form = root.querySelector('#rsvp-form');
  if (!form) return;
  const section = root.querySelector('#rsvp') || root;
  const manager = root.querySelector('#guest-manager');
  const grid = root.querySelector('#guest-grid');
  const add = root.querySelector('#add-guest');
  const send = root.querySelector('#send-replies');
  const dialog = root.querySelector('#guest-dialog');
  const dialogTitle = root.querySelector('#guest-dialog-title');
  const saved = root.querySelector('#guest-saved');
  const summary = root.querySelector('#reply-summary');
  const loading = root.querySelector('#rsvp-loading');
  const success = root.querySelector('#rsvp-success');
  const failure = root.querySelector('#rsvp-error');
  const attendanceFields = form.querySelector('#attendance-fields');
  const busControls = [...form.querySelectorAll('[name="bus"]')];
  const dietary = form.elements.dietary;
  const status = form.querySelector('#form-status');
  const textFields = [...form.querySelectorAll('textarea.auto-grow')];
  let replies = [];
  let state = 'collecting';
  let editingIndex = null;
  let savedIndex = null;
  let attempted = false;
  let pending = null;
  let generation = 0;

  const resizeTextFields = () => {
    if (!dialog.open || form.hidden) return;
    const scrollTop = dialog.scrollTop;
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
    dialog.scrollTop = scrollTop;
  };

  const setState = value => {
    state = value;
    section.dataset.state = value;
    section.setAttribute('aria-busy', String(value === 'sending'));
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
    grid.querySelectorAll('.guest-edit').forEach(button => button.remove());
    replies.forEach((reply, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'guest-tile guest-edit';
      button.dataset.index = String(index);
      button.setAttribute('aria-label', `Editar resposta de ${reply.name}`);
      button.title = reply.name;
      const initials = document.createElement('span');
      initials.className = 'guest-initials';
      initials.textContent = [...reply.name.split(/\s+/)[0]].slice(0, 3).join('').toLocaleUpperCase('ca');
      button.append(initials);
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.setAttribute('aria-hidden', 'true');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'm15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15Z');
      icon.append(path);
      button.append(icon);
      button.addEventListener('click', () => openGuest(index));
      grid.insertBefore(button, add);
    });
    send.hidden = replies.length === 0;
    send.disabled = state !== 'collecting';
  };

  const openGuest = (index = null) => {
    if (state !== 'collecting' || dialog.open) return;
    editingIndex = index;
    savedIndex = null;
    attempted = false;
    form.reset();
    showErrors({});
    form.hidden = false;
    saved.hidden = true;
    summary.replaceChildren();
    dialogTitle.textContent = index === null ? 'Afegir invitat' : 'Editar invitat';
    if (index !== null) {
      const reply = replies[index];
      form.elements.name.value = reply.name;
      form.elements.attendance.value = reply.attendance;
      updateAttendance();
      form.elements.bus.value = reply.bus;
      dietary.value = reply.dietary;
    } else updateAttendance();
    dialog.showModal();
    resizeTextFields();
    form.elements.name.focus();
  };

  const reset = () => {
    generation++;
    pending?.abort();
    pending = null;
    setState('collecting');
    replies = [];
    editingIndex = savedIndex = null;
    attempted = false;
    dialog.close();
    loading.close();
    form.reset();
    showErrors({});
    summary.replaceChildren();
    form.hidden = false;
    saved.hidden = success.hidden = failure.hidden = true;
    manager.hidden = false;
    updateAttendance();
    renderGuests();
  };

  add.addEventListener('click', () => openGuest());
  root.querySelector('#close-guest-dialog').addEventListener('click', () => dialog.close());
  root.querySelector('#continue-replies').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    if (state !== 'collecting') return;
    const index = savedIndex ?? editingIndex;
    (index === null ? add : grid.querySelector(`[data-index="${index}"]`))?.focus();
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
    const attending = reply.attendance === 'yes';
    const bus = wedding.busOptions.find(option => option.value === reply.bus);
    const rows = [
      ['Nom', reply.name], ['Asistiràs', attending ? 'Sí' : 'No'],
      ['Bus', attending ? bus.summary : 'No'],
      ['Comentaris dieta', attending && reply.dietary ? reply.dietary : '—'],
    ];
    summary.replaceChildren(...rows.map(([label, value]) => {
      const item = document.createElement('li');
      const title = document.createElement('strong');
      title.textContent = `${label}: `;
      item.append(title, document.createTextNode(value));
      return item;
    }));
    form.hidden = true;
    saved.hidden = false;
    saved.querySelector('h4').focus();
  });

  loading.addEventListener('cancel', event => event.preventDefault());
  send.addEventListener('click', async () => {
    if (state !== 'collecting' || !replies.length || dialog.open) return;
    const current = generation;
    setState('sending');
    send.disabled = true;
    pending = new AbortController();
    loading.showModal();
    loading.querySelector('h3').focus();
    let received = false;
    try {
      await sendRepliesWithTimeout(replies.map(reply => ({ ...reply })), { sendReplies, timeoutMs, signal: pending.signal });
      received = true;
    } catch { /* L’error substituïx la graella i no permet reintents. */ }
    if (generation !== current) return;
    pending = null;
    setState(received ? 'success' : 'error');
    manager.hidden = true;
    success.hidden = !received;
    failure.hidden = received;
    loading.close();
    (received ? success.querySelector('h3') : failure).focus();
  });

  window.addEventListener('pageshow', event => {
    if (event.persisted && state === 'collecting') reset();
  });
  reset();
}
