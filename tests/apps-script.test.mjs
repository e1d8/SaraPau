import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

const source = await readFile(new URL('../google-apps-script/Code.gs', import.meta.url), 'utf8');
const normalize = value => JSON.parse(JSON.stringify(value));
const headers = ['Nom', 'Asistirà', 'Bus anada', 'Bus tornada', 'Menu especial', 'Timestamp'];
const guest = (name, fields = {}) => ({ name, attending: true, busOutbound: false, busReturnTime: null, dietary: '', ...fields });

function backend() {
  const state = {
    properties: new Map(), sheets: [], metadata: [], batches: [], locked: false, busy: false,
    failBatch: null, metadataSearchHook: null,
  };
  const owner = { getEmail: () => 'owner@example.test' };
  state.effectiveUser = owner;
  function requireLock() { assert.equal(state.locked, true, 'Les escriptures passen pel bloqueig'); }
  class Range {
    constructor(sheet, row, col, rows, cols) { Object.assign(this, { sheet, row, col, rows, cols }); }
    getValues() {
      return Array.from({ length: this.rows }, (_, r) => Array.from({ length: this.cols }, (_, c) =>
        this.sheet.cells.get(`${this.row + r}:${this.col + c}`) ?? ''));
    }
    setValues(values) {
      requireLock();
      values.forEach((row, r) => row.forEach((value, c) => this.sheet.cells.set(`${this.row + r}:${this.col + c}`, value)));
      return this;
    }
    setFormulas(values) { return this.setValues(values); }
    setBackground() { return this; }
    setFontColor() { return this; }
    setFontWeight() { return this; }
    setNumberFormat() { return this; }
    setWrap() { return this; }
    setDataValidation(rule) { this.sheet.validations.set(this.col, rule); return this; }
  }
  class Protection {
    constructor() {
      this.editors = [owner, { getEmail: () => 'editor@example.test' }];
      this.domain = true;
      this.warning = true;
      this.unprotected = ['A2'];
    }
    setDescription() {}
    setWarningOnly(value) { this.warning = value; }
    isWarningOnly() { return this.warning; }
    setUnprotectedRanges(ranges) { this.unprotected = ranges; }
    getUnprotectedRanges() { return this.unprotected; }
    addEditor(user) { if (!this.editors.includes(user)) this.editors.push(user); }
    getEditors() { return this.editors; }
    removeEditors(users) { this.editors = this.editors.filter(user => !users.includes(user)); }
    canDomainEdit() { return this.domain; }
    setDomainEdit(value) { this.domain = value; }
  }
  class Sheet {
    constructor(name, id) {
      this.name = name;
      this.id = id;
      this.cells = new Map();
      this.maxRows = 20;
      this.maxColumns = 10;
      this.validations = new Map();
      this.protections = [];
    }
    getRange(...args) { return new Range(this, ...args); }
    getLastRow() { return Math.max(0, ...[...this.cells].filter(([, v]) => v !== '').map(([key]) => Number(key.split(':')[0]))); }
    getLastColumn() { return Math.max(0, ...[...this.cells].filter(([, v]) => v !== '').map(([key]) => Number(key.split(':')[1]))); }
    getMaxRows() { return this.maxRows; }
    insertRowsAfter(_, count) { this.maxRows += count; }
    getMaxColumns() { return this.maxColumns; }
    insertColumnsAfter(_, count) { this.maxColumns += count; }
    getSheetId() { return this.id; }
    getName() { return this.name; }
    setName(name) { this.name = name; return this; }
    setTabColor(color) { this.tabColor = color; }
    setColumnWidth() {}
    setFrozenRows(rows) { this.frozenRows = rows; }
    getProtections(type) { assert.equal(type, 'SHEET'); return this.protections; }
    protect() { const protection = new Protection(); this.protections.push(protection); return protection; }
  }
  let nextSheetId = 1;
  const spreadsheet = {
    getId: () => 'test-spreadsheet', getSheets: () => state.sheets, getOwner: () => owner,
    getSheetByName: name => state.sheets.find(sheet => sheet.name === name) || null,
    insertSheet(name, index = state.sheets.length) {
      const sheet = new Sheet(name, nextSheetId++);
      state.sheets.splice(index, 0, sheet);
      return sheet;
    },
    setSpreadsheetTimeZone(zone) { state.timeZone = zone; },
  };
  spreadsheet.insertSheet('Full 1');
  state.active = spreadsheet;
  const properties = {
    getProperty: key => state.properties.get(key) || null,
    getProperties: () => Object.fromEntries(state.properties),
    setProperties(values) { Object.entries(values).forEach(([key, value]) => state.properties.set(key, value)); return this; },
    deleteProperty(key) { state.properties.delete(key); return this; },
  };
  const lock = {
    tryLock() { if (state.busy || state.locked) return false; state.locked = true; return true; },
    waitLock() { if (!this.tryLock()) throw new Error('lock busy'); },
    releaseLock() { state.locked = false; },
  };
  const builder = () => ({
    value: {}, requireCheckbox() { this.value.type = 'checkbox'; return this; },
    requireValueInList(values) { this.value = { type: 'list', values: [...values] }; return this; },
    setAllowInvalid(value) { this.value.allowInvalid = value; return this; },
    build() { return this.value; },
  });
  const sheetById = id => state.sheets.find(sheet => sheet.id === id);
  const applyRows = (sheet, startRow, rows) => rows.forEach(({ values }, index) => {
    values.forEach(({ userEnteredValue }, col) => {
      const value = userEnteredValue.stringValue ?? userEnteredValue.boolValue ?? userEnteredValue.numberValue;
      sheet.cells.set(`${startRow + index}:${col + 1}`, value);
    });
  });
  const sheetsApi = {
    get(id) { assert.equal(id, spreadsheet.getId()); return { spreadsheetId: id }; },
    DeveloperMetadata: {
      search({ dataFilters }, id) {
        assert.equal(id, spreadsheet.getId());
        const lookup = dataFilters[0].developerMetadataLookup;
        state.metadataSearchHook?.(lookup);
        return { matchedDeveloperMetadata: state.metadata.filter(metadata =>
          Object.entries(lookup).every(([name, value]) => metadata[name] === value))
          .map(developerMetadata => ({ developerMetadata })) };
      },
    },
    batchUpdate({ requests }, id) {
      requireLock();
      assert.equal(id, spreadsheet.getId());
      state.batches.push(normalize(requests));
      const fail = state.failBatch;
      state.failBatch = null;
      if (fail === 'before') throw new Error('Falla abans d’escriure');
      // Validar el lot sencer abans de modificar cap pestanya.
      for (const request of requests) {
        if (request.createDeveloperMetadata) {
          const { metadataId } = request.createDeveloperMetadata.developerMetadata;
          if (state.metadata.some(marker => marker.metadataId === metadataId)) throw new Error('ID de metadades duplicat');
        } else if (request.updateCells) {
          assert.ok(sheetById(request.updateCells.range.sheetId));
        } else {
          assert.ok(sheetById(request.appendCells.sheetId));
          assert.equal(request.appendCells.rows[0].values.length, 6);
        }
      }
      for (const request of requests) {
        if (request.createDeveloperMetadata) state.metadata.push(normalize(request.createDeveloperMetadata.developerMetadata));
        else if (request.updateCells) {
          const sheet = sheetById(request.updateCells.range.sheetId);
          sheet.cells.clear();
          sheet.validations.clear();
          applyRows(sheet, 1, request.updateCells.rows);
        } else {
          const sheet = sheetById(request.appendCells.sheetId);
          applyRows(sheet, sheet.getLastRow() + 1, request.appendCells.rows);
        }
      }
      if (fail === 'after') throw new Error('Sheets ha guardat el lot, però s’ha perdut la recepció');
    },
  };
  const context = vm.createContext({
    Date, console: { error: () => {}, info: () => {} },
    LockService: { getScriptLock: () => lock },
    PropertiesService: { getScriptProperties: () => properties },
    Session: { getEffectiveUser: () => state.effectiveUser },
    SpreadsheetApp: {
      ProtectionType: { SHEET: 'SHEET' },
      getActiveSpreadsheet: () => state.active,
      openById(id) { assert.equal(id, spreadsheet.getId()); return spreadsheet; },
      newDataValidation: builder,
      flush: requireLock,
    },
    Sheets: { Spreadsheets: sheetsApi },
    HtmlService: {
      XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' },
      createHtmlOutput(body) { return { body, setXFrameOptionsMode(mode) { this.mode = mode; return this; } }; },
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      computeDigest: (_, text) => [...createHash('sha256').update(text).digest()],
      formatDate(date, timeZone, format) {
        assert.equal(format, 'Z');
        const zone = new Intl.DateTimeFormat('en', { timeZone, timeZoneName: 'longOffset' }).formatToParts(date)
          .find(part => part.type === 'timeZoneName').value;
        return zone.replace('GMT', '').replace(':', '');
      },
    },
  });
  vm.runInContext(source, context);
  const request = (guests, requestId = '00000000-0000-4000-8000-000000000001') => ({ version: 2, requestId, replyTo: 'https://e1d8.github.io', guests });
  const post = payload => {
    const result = context.doPost({ parameter: { payload: JSON.stringify(payload) } });
    const receipt = result.body.match(/postMessage\((\{.*\}),"https?:/s);
    return receipt ? JSON.parse(receipt[1]) : undefined;
  };
  const tab = name => spreadsheet.getSheetByName(name);
  const counts = () => {
    const formulas = tab('Recompte').getRange(2, 2, 4, 1).getValues().flat();
    const guests = tab('Invitats');
    const rows = guests.getLastRow() > 1 ? guests.getRange(2, 1, guests.getLastRow() - 1, 6).getValues() : [];
    return formulas.map(formula => {
      assert.match(formula, /^=SUMPRODUCT\(/);
      assert.doesNotMatch(formula, /[,;]/, 'El recompte no depén del separador regional');
      const expression = formula.slice('=SUMPRODUCT('.length, -1)
        .replaceAll('Invitats!A2:A', 'name').replaceAll('Invitats!B2:B', 'attending')
        .replaceAll('Invitats!C2:C', 'outbound').replaceAll('Invitats!D2:D', 'returnTime')
        .replaceAll('=TRUE', '===true').replaceAll('="', '==="').replaceAll('<>"', '!=="');
      return rows.reduce((total, [name, attending, outbound, returnTime]) =>
        total + vm.runInNewContext(expression, { name, attending, outbound, returnTime }), 0);
    });
  };
  return { state, context, spreadsheet, request, post, tab, counts };
}

test('Configura les tres pestanyes, els desplegables i la protecció de les dos pestanyes de lectura', () => {
  const app = backend();
  app.context.setupSpreadsheet();
  assert.deepEqual(app.state.sheets.map(sheet => sheet.name), ['RESPOSTES', 'Invitats', 'Recompte']);
  for (const name of ['RESPOSTES', 'Invitats']) {
    const sheet = app.tab(name);
    assert.deepEqual(sheet.getRange(1, 1, 1, 6).getValues()[0], headers);
    assert.equal(sheet.getLastRow(), 1, 'Els desplegables i les caselles no omplin files buides');
    assert.deepEqual(normalize(sheet.validations.get(3)), { type: 'list', values: ['No', '13:30'], allowInvalid: false });
    assert.deepEqual(normalize(sheet.validations.get(4)), { type: 'list', values: ['No', '00:00', '02:00'], allowInvalid: false });
  }
  for (const name of ['RESPOSTES', 'Recompte']) {
    const [protection] = app.tab(name).protections;
    assert.equal(protection.warning, false);
    assert.equal(protection.domain, false);
    assert.deepEqual(normalize(protection.unprotected), []);
    assert.deepEqual(protection.editors.map(editor => editor.getEmail()), ['owner@example.test']);
  }
  assert.equal(app.tab('Invitats').protections.length, 0);
  assert.equal(app.state.timeZone, 'Europe/Madrid');
  assert.deepEqual(app.counts(), [0, 0, 0, 0]);
  assert.equal(app.post(app.request([guest('Sara')])).received, true);
  app.tab('Invitats').cells.set('2:1', 'Sara editada');
  app.context.setupSpreadsheet();
  assert.equal(app.tab('RESPOSTES').protections.length, 1);
  assert.equal(app.tab('RESPOSTES').cells.get('2:1'), 'Sara');
  assert.equal(app.tab('Invitats').cells.get('2:1'), 'Sara editada');
});

test('El reinici elimina les dades i reserves prèvies del full vinculat una sola vegada', () => {
  const app = backend();
  app.state.properties.set('SPREADSHEET_ID', 'test-spreadsheet');
  app.state.properties.set('RSVP_NEXT_ROW', '1005');
  app.state.properties.set('RSVP_00000000-0000-4000-8000-000000000001', '{"row":1001,"count":1,"state":"done"}');
  const guests = app.spreadsheet.getSheets()[0].setName('Invitats');
  ['Nom', 'Asistirà', 'Bus', 'Menu especial', 'Timestamp'].forEach((value, index) => guests.cells.set(`1:${index + 1}`, value));
  guests.cells.set('1004:1', 'Invitat antic');
  guests.cells.set('3004:2', false);
  app.spreadsheet.insertSheet('RESPOSTES').cells.set('2:1', 'Resposta antiga');
  app.spreadsheet.insertSheet('Recompte').cells.set('10:1', 'Nota antiga');
  app.spreadsheet.insertSheet('Altres').cells.set('1:1', 'Altres dades');
  assert.throws(() => app.context.setupSpreadsheet(), /INVALID_HEADERS/);
  assert.equal(guests.cells.get('1004:1'), 'Invitat antic');

  app.context.resetRsvpSpreadsheet();
  assert.equal(guests.getLastRow(), 1);
  assert.equal(app.tab('RESPOSTES').getLastRow(), 1);
  assert.equal(app.tab('Recompte').getLastRow(), 5);
  assert.equal(app.tab('Altres').cells.get('1:1'), 'Altres dades');
  assert.equal([...app.state.properties.keys()].some(key => key.startsWith('RSVP_')), false);
  assert.deepEqual(app.counts(), [0, 0, 0, 0]);
  assert.equal(app.post(app.request([guest('Nova resposta')])).received, true);
  assert.match(app.context.resetRsvpSpreadsheet(), /reinici està tancat/);
  assert.equal(guests.cells.get('2:1'), 'Nova resposta');
  assert.equal(app.tab('RESPOSTES').cells.get('2:1'), 'Nova resposta');
});

test('Un reinici interromput pot reprendre la configuració sense tornar a esborrar', () => {
  const app = backend();
  app.spreadsheet.getSheets()[0].setName('Invitats').cells.set('3:1', 'Invitat antic');
  app.state.failBatch = 'after';
  assert.throws(() => app.context.resetRsvpSpreadsheet(), /perdut la recepció/);
  assert.equal(app.tab('Invitats').getLastRow(), 1);
  app.tab('Invitats').cells.set('2:1', 'Afegit mentre es reprenia');
  app.context.resetRsvpSpreadsheet();
  assert.equal(app.state.batches.length, 1);
  assert.equal(app.tab('Invitats').cells.get('2:1'), 'Afegit mentre es reprenia');
});

test('Escriu els trajectes i la data en les dos còpies, i recompta des d’Invitats', () => {
  const app = backend();
  app.context.setupSpreadsheet();
  const guests = [guest('Sense bus'), guest('Anada', { busOutbound: true }),
    guest('Tornada 00', { busReturnTime: '00:00' }), guest('Tornada 02', { busReturnTime: '02:00' }),
    guest('Combinat', { busOutbound: true, busReturnTime: '00:00', dietary: '=menú literal' }),
    guest('No assistix', { attending: false, busOutbound: true, busReturnTime: '02:00', dietary: 'No guardar' })];
  const receipt = app.post(app.request(guests));
  assert.equal(receipt.received, true);
  assert.equal(receipt.count, 6);
  assert.equal(app.state.batches.length, 1);
  const [raw, editable, marker] = app.state.batches[0];
  assert.deepEqual(raw.appendCells.rows, editable.appendCells.rows);
  assert.ok(marker.createDeveloperMetadata);
  const rows = app.tab('RESPOSTES').getRange(2, 1, 6, 6).getValues();
  assert.deepEqual(rows, app.tab('Invitats').getRange(2, 1, 6, 6).getValues());
  assert.deepEqual(rows.map(row => row.slice(2, 5)), [
    ['No', 'No', ''], ['13:30', 'No', ''], ['No', '00:00', ''], ['No', '02:00', ''],
    ['13:30', '00:00', '=menú literal'], ['No', 'No', ''],
  ]);
  const dateCells = raw.appendCells.rows.map(row => row.values[5]);
  assert.ok(dateCells.every(cell => cell.userEnteredFormat.numberFormat.type === 'DATE_TIME' &&
    typeof cell.userEnteredValue.numberValue === 'number' && cell.userEnteredValue.numberValue === rows[0][5]));
  assert.deepEqual(raw.appendCells.rows[4].values[4].userEnteredValue, { stringValue: '=menú literal' });
  const date = new Date('2027-10-09T11:30:00Z');
  const serial = 25569 + Date.parse('2027-10-09T13:30:00Z') / 86400000;
  assert.ok(Math.abs(app.context.spreadsheetDate_(date) - serial) < .000001);
  assert.deepEqual(app.counts(), [5, 2, 2, 1]);
  app.tab('Invitats').cells.set('4:4', '02:00');
  app.tab('Invitats').cells.set('3:2', false);
  assert.deepEqual(app.counts(), [4, 1, 1, 2]);
  assert.equal(app.tab('RESPOSTES').cells.get('4:4'), '00:00');
});

test('Un error de guardat és atòmic i una recepció perduda no duplica ni restaura files editades', () => {
  const app = backend();
  app.context.setupSpreadsheet();
  const request = app.request([guest('Sara'), guest('Pau')]);
  app.state.failBatch = 'before';
  assert.equal(app.post(request).error, 'SERVER_ERROR');
  assert.equal(app.state.locked, false);
  assert.equal(app.tab('Invitats').getLastRow(), 1);
  assert.equal(app.tab('RESPOSTES').getLastRow(), 1);
  assert.equal(app.state.metadata.length, 0);
  app.state.failBatch = 'after';
  assert.equal(app.post(request).received, true);
  assert.equal(app.tab('RESPOSTES').getLastRow(), 3);
  // Després de reordenar, editar o suprimir en la còpia operativa, el reintent
  // es resol amb la marca de guardat i no amb les posicions de les files.
  app.tab('Invitats').cells.set('2:1', 'Sara corregida');
  for (let col = 1; col <= 6; col++) app.tab('Invitats').cells.delete(`3:${col}`);
  assert.equal(app.post(request).received, true);
  assert.equal(app.state.batches.length, 2);
  assert.equal(app.tab('Invitats').getLastRow(), 2);
  assert.equal(app.tab('Invitats').cells.get('2:1'), 'Sara corregida');
  assert.equal(app.tab('RESPOSTES').cells.get('2:1'), 'Sara');
  assert.equal(app.post({ ...request, guests: [guest('Altres dades')] }).error, 'REQUEST_CONFLICT');
});

test('Un lot que acaba durant un reintent es confirma una sola vegada', () => {
  const app = backend();
  app.context.setupSpreadsheet();
  const request = app.request([guest('Sara')]);
  app.post(request);
  const [mark] = app.state.metadata.splice(0, 1);
  app.state.metadataSearchHook = lookup => {
    if (lookup.metadataId === mark.metadataId) app.state.metadata.push(mark);
  };
  assert.equal(app.post(request).received, true);
  assert.equal(app.tab('Invitats').getLastRow(), 2);
  assert.equal(app.tab('RESPOSTES').getLastRow(), 2);
  assert.equal(app.state.metadata.length, 1);
});

test('Rebutja el format antic, les hores invàlides i els bloquejos ocupats sense escriure', () => {
  const app = backend();
  app.context.setupSpreadsheet();
  const old = app.post({ ...app.request([{ name: 'Sara', bus: 'none', attending: true, dietary: '' }]), version: 1 });
  assert.equal(old.error, 'VERSION_UNSUPPORTED');
  assert.match(old.message, /Recarrega/);
  for (const guests of [
    [guest('')], [guest('A', { busReturnTime: '' })], [guest('A', { busReturnTime: '13:30' })],
    [guest('A', { busOutbound: 'true' })], [guest('A', { attending: 'true' })], Array.from({ length: 51 }, () => guest('A')),
  ]) {
    assert.equal(app.post(app.request(guests)).received, false);
  }
  app.state.busy = true;
  assert.equal(app.post(app.request([guest('A')])).error, 'BUSY');
  app.state.busy = false;
  assert.equal(app.post({ ...app.request([guest('A')]), replyTo: 'https://evil.example' }), undefined);
  assert.equal(app.state.batches.length, 0);
});

test('El diagnòstic comprova les proteccions i el reinici verifica la vinculació i el propietari', () => {
  const app = backend();
  assert.throws(() => app.context.diagnoseSetup(), /NOT_CONFIGURED/);
  app.state.active = { getId: () => 'other-spreadsheet' };
  app.state.properties.set('SPREADSHEET_ID', 'test-spreadsheet');
  assert.throws(() => app.context.resetRsvpSpreadsheet(), /WRONG_SPREADSHEET/);
  app.state.active = app.spreadsheet;
  app.state.effectiveUser = { getEmail: () => 'editor@example.test' };
  assert.throws(() => app.context.resetRsvpSpreadsheet(), /OWNER_REQUIRED/);
  assert.equal(app.state.batches.length, 0);
  app.state.effectiveUser = app.spreadsheet.getOwner();
  app.context.setupSpreadsheet();
  const result = normalize(app.context.diagnoseSetup());
  assert.equal(result.status, 'OK');
  assert.equal(result.version, 2);
  assert.equal(result.destinationMatchesActiveSpreadsheet, true);
  assert.deepEqual(result.protectedSheets, ['RESPOSTES', 'Recompte']);
  assert.equal(result.guestCount + result.responseCount, 0);
  app.tab('Recompte').protections[0].setWarningOnly(true);
  assert.throws(() => app.context.diagnoseSetup(), /PROTECTION_MISSING/);
  assert.equal(app.state.batches.length, 0);
});
