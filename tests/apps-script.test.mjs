import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

const source = await readFile(new URL('../google-apps-script/Code.gs', import.meta.url), 'utf8');
const normalize = value => JSON.parse(JSON.stringify(value));

function backend() {
  const state = { properties: new Map(), sheets: [], calls: [], rawWrites: [], locked: false, busy: false, failFlush: false };
  class Range {
    constructor(sheet, row, col, rows, cols) { Object.assign(this, { sheet, row, col, rows, cols }); }
    getValues() { return Array.from({ length: this.rows }, (_, r) => Array.from({ length: this.cols }, (_, c) => this.sheet.cells.get(`${this.row + r}:${this.col + c}`) ?? '')); }
    setValues(values) {
      assert.equal(state.locked, true, 'Cada escriptura ha d’estar dins del bloqueig');
      state.calls.push(`write:${this.sheet.name}:${this.row}`);
      state.rawWrites.push({ sheet: this.sheet.name, row: this.row, values: normalize(values) });
      values.forEach((row, r) => row.forEach((value, c) => {
        // Sheets interpreta l'apòstrof inicial com a marca de text literal.
        if (typeof value === 'string' && value.startsWith("'")) value = value.slice(1);
        this.sheet.cells.set(`${this.row + r}:${this.col + c}`, value);
      }));
      return this;
    }
    setFormulas(values) { this.sheet.formulas = values.map(row => [...row]); return this; }
    setBackground() { return this; } setFontColor() { return this; } setFontWeight() { return this; }
    setNumberFormat() { return this; } setWrap() { return this; }
    setDataValidation(value) { this.sheet.validations.push({ row: this.row, col: this.col, value }); return this; }
  }
  class Sheet {
    constructor(name) { this.name = name; this.cells = new Map(); this.maxRows = 20; this.validations = []; }
    getRange(...args) { return new Range(this, ...args); }
    getLastRow() { return Math.max(0, ...[...this.cells].filter(([, v]) => v !== '').map(([key]) => Number(key.split(':')[0]))); }
    getLastColumn() { return Math.max(0, ...[...this.cells].filter(([, v]) => v !== '').map(([key]) => Number(key.split(':')[1]))); }
    getMaxRows() { return this.maxRows; } insertRowsAfter(_, count) { this.maxRows += count; return this; }
    setName(name) { this.name = name; return this; } setTabColor(color) { this.tabColor = color; return this; }
    setColumnWidth() { return this; }
    // L'API real retorna void: no es pot encadenar cap mètode després.
    setFrozenRows(rows) { this.frozenRows = rows; }
  }
  const spreadsheet = {
    getId: () => 'test-spreadsheet', getSheets: () => state.sheets,
    getSheetByName: name => state.sheets.find(sheet => sheet.name === name) || null,
    insertSheet(name, index = state.sheets.length) { const sheet = new Sheet(name); state.sheets.splice(index, 0, sheet); return sheet; },
    setSpreadsheetTimeZone(zone) { state.timeZone = zone; },
  };
  spreadsheet.insertSheet('Full 1');
  const properties = {
    getProperty: key => state.properties.get(key) || null,
    setProperty(key, value) { state.properties.set(key, value); return this; },
    setProperties(values) { Object.entries(values).forEach(([key, value]) => state.properties.set(key, value)); return this; },
  };
  const lock = {
    tryLock() { if (state.busy || state.locked) return false; state.locked = true; state.calls.push('lock'); return true; },
    waitLock() { if (!this.tryLock()) throw new Error('lock busy'); },
    releaseLock() { state.calls.push('unlock'); state.locked = false; },
  };
  const builder = () => ({
    value: {}, requireCheckbox() { this.value.type = 'checkbox'; return this; },
    requireValueInList(values) { this.value = { type: 'list', values: [...values] }; return this; },
    setAllowInvalid(value) { this.value.allowInvalid = value; return this; }, build() { return this.value; },
  });
  const context = vm.createContext({
    Date, console: { error: () => {} },
    LockService: { getScriptLock: () => lock },
    PropertiesService: { getScriptProperties: () => properties },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => spreadsheet,
      openById(id) { assert.equal(id, 'test-spreadsheet'); return spreadsheet; },
      newDataValidation: builder,
      flush() {
        assert.equal(state.locked, true);
        state.calls.push('flush');
        if (state.failFlush) { state.failFlush = false; throw new Error('interrupted'); }
      },
    },
    HtmlService: {
      XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' },
      createHtmlOutput(body) { return { body, setXFrameOptionsMode(mode) { this.mode = mode; return this; } }; },
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      computeDigest: (_, text) => [...createHash('sha256').update(text).digest()],
    },
  });
  vm.runInContext(source, context);
  const request = (guests, requestId = '00000000-0000-4000-8000-000000000001') => ({ version: 1, requestId, replyTo: 'https://e1d8.github.io', guests });
  const post = payload => {
    const result = context.doPost({ parameter: { payload: JSON.stringify(payload) } });
    const receipt = result.body.match(/postMessage\((\{.*\}),"https?:/s);
    return { ...result, receipt: receipt ? JSON.parse(receipt[1]) : undefined };
  };
  return { state, context, spreadsheet, request, post };
}

const guest = (name, bus = 'none', attending = true, dietary = '') => ({ name, bus, attending, dietary });

test('La configuració crea dos pestanyes, cinc capçaleres i el recompte sense esborrar invitats', () => {
  const app = backend(); app.context.setupSpreadsheet();
  assert.deepEqual(app.state.sheets.map(sheet => sheet.name), ['Invitats', 'Recompte']);
  assert.deepEqual(normalize(app.state.sheets[0].getRange(1, 1, 1, 5).getValues()), [['Nom', 'Asistirà', 'Bus', 'Menu especial', 'Timestamp']]);
  assert.equal(app.state.timeZone, 'Europe/Madrid');
  assert.equal(app.state.properties.get('SPREADSHEET_ID'), 'test-spreadsheet');
  assert.equal(app.state.sheets[1].frozenRows, 1);
  assert.equal(app.state.sheets[1].tabColor, '#BAC095');
  assert.equal(app.state.sheets[0].getLastRow(), 1, 'La validació de checkbox no ha d’omplir files buides');
  assert.equal(app.post(app.request([guest('Sara')])).receipt.received, true);
  app.context.setupSpreadsheet();
  assert.equal(app.state.sheets[0].getRange(2, 1, 1, 1).getValues()[0][0], 'Sara');
  const formulas = app.state.sheets[1].formulas.flat();
  const fixtures = [guest('A'), guest('B', 'outbound'), guest('C', 'return-midnight'), guest('D', 'return-two'), guest('E', 'return-midnight', false)];
  const labels = { none: 'No', outbound: 'Anada', 'return-midnight': 'Anada+Tornada(00:00)', 'return-two': 'Anada+Tornada(02:00)' };
  const counts = formulas.map(formula => {
    assert.match(formula, /^=SUMPRODUCT\(/);
    assert.doesNotMatch(formula, /[,;]/, 'El recompte no ha de dependre del separador regional');
    const expression = formula.slice('=SUMPRODUCT('.length, -1).replaceAll('Invitats!B2:B', 'attending')
      .replaceAll('Invitats!C2:C', 'bus').replaceAll('=TRUE', '===true').replaceAll('="', '==="');
    return fixtures.reduce((total, g) => total + vm.runInNewContext(expression, { attending: g.attending, bus: labels[g.bus] }), 0);
  });
  assert.deepEqual(normalize(counts), [4, 3, 1, 1]);
});

test('Guarda una fila per invitat amb booleans, bus validat i timestamp del servidor dins del lock', () => {
  const app = backend(); app.context.setupSpreadsheet(); app.state.calls.length = 0;
  const response = app.post(app.request([guest('Sara', 'return-midnight', true, '=IMPORTXML("x")'), guest('Pau', 'return-two', false, 'No guardar')])).receipt;
  assert.equal(response.received, true); assert.equal(response.count, 2);
  const rows = app.state.sheets[0].getRange(2, 1, 2, 5).getValues();
  assert.deepEqual(rows.map(row => row.slice(0, 4)), [['Sara', true, 'Anada+Tornada(00:00)', '=IMPORTXML("x")'], ['Pau', false, 'No', '']]);
  assert.ok(rows.every(row => row[4] instanceof Date));
  assert.equal(app.state.rawWrites.find(write => write.row === 2).values[0][3], "'=IMPORTXML(\"x\")");
  assert.equal(rows[0][4].getTime(), rows[1][4].getTime());
  assert.deepEqual(app.state.calls, ['lock', 'write:Invitats:2', 'flush', 'unlock']);
});

test('Una petició repetida no duplica files i un reintent recupera una escriptura interrompuda', () => {
  const app = backend(); app.context.setupSpreadsheet();
  const first = app.request([guest('Sara')]);
  app.state.failFlush = true;
  assert.equal(app.post(first).receipt.received, false);
  assert.equal(app.state.locked, false);
  const second = app.request([guest('Pau')], '00000000-0000-4000-8000-000000000002');
  assert.equal(app.post(second).receipt.received, true);
  assert.equal(app.post(first).receipt.received, true);
  assert.equal(app.post(first).receipt.received, true);
  assert.equal(app.state.sheets[0].getLastRow(), 3);
  assert.equal(app.state.sheets[0].getRange(2, 1, 2, 1).getValues().flat().join(','), 'Sara,Pau');
  assert.equal(app.post({ ...first, guests: [guest('Altra persona')] }).receipt.error, 'REQUEST_CONFLICT');
});

test('Rebutja peticions invàlides i bloquejos ocupats sense escriure ni confirmar èxit', () => {
  const app = backend(); app.context.setupSpreadsheet();
  for (const guests of [[guest('')], [guest('A', 'invalid')], [guest('A', 'none', 'true')], Array.from({ length: 51 }, () => guest('A'))]) {
    assert.equal(app.post(app.request(guests)).receipt.received, false);
  }
  assert.equal(app.state.sheets[0].getLastRow(), 1);
  app.state.busy = true;
  assert.equal(app.post(app.request([guest('A')])).receipt.error, 'BUSY');
  app.state.busy = false;
  assert.equal(app.post({ ...app.request([guest('A')]), replyTo: 'https://evil.example' }).receipt, undefined);
  assert.equal(app.state.sheets[0].getLastRow(), 1);
});
