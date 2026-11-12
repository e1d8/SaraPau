export function validateReply({ name, attendance, guests }) {
  const errors = {};
  if (!name?.trim()) errors.name = 'Escriu el teu nom i cognoms.';
  if (!['yes', 'no'].includes(attendance)) errors.attendance = 'Indica si vindràs a la boda.';
  if (attendance === 'yes' && (!/^\d+$/.test(String(guests)) || !Number.isSafeInteger(Number(guests)) || Number(guests) < 1)) {
    errors.guests = 'Indica un nombre enter d’assistents, com a mínim 1.';
  }
  return errors;
}

// L’únic estat és el mateix formulari en memòria. No hi ha cap transport ni persistència.
export function setupRsvp(root = document) {
  const form = root.querySelector('#rsvp-form');
  if (!form) return;
  const attendanceFields = form.querySelector('#attendance-fields');
  const guests = form.elements.guests;
  const dietary = form.elements.dietary;
  const success = root.querySelector('#rsvp-success');
  const edit = root.querySelector('#edit-reply');
  const summary = root.querySelector('#reply-summary');
  const status = form.querySelector('#form-status');

  const clearErrors = () => {
    form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    form.querySelectorAll('[data-error]').forEach(el => { el.textContent = ''; });
    status.textContent = '';
  };

  const updateAttendance = () => {
    const attending = form.elements.attendance.value === 'yes';
    attendanceFields.hidden = !attending;
    guests.disabled = !attending;
    guests.required = attending;
    dietary.disabled = !attending;
    if (!attending) {
      guests.value = '1';
      dietary.value = '';
    }
  };

  // Restablir també els valors que algun navegador puga restaurar en recarregar.
  form.reset();
  updateAttendance();
  form.addEventListener('change', event => {
    if (event.target.name === 'attendance') {
      clearErrors();
      updateAttendance();
    }
  });
  form.addEventListener('input', event => {
    const field = event.target;
    if (field.hasAttribute('aria-invalid')) {
      field.removeAttribute('aria-invalid');
      const error = form.querySelector(`[data-error="${field.name}"]`);
      if (error) error.textContent = '';
    }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    clearErrors();
    const name = form.elements.name.value.trim();
    const attendance = form.elements.attendance.value;
    const errors = validateReply({ name, attendance, guests: guests.value });
    const entries = Object.entries(errors);
    if (entries.length) {
      for (const [field, message] of entries) {
        form.querySelector(`[data-error="${field}"]`).textContent = message;
        const control = field === 'attendance' ? form.querySelector('[name="attendance"]') : form.elements[field];
        control.setAttribute('aria-invalid', 'true');
      }
      status.textContent = 'Revisa els camps indicats abans de continuar.';
      const first = entries[0][0];
      (first === 'attendance' ? form.querySelector('[name="attendance"]') : form.elements[first]).focus();
      return;
    }
    summary.textContent = attendance === 'yes'
      ? `${name}, has indicat que vindràs. Nombre d’assistents: ${guests.value}.`
      : `${name}, has indicat que no podràs vindre.`;
    form.hidden = true;
    success.hidden = false;
    success.querySelector('h3').focus();
  });
  edit.addEventListener('click', () => {
    success.hidden = true;
    form.hidden = false;
    form.elements.name.focus();
  });

  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    form.reset();
    clearErrors();
    summary.textContent = '';
    success.hidden = true;
    form.hidden = false;
    updateAttendance();
  });
}
