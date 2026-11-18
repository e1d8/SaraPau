const RSVP = Object.freeze({
  allowedOrigins: ['https://e1d8.github.io'],
  responseSheet: 'RESPOSTES',
  guestsSheet: 'Invitats',
  summarySheet: 'Recompte',
  timeZone: 'Europe/Madrid',
  maxGuests: 50,
  lockWaitMs: 3000,
  version: 2,
});
const HEADERS = ['Nom', 'Asistirà', 'Bus anada', 'Bus tornada', 'Menu especial', 'Timestamp'];
const BUS_OUTBOUND = '13:30';
const BUS_RETURN_TIMES = ['00:00', '02:00'];
const DATE_FORMAT = 'dd/MM/yyyy HH:mm:ss';
const READY_PROPERTY = 'RSVP2_READY';
const RESET_KEY = 'sarapau-rsvp-v2-reset';
const COMMIT_PREFIX = 'sarapau-rsvp-v2:';
const WRITE_SLOT_PROPERTY = 'RSVP2_WRITE_SLOT';
// Índexs de Nom, Bus anada, Bus tornada, Menu especial i Timestamp.
const OCCUPANCY_COLUMNS = [0, 2, 3, 4, 5];

// Configuració ordinària. No esborra les files dels invitats ni de l’històric.
function setupSpreadsheet() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const { spreadsheet, properties } = boundSpreadsheet_();
    for (const name of [RSVP.responseSheet, RSVP.guestsSheet]) {
      const sheet = spreadsheet.getSheetByName(name);
      if (sheet && sheet.getLastRow() > 0) checkHeaders_(sheet);
    }
    return configureSheets_(spreadsheet, properties, ensureSheets_(spreadsheet));
  } finally {
    lock.releaseLock();
  }
}

// Reinici explícit de les tres pestanyes de l’RSVP. Executar des de l’editor
// del full vinculat, abans de desplegar la versió nova del formulari.
function resetRsvpSpreadsheet() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const { spreadsheet, properties } = boundSpreadsheet_();
    if (properties.getProperty(READY_PROPERTY) === String(RSVP.version)) {
      return 'El full ja està configurat amb el protocol 2. El reinici està tancat.';
    }
    const id = spreadsheet.getId();
    const reset = findMetadata_(id, { metadataKey: RESET_KEY });
    if (!reset) {
      // La marca permet reprendre la configuració si l’execució es talla
      // després de buidar les dades, sense tornar a buidar cap pestanya.
      const sheets = ensureSheets_(spreadsheet);
      for (const sheet of [sheets.responses, sheets.guests]) ensureColumns_(sheet, HEADERS.length);
      SpreadsheetApp.flush();
      const requests = Object.values(sheets).map(sheet => ({
        updateCells: {
          range: { sheetId: sheet.getSheetId() },
          rows: sheet === sheets.summary ? [] : [{
            values: HEADERS.map(header => ({ userEnteredValue: { stringValue: header } })),
          }],
          fields: 'userEnteredValue,userEnteredFormat,dataValidation,note',
        },
      }));
      requests.push(createMetadataRequest_(id, RESET_KEY, String(RSVP.version)));
      Sheets.Spreadsheets.batchUpdate({ requests }, id);
    }
    return configureSheets_(spreadsheet, properties, ensureSheets_(spreadsheet));
  } finally {
    lock.releaseLock();
  }
}

function boundSpreadsheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) fail_('NOT_BOUND');
  const properties = PropertiesService.getScriptProperties();
  const currentId = properties.getProperty('SPREADSHEET_ID');
  if (currentId && currentId !== spreadsheet.getId()) fail_('WRONG_SPREADSHEET');
  const ownerEmail = spreadsheet.getOwner()?.getEmail();
  if (!ownerEmail || ownerEmail !== Session.getEffectiveUser().getEmail()) fail_('OWNER_REQUIRED');
  checkSheetsService_(spreadsheet.getId());
  return { spreadsheet, properties };
}

function checkSheetsService_(id) {
  if (typeof Sheets === 'undefined') fail_('SHEETS_API_UNAVAILABLE');
  Sheets.Spreadsheets.get(id, { fields: 'spreadsheetId' });
}

function ensureSheets_(spreadsheet) {
  let guests = spreadsheet.getSheetByName(RSVP.guestsSheet);
  if (!guests) {
    const sheets = spreadsheet.getSheets();
    const first = sheets[0];
    const reusable = sheets.length === 1 && first.getLastRow() === 0 &&
      ![RSVP.responseSheet, RSVP.summarySheet].includes(first.getName());
    guests = reusable ? first.setName(RSVP.guestsSheet) : spreadsheet.insertSheet(RSVP.guestsSheet, 0);
  }
  const responses = spreadsheet.getSheetByName(RSVP.responseSheet) || spreadsheet.insertSheet(RSVP.responseSheet, 0);
  const summary = spreadsheet.getSheetByName(RSVP.summarySheet) || spreadsheet.insertSheet(RSVP.summarySheet);
  return { responses, guests, summary };
}

function configureSheets_(spreadsheet, properties, { responses, guests, summary }) {
  spreadsheet.setSpreadsheetTimeZone(RSVP.timeZone);
  for (const sheet of [responses, guests]) {
    ensureColumns_(sheet, HEADERS.length);
    if (sheet.getMaxRows() < 2) sheet.insertRowsAfter(sheet.getMaxRows(), 1);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    styleHeader_(sheet, HEADERS.length);
    sheet.setTabColor('#636B2F');
    [240, 105, 135, 135, 360, 180].forEach((width, index) => sheet.setColumnWidth(index + 1, width));
    const count = sheet.getMaxRows() - 1;
    sheet.getRange(2, 1, count, 1).setNumberFormat('@');
    sheet.getRange(2, 2, count, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireCheckbox().setAllowInvalid(false).build());
    sheet.getRange(2, 3, count, 1).setNumberFormat('@').setDataValidation(busValidation_(['No', BUS_OUTBOUND]));
    sheet.getRange(2, 4, count, 1).setNumberFormat('@').setDataValidation(busValidation_(['No', ...BUS_RETURN_TIMES]));
    sheet.getRange(2, 5, count, 1).setNumberFormat('@').setWrap(true);
    sheet.getRange(2, 6, count, 1).setNumberFormat(DATE_FORMAT);
  }
  if (summary.getMaxRows() < 5) summary.insertRowsAfter(summary.getMaxRows(), 5 - summary.getMaxRows());
  ensureColumns_(summary, 2);
  summary.getRange(1, 1, 5, 2).setValues([
    ['Recompte', 'Persones'], ['Assistents a la boda', ''], ['Bus d’anada', ''],
    ['Bus de tornada (00:00)', ''], ['Bus de tornada (02:00)', ''],
  ]);
  summary.getRange(2, 2, 4, 1).setFormulas(summaryFormulas_().map(formula => [formula]));
  styleHeader_(summary, 2);
  summary.getRange(2, 2, 4, 1).setNumberFormat('0');
  summary.setColumnWidth(1, 290);
  summary.setColumnWidth(2, 110);
  summary.setTabColor('#BAC095');
  protectSheet_(responses);
  protectSheet_(summary);
  SpreadsheetApp.flush();
  if (properties.getProperty(READY_PROPERTY) !== String(RSVP.version)) {
    // El format nou conserva l’estat dels lots en les metadades del full.
    for (const key of Object.keys(properties.getProperties())) {
      if (key.startsWith('RSVP_')) properties.deleteProperty(key);
    }
  }
  properties.setProperties({ SPREADSHEET_ID: spreadsheet.getId(), [READY_PROPERTY]: String(RSVP.version) });
  return 'Configuració completada: RESPOSTES, Invitats i Recompte.';
}

function styleHeader_(sheet, width) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, width).setBackground('#636B2F').setFontColor('#ffffff').setFontWeight('bold');
}

function ensureColumns_(sheet, width) {
  const count = sheet.getMaxColumns();
  if (count < width) sheet.insertColumnsAfter(count, width - count);
}

function busValidation_(values) {
  return SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(false).build();
}

function protectSheet_(sheet) {
  const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
  const protection = protections[0] || sheet.protect();
  protection.setDescription('Sara i Pau · ' + sheet.getName());
  protection.setWarningOnly(false);
  protection.setUnprotectedRanges([]);
  const owner = Session.getEffectiveUser();
  protection.addEditor(owner);
  const otherEditors = protection.getEditors().filter(editor => editor.getEmail() !== owner.getEmail());
  if (otherEditors.length) protection.removeEditors(otherEditors);
  if (protection.canDomainEdit()) protection.setDomainEdit(false);
}

function summaryFormulas_() {
  // Un sol argument evita dependre del separador regional del full.
  const attending = '(Invitats!A2:A<>"")*(Invitats!B2:B=TRUE)';
  const count = condition => '=SUMPRODUCT(' + attending + condition + ')';
  return [
    count(''),
    count('*(Invitats!C2:C="' + BUS_OUTBOUND + '")'),
    ...BUS_RETURN_TIMES.map(time => count('*(Invitats!D2:D="' + time + '")')),
  ];
}

function doGet() {
  return HtmlService.createHtmlOutput('<p>Servei RSVP de Sara i Pau actiu. Protocol 2.</p>');
}

// Diagnòstic de lectura. No mostra els valors de cap resposta.
function diagnoseSetup() {
  const { spreadsheet, responses, guests, summary } = configuredSheets_();
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active && active.getId() !== spreadsheet.getId()) fail_('WRONG_SPREADSHEET');
  checkSheetsService_(spreadsheet.getId());
  const protectedSheets = [responses, summary].filter(sheet =>
    sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET).some(protection =>
      !protection.isWarningOnly() && protection.getUnprotectedRanges().length === 0 && !protection.canDomainEdit()));
  if (protectedSheets.length !== 2) fail_('PROTECTION_MISSING');
  const result = {
    status: 'OK', version: RSVP.version, allowedOrigins: RSVP.allowedOrigins,
    sheets: [RSVP.responseSheet, RSVP.guestsSheet, RSVP.summarySheet],
    protectedSheets: protectedSheets.map(sheet => sheet.getName()),
    destinationMatchesActiveSpreadsheet: active ? true : null,
    responseCount: namedRows_(responses), guestCount: namedRows_(guests),
  };
  console.info(JSON.stringify(result));
  return result;
}

function configuredSheets_() {
  const properties = PropertiesService.getScriptProperties();
  const id = properties.getProperty('SPREADSHEET_ID');
  if (!id || properties.getProperty(READY_PROPERTY) !== String(RSVP.version)) fail_('NOT_CONFIGURED');
  const spreadsheet = SpreadsheetApp.openById(id);
  const responses = spreadsheet.getSheetByName(RSVP.responseSheet);
  const guests = spreadsheet.getSheetByName(RSVP.guestsSheet);
  const summary = spreadsheet.getSheetByName(RSVP.summarySheet);
  if (!responses || !guests) fail_('NOT_CONFIGURED');
  checkHeaders_(responses);
  checkHeaders_(guests);
  if (!summary) fail_('SUMMARY_MISSING');
  return { spreadsheet, responses, guests, summary };
}

function checkHeaders_(sheet) {
  if (sheet.getLastColumn() < HEADERS.length ||
      JSON.stringify(sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0]) !== JSON.stringify(HEADERS)) {
    fail_('INVALID_HEADERS');
  }
}

function namedRows_(sheet) {
  const rows = sheet.getLastRow() - 1;
  return rows > 0 ? sheet.getRange(2, 1, rows, 1).getValues().filter(([name]) => name !== '').length : 0;
}

function doPost(event) {
  let payload;
  try {
    const raw = event && event.parameter && event.parameter.payload;
    if (typeof raw !== 'string' || raw.length > 120000) fail_('INVALID_PAYLOAD');
    try { payload = JSON.parse(raw); } catch (error) { fail_('INVALID_PAYLOAD'); }
    const request = validatePayload_(payload);
    return receiptHtml_(request.replyTo, request.requestId, saveGuests_(request));
  } catch (error) {
    const code = error.code || 'SERVER_ERROR';
    console.error('RSVP: ' + code); // No registrar noms ni necessitats alimentàries.
    const locations = String(error.stack || '').split('\n').filter(line => /^\s*at\s/.test(line)).join('\n');
    if (locations) console.error('RSVP location:\n' + locations);
    if (payload && RSVP.allowedOrigins.includes(payload.replyTo) && validRequestId_(payload.requestId)) {
      const receipt = { received: false, count: 0, error: code };
      if (code === 'VERSION_UNSUPPORTED') receipt.message = 'Recarrega la invitació per a tornar a respondre.';
      return receiptHtml_(payload.replyTo, payload.requestId, receipt);
    }
    return HtmlService.createHtmlOutput('<p>No s’ha pogut processar la resposta.</p>');
  }
}

function validatePayload_(payload) {
  if (!payload || !validRequestId_(payload.requestId) || !RSVP.allowedOrigins.includes(payload.replyTo)) {
    fail_('INVALID_PAYLOAD');
  }
  if (payload.version !== RSVP.version) fail_('VERSION_UNSUPPORTED');
  if (!Array.isArray(payload.guests) || payload.guests.length < 1 || payload.guests.length > RSVP.maxGuests) {
    fail_('INVALID_PAYLOAD');
  }
  const guests = payload.guests.map(guest => {
    if (!guest || typeof guest.name !== 'string' || !guest.name.trim() || guest.name.trim().length > 160 ||
        typeof guest.attending !== 'boolean' || typeof guest.dietary !== 'string' || guest.dietary.length > 1500 ||
        typeof guest.busOutbound !== 'boolean' ||
        (guest.busReturnTime !== null && !BUS_RETURN_TIMES.includes(guest.busReturnTime))) fail_('INVALID_GUEST');
    return {
      name: guest.name.trim(), attending: guest.attending,
      busOutbound: guest.attending && guest.busOutbound,
      busReturnTime: guest.attending ? guest.busReturnTime : null,
      dietary: guest.attending ? guest.dietary.trim() : '',
    };
  });
  return { requestId: payload.requestId, replyTo: payload.replyTo, guests };
}

function saveGuests_(request) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(RSVP.lockWaitMs)) fail_('BUSY');
  try {
    const { spreadsheet, responses, guests } = configuredSheets_();
    const id = spreadsheet.getId();
    if (typeof Sheets === 'undefined') fail_('SHEETS_API_UNAVAILABLE');
    const key = COMMIT_PREFIX + request.requestId;
    const digest = sha256_(JSON.stringify(request.guests));
    const receipt = { received: true, count: request.guests.length };
    // Comprovar el lot després de fixar l'identificador del pròxim guardat.
    // Un lot anterior pot haver acabat entre les dos consultes.
    const metadataId = nextWriteMetadataId_(id);
    if (hasCommit_(id, key, digest)) return receipt;

    const timestamp = spreadsheetDate_(new Date());
    const rows = request.guests.map(guest => guestCells_(guest, timestamp));
    const sheets = [responses, guests];
    const { valueRanges } = Sheets.Spreadsheets.Values.batchGet(id, {
      ranges: sheets.map(sheet => "'" + sheet.getName() + "'!A2:F"),
      // Una fórmula que mostra una cel·la buida també ocupa la fila.
      valueRenderOption: 'FORMULA',
    });
    const requests = sheets.flatMap((sheet, index) => guestWriteRequests_(sheet, valueRanges[index].values ?? [], rows));
    requests.push(metadataRequest_(metadataId, key, digest));
    try {
      // Un únic lot escriu les dos pestanyes i confirma la mateixa operació.
      Sheets.Spreadsheets.batchUpdate({ requests }, id);
    } catch (error) {
      // La resposta de Sheets pot perdre’s després que el lot s’haja guardat.
      if (!hasCommit_(id, key, digest)) throw error;
    }
    return receipt;
  } finally {
    lock.releaseLock();
  }
}

function guestWriteRequests_(sheet, values, rows) {
  const sheetId = sheet.getSheetId();
  const requests = [];
  let rowIndex = 1; // La fila 1 és la capçalera. L'API utilitza índexs des de zero.
  for (const row of rows) {
    while (rowIndex <= values.length && OCCUPANCY_COLUMNS.some(column => (values[rowIndex - 1][column] ?? '') !== '')) {
      rowIndex++;
    }
    requests.push({ updateCells: {
      start: { sheetId, rowIndex, columnIndex: 0 },
      rows: [row],
      fields: 'userEnteredValue,userEnteredFormat,dataValidation',
    } });
    rowIndex++;
  }
  const extraRows = rowIndex - sheet.getMaxRows();
  if (extraRows > 0) requests.unshift({ appendDimension: { sheetId, dimension: 'ROWS', length: extraRows } });
  return requests;
}

function nextWriteMetadataId_(id) {
  const properties = PropertiesService.getScriptProperties();
  let metadataId = Number(properties.getProperty(WRITE_SLOT_PROPERTY)) || 1;
  while (findMetadata_(id, { metadataId })) metadataId++;
  // Mantindre el mateix ID fins que conste un guardat. Si Sheets acaba un
  // lot anterior tard, l'ID duplicat rebutja tot el segon lot atòmicament.
  properties.setProperty(WRITE_SLOT_PROPERTY, String(metadataId));
  return metadataId;
}

function findMetadata_(id, developerMetadataLookup) {
  const result = Sheets.Spreadsheets.DeveloperMetadata.search({ dataFilters: [{ developerMetadataLookup }] }, id);
  return result.matchedDeveloperMetadata?.[0]?.developerMetadata;
}

function hasCommit_(id, key, digest) {
  const marker = findMetadata_(id, { metadataKey: key });
  if (marker && marker.metadataValue !== digest) fail_('REQUEST_CONFLICT');
  return !!marker;
}

function createMetadataRequest_(id, key, value) {
  // Un ID repetible evita duplicar files si hi ha un reintent mentre Sheets
  // acaba d'escriure el primer lot. Sheets rebutja un lot amb un ID duplicat.
  const max = 2147483647;
  let metadataId = (parseInt(sha256_(key).slice(0, 8), 16) % max) + 1;
  let occupied = findMetadata_(id, { metadataId });
  while (occupied && occupied.metadataKey !== key) {
    metadataId = metadataId % max + 1;
    occupied = findMetadata_(id, { metadataId });
  }
  return metadataRequest_(metadataId, key, value);
}

function metadataRequest_(metadataId, key, value) {
  return {
    createDeveloperMetadata: {
      developerMetadata: { metadataId, metadataKey: key, metadataValue: value, location: { spreadsheet: true }, visibility: 'PROJECT' },
    },
  };
}

function sha256_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8)
    .map(byte => ('0' + ((byte + 256) % 256).toString(16)).slice(-2)).join('');
}

function spreadsheetDate_(date) {
  const offset = Utilities.formatDate(date, RSVP.timeZone, 'Z');
  const minutes = (offset[0] === '-' ? -1 : 1) * (Number(offset.slice(1, 3)) * 60 + Number(offset.slice(3, 5)));
  return 25569 + (date.getTime() + minutes * 60000) / 86400000;
}

function guestCells_(guest, timestamp) {
  // Tipar com a text preserva les hores i impedix interpretar noms o dietes com fórmules.
  const textCell = (value, format = {}) => ({
    userEnteredValue: { stringValue: value },
    userEnteredFormat: { numberFormat: { type: 'TEXT' }, ...format },
  });
  const busCell = (value, options) => ({
    ...textCell(value),
    dataValidation: {
      condition: { type: 'ONE_OF_LIST', values: options.map(option => ({ userEnteredValue: option })) },
      strict: true, showCustomUi: true,
    },
  });
  return { values: [
    textCell(guest.name),
    { userEnteredValue: { boolValue: guest.attending }, dataValidation: { condition: { type: 'BOOLEAN' }, strict: true, showCustomUi: true } },
    busCell(guest.busOutbound ? BUS_OUTBOUND : 'No', ['No', BUS_OUTBOUND]),
    busCell(guest.busReturnTime ?? 'No', ['No', ...BUS_RETURN_TIMES]),
    textCell(guest.dietary, { wrapStrategy: 'WRAP' }),
    { userEnteredValue: { numberValue: timestamp }, userEnteredFormat: { numberFormat: { type: 'DATE_TIME', pattern: DATE_FORMAT } } },
  ] };
}

function validRequestId_(value) { return typeof value === 'string' && /^[A-Za-z0-9_-]{20,80}$/.test(value); }
function fail_(code) { const error = new Error(code); error.code = code; throw error; }

function receiptHtml_(origin, requestId, receipt) {
  const message = { type: 'sarapau:rsvp:receipt', version: 1, requestId, ...receipt };
  const json = JSON.stringify(message).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><script>window.top.postMessage(' + json + ',' + JSON.stringify(origin) + ');</script>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
