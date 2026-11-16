const RSVP = Object.freeze({
  allowedOrigins: ['https://e1d8.github.io'],
  guestsSheet: 'Invitats',
  summarySheet: 'Recompte',
  maxGuests: 50,
  lockWaitMs: 3000,
});
const HEADERS = ['Nom', 'Asistirà', 'Bus', 'Menu especial', 'Timestamp'];
const BUS = Object.freeze({
  none: 'No',
  outbound: 'Anada',
  'return-midnight': 'Anada+Tornada(00:00)',
  'return-two': 'Anada+Tornada(02:00)',
});

// Executa esta funció una vegada des del projecte vinculat al Google Sheet.
// Es pot repetir: conserva les respostes existents i actualitza els formats.
function setupSpreadsheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Obri Apps Script des d’Extensions del Google Sheet.');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const properties = PropertiesService.getScriptProperties();
    const currentId = properties.getProperty('SPREADSHEET_ID');
    if (currentId && currentId !== spreadsheet.getId()) throw new Error('Este projecte ja està vinculat a un altre full.');
    let guests = spreadsheet.getSheetByName(RSVP.guestsSheet);
    if (!guests) {
      const first = spreadsheet.getSheets()[0];
      guests = first.getLastRow() === 0 ? first.setName(RSVP.guestsSheet) : spreadsheet.insertSheet(RSVP.guestsSheet, 0);
    }
    if (guests.getLastRow() === 0) guests.getRange(1, 1, 1, 5).setValues([HEADERS]);
    checkHeaders_(guests);
    spreadsheet.setSpreadsheetTimeZone('Europe/Madrid');
    guests.setFrozenRows(1);
    guests.setTabColor('#636B2F');
    guests.getRange(1, 1, 1, 5).setBackground('#636B2F').setFontColor('#ffffff').setFontWeight('bold');
    [240, 105, 240, 360, 180].forEach((width, index) => guests.setColumnWidth(index + 1, width));
    ensureRows_(guests, 2);
    formatGuests_(guests, 2, guests.getMaxRows() - 1);
    const summary = spreadsheet.getSheetByName(RSVP.summarySheet) || spreadsheet.insertSheet(RSVP.summarySheet, 1);
    summary.getRange(1, 1, 5, 2).setValues([
      ['Recompte', 'Persones'], ['Assistents a la boda', ''], ['Bus d’anada', ''],
      ['Bus de tornada (00:00)', ''], ['Bus de tornada (02:00)', ''],
    ]);
    summary.getRange(2, 2, 4, 1).setFormulas(summaryFormulas_().map(formula => [formula]));
    summary.getRange(1, 1, 1, 2).setBackground('#636B2F').setFontColor('#ffffff').setFontWeight('bold');
    summary.getRange(2, 2, 4, 1).setNumberFormat('0');
    summary.setColumnWidth(1, 290);
    summary.setColumnWidth(2, 110);
    summary.setFrozenRows(1);
    summary.setTabColor('#BAC095');
    properties.setProperty('SPREADSHEET_ID', spreadsheet.getId());
    SpreadsheetApp.flush();
    return 'Configuració completada: Invitats i Recompte.';
  } finally { lock.releaseLock(); }
}

function summaryFormulas_() {
  // Un sol argument evita els conflictes de comes/punts i coma entre regions.
  const attending = '(Invitats!B2:B=TRUE)';
  const busIs = label => '(Invitats!C2:C="' + label + '")';
  const sum = expression => '=SUMPRODUCT(' + expression + ')';
  return [
    sum(attending + '*1'),
    sum(attending + '*(' + [BUS.outbound, BUS['return-midnight'], BUS['return-two']].map(busIs).join('+') + ')'),
    sum(attending + '*' + busIs(BUS['return-midnight'])),
    sum(attending + '*' + busIs(BUS['return-two'])),
  ];
}

function doGet() {
  return HtmlService.createHtmlOutput('<p>Servei RSVP de Sara i Pau actiu. Protocol 1.</p>');
}

// Diagnòstic manual des de l'editor: llig configuració i capçaleres,
// sense afegir invitats ni mostrar-ne dades.
function diagnoseSetup() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) fail_('NOT_CONFIGURED');
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active && active.getId() !== id) fail_('WRONG_SPREADSHEET');
  const spreadsheet = SpreadsheetApp.openById(id);
  const sheet = spreadsheet.getSheetByName(RSVP.guestsSheet);
  if (!sheet) fail_('NOT_CONFIGURED');
  checkHeaders_(sheet);
  if (!spreadsheet.getSheetByName(RSVP.summarySheet)) fail_('SUMMARY_MISSING');
  const lastDataRow = sheet.getLastRow();
  const data = guestRows_(sheet);
  const namedRows = data.map((row, index) => row[0] !== '' && row[0] !== null ? index + 2 : null).filter(row => row !== null);
  const nextReservedRow = Number(PropertiesService.getScriptProperties().getProperty('RSVP_NEXT_ROW')) || 2;
  const result = {
    status: 'OK', allowedOrigins: RSVP.allowedOrigins, sheets: [RSVP.guestsSheet, RSVP.summarySheet],
    destinationMatchesActiveSpreadsheet: active ? true : null,
    lastDataRow: lastDataRow, nextReservedRow: nextReservedRow,
    guestCount: namedRows.length, firstGuestRow: namedRows[0] || null,
    lastGuestRow: namedRows.length ? namedRows[namedRows.length - 1] : null,
    checkboxOnlyRows: data.filter(row => unusedGuestRow_(row) && row[1] === false).length,
    nextWriteRow: findFreeRows_(sheet, PropertiesService.getScriptProperties(), 1, data),
  };
  console.info(JSON.stringify(result));
  return result;
}

function doPost(event) {
  let payload;
  try {
    const raw = event && event.parameter && event.parameter.payload;
    if (typeof raw !== 'string' || raw.length > 120000) fail_('INVALID_PAYLOAD');
    payload = JSON.parse(raw);
    const request = validatePayload_(payload);
    const receipt = saveGuests_(request);
    return receiptHtml_(request.replyTo, request.requestId, receipt);
  } catch (error) {
    const code = error.code || 'SERVER_ERROR';
    console.error('RSVP: ' + code); // No registrar noms ni necessitats alimentàries.
    const locations = String(error.stack || '').split('\n').filter(line => /^\s*at\s/.test(line)).join('\n');
    if (locations) console.error('RSVP location:\n' + locations);
    if (payload && RSVP.allowedOrigins.indexOf(payload.replyTo) !== -1 && validRequestId_(payload.requestId)) {
      return receiptHtml_(payload.replyTo, payload.requestId, { received: false, count: 0, error: code });
    }
    return HtmlService.createHtmlOutput('<p>No s’ha pogut processar la resposta.</p>');
  }
}

function validatePayload_(payload) {
  if (!payload || payload.version !== 1 || !validRequestId_(payload.requestId) ||
      RSVP.allowedOrigins.indexOf(payload.replyTo) === -1 || !Array.isArray(payload.guests) ||
      payload.guests.length < 1 || payload.guests.length > RSVP.maxGuests) fail_('INVALID_PAYLOAD');
  const guests = payload.guests.map(guest => {
    if (!guest || typeof guest.name !== 'string' || !guest.name.trim() || guest.name.trim().length > 160 ||
        typeof guest.attending !== 'boolean' || typeof guest.dietary !== 'string' || guest.dietary.length > 1500 ||
        (guest.attending && !Object.prototype.hasOwnProperty.call(BUS, guest.bus))) fail_('INVALID_GUEST');
    return {
      name: guest.name.trim(), attending: guest.attending,
      bus: guest.attending ? guest.bus : 'none', dietary: guest.attending ? guest.dietary.trim() : '',
    };
  });
  return { requestId: payload.requestId, replyTo: payload.replyTo, guests: guests };
}

function saveGuests_(request) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(RSVP.lockWaitMs)) fail_('BUSY');
  try {
    const properties = PropertiesService.getScriptProperties();
    const spreadsheetId = properties.getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) fail_('NOT_CONFIGURED');
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(RSVP.guestsSheet);
    if (!sheet) fail_('NOT_CONFIGURED');
    checkHeaders_(sheet);
    const key = 'RSVP_' + request.requestId;
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(request.guests), Utilities.Charset.UTF_8)
      .map(byte => ('0' + ((byte + 256) % 256).toString(16)).slice(-2)).join('');
    const previous = properties.getProperty(key);
    let record = previous ? JSON.parse(previous) : null;
    if (record && (record.digest !== digest || record.count !== request.guests.length)) fail_('REQUEST_CONFLICT');
    if (record && record.state === 'done') return { received: true, count: record.count };
    if (!record) {
      const row = findFreeRows_(sheet, properties, request.guests.length);
      record = { row: row, count: request.guests.length, digest: digest, timestamp: Date.now(), state: 'pending' };
      // La reserva impedix que una altra petició ocupe les mateixes files
      // si una execució s'interromp entre l'escriptura i la confirmació.
      const reservation = {};
      reservation[key] = JSON.stringify(record);
      reservation.RSVP_NEXT_ROW = String(row + record.count);
      properties.setProperties(reservation);
    }
    ensureRows_(sheet, record.row + record.count - 1);
    const rawRows = request.guests.map(guest => [guest.name, guest.attending, BUS[guest.bus], guest.dietary, new Date(record.timestamp)]);
    const range = sheet.getRange(record.row, 1, record.count, 5);
    const current = range.getValues();
    if (!current.every((row, index) => unusedGuestRow_(row) || row.every((cell, column) => {
      const expected = rawRows[index][column];
      return cell === '' || cell === null || (column === 4 ? cell instanceof Date && cell.getTime() === expected.getTime() : cell === expected);
    }))) fail_('RESERVATION_CONFLICT');
    formatGuests_(sheet, record.row, record.count);
    const rows = rawRows.map(row => [plainText_(row[0]), row[1], row[2], plainText_(row[3]), row[4]]);
    range.setValues(rows); // Una fila per invitat, totes les files del cercle en un sol lot.
    SpreadsheetApp.flush(); // Confirmar l'escriptura abans de donar l'èxit i alliberar el bloqueig.
    record.state = 'done';
    properties.setProperty(key, JSON.stringify(record));
    return { received: true, count: record.count };
  } finally { lock.releaseLock(); }
}

function checkHeaders_(sheet) {
  if (sheet.getLastColumn() > 5 || JSON.stringify(sheet.getRange(1, 1, 1, 5).getValues()[0]) !== JSON.stringify(HEADERS)) fail_('INVALID_HEADERS');
}

function guestRows_(sheet) {
  const count = Math.max(0, sheet.getLastRow() - 1);
  return count ? sheet.getRange(2, 1, count, 5).getValues() : [];
}

function unusedGuestRow_(row) {
  const blank = value => value === '' || value === null;
  // FALSE és l'estat d'una casella buida, no una resposta d'un invitat.
  return blank(row[0]) && (blank(row[1]) || row[1] === false) &&
    (blank(row[2]) || row[2] === BUS.none) && blank(row[3]) && blank(row[4]);
}

function findFreeRows_(sheet, properties, count, data) {
  const occupied = new Set();
  (data || guestRows_(sheet)).forEach((row, index) => { if (!unusedGuestRow_(row)) occupied.add(index + 2); });
  // Protegir també els lots reservats però encara no escrits. El punter antic
  // RSVP_NEXT_ROW pot apuntar al final de les caselles i no determina l'inici.
  const saved = properties.getProperties();
  Object.keys(saved).filter(key => key.indexOf('RSVP_') === 0 && key !== 'RSVP_NEXT_ROW').forEach(key => {
    let record;
    try { record = JSON.parse(saved[key]); } catch (error) { fail_('INVALID_RESERVATION'); }
    if (!record || !Number.isInteger(record.row) || record.row < 2 || !Number.isInteger(record.count) || record.count < 1 || record.count > 10000) fail_('INVALID_RESERVATION');
    for (let row = record.row; row < record.row + record.count; row++) occupied.add(row);
  });
  let free = 0;
  for (let row = 2; ; row++) {
    free = occupied.has(row) ? 0 : free + 1;
    if (free === count) return row - count + 1;
  }
}

function ensureRows_(sheet, lastRow) {
  if (lastRow > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), lastRow - sheet.getMaxRows());
}

function formatGuests_(sheet, row, count) {
  sheet.getRange(row, 1, count, 1).setNumberFormat('@');
  sheet.getRange(row, 4, count, 1).setNumberFormat('@').setWrap(true);
  sheet.getRange(row, 5, count, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  sheet.getRange(row, 2, count, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().setAllowInvalid(false).build());
  sheet.getRange(row, 3, count, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(Object.values(BUS), true).setAllowInvalid(false).build());
}

function plainText_(value) {
  // Tractar les entrades com a text, incloses les que comencen com una fórmula.
  return /^[=+\-@']/.test(value) ? "'" + value : value;
}

function validRequestId_(value) { return typeof value === 'string' && /^[A-Za-z0-9_-]{20,80}$/.test(value); }
function fail_(code) { const error = new Error(code); error.code = code; throw error; }

function receiptHtml_(origin, requestId, receipt) {
  const message = Object.assign({ type: 'sarapau:rsvp:receipt', version: 1, requestId: requestId }, receipt);
  const json = JSON.stringify(message).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><script>window.top.postMessage(' + json + ',' + JSON.stringify(origin) + ');</script>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
