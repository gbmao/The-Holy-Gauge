import assert from 'node:assert/strict';
import test from 'node:test';
import initSqlJs from 'sql.js';
import { Capacitor } from '@capacitor/core';
import { vehicleApi } from '../js/api.js';
import { DATABASE_MIGRATIONS } from '../js/database/migrations.js';
import { SqliteRefuellingRepository } from '../js/repositories/sqlite-refuelling-repository.js';
import { SqliteMaintenanceRepository } from '../js/repositories/sqlite-maintenance-repository.js';
import { VehicleRequiredError } from '../js/vehicle-required-error.js';
import { createBottomSheet } from '../js/bottom-sheet.js';

const SQL = await initSqlJs();
const repositories = [
  ['abastecimento', SqliteRefuellingRepository, 'REFUELLING', {
    liters: 5, mileage: 100, gasPrice: 6, blFullTank: true,
    occurredAt: '2026-11-22T12:00:00.000Z',
  }],
  ['manutenção', SqliteMaintenanceRepository, 'MAINTENANCE', {
    description: 'Troca de óleo', kilometers: 100, cost: 50,
    date: '2026-11-22T12:00:00.000Z',
  }],
];

function databaseFixture(t, Repository) {
  const db = new SQL.Database();
  t.after(() => db.close());
  db.run('PRAGMA foreign_keys = ON');
  for (const migration of DATABASE_MIGRATIONS) {
    for (const statement of migration.statements) db.run(statement);
  }
  const connection = {
    beforeInsert: null,
    async query(sql, values = []) {
      const statement = db.prepare(sql);
      try {
        statement.bind(values);
        const rows = [];
        while (statement.step()) rows.push(statement.getAsObject());
        return { values: rows };
      } finally {
        statement.free();
      }
    },
    async run(sql, values) {
      connection.beforeInsert?.();
      db.run(sql, values);
      return { changes: {
        changes: db.getRowsModified(),
        lastId: db.exec('SELECT last_insert_rowid()')[0].values[0][0],
      } };
    },
  };
  return { db, connection, repository: new Repository(async () => connection) };
}

for (const [name, Repository, table, record] of repositories) {
  for (const [scenario, vehicleSql] of [
    ['sem veículos cadastrados', null],
    ['com veículo ativo, mas sem seleção', "INSERT INTO VEHICLE (NAME) VALUES ('Moto')"],
    ['com seleção em veículo inativo', "INSERT INTO VEHICLE (NAME, CD_STATUS, IS_SELECTED) VALUES ('Moto', 0, 1)"],
  ]) {
    test(`${name}: impede gravação ${scenario}`, async (t) => {
      const { db, repository } = databaseFixture(t, Repository);
      if (vehicleSql) db.run(vehicleSql);
      await assert.rejects(repository.create(record), VehicleRequiredError);
      assert.equal(db.exec(`SELECT COUNT(*) FROM ${table}`)[0].values[0][0], 0);
    });
  }

  test(`${name}: salva no veículo ativo selecionado e mantém o histórico isolado`, async (t) => {
    const { db, repository, connection } = databaseFixture(t, Repository);
    db.run("INSERT INTO VEHICLE (NAME, IS_SELECTED) VALUES ('Outra moto', 0), ('Moto em uso', 1)");
    const saved = await repository.create(record);
    assert.ok(saved.id > 0);
    assert.deepEqual((await connection.query(`SELECT VEHICLE_ID AS vehicleId FROM ${table}`)).values, [{ vehicleId: 2 }]);
    t.mock.method(Capacitor, 'isNativePlatform', () => true);
    t.mock.method(vehicleApi, 'getSelectedId', async () => (
      (await connection.query('SELECT VEHICLE_ID AS id FROM VEHICLE WHERE CD_STATUS = 1 AND IS_SELECTED = 1')).values[0]?.id ?? null
    ));
    const history = () => table === 'REFUELLING' ? repository.getAll() : repository.getAllMaintenances();
    assert.equal((await history()).length, 1);
    db.run('UPDATE VEHICLE SET IS_SELECTED = CASE WHEN VEHICLE_ID = 1 THEN 1 ELSE 0 END');
    assert.deepEqual(await history(), []);
    db.run('UPDATE VEHICLE SET IS_SELECTED = CASE WHEN VEHICLE_ID = 2 THEN 1 ELSE 0 END');
    assert.equal((await history()).length, 1);
  });

  for (const [scenario, changeSql] of [
    ['inativado', 'UPDATE VEHICLE SET CD_STATUS = 0 WHERE VEHICLE_ID = 1'],
    ['desmarcado', 'UPDATE VEHICLE SET IS_SELECTED = 0 WHERE VEHICLE_ID = 1'],
  ]) {
    test(`${name}: impede gravação se o veículo for ${scenario} entre a consulta e o INSERT`, async (t) => {
      const { db, repository, connection } = databaseFixture(t, Repository);
      db.run("INSERT INTO VEHICLE (NAME, IS_SELECTED) VALUES ('Moto', 1)");
      connection.beforeInsert = () => db.run(changeSql);
      await assert.rejects(repository.create(record), VehicleRequiredError);
      assert.equal(db.exec(`SELECT COUNT(*) FROM ${table}`)[0].values[0][0], 0);
    });
  }

  test(`${name}: preserva registros antigos sem veículo`, async (t) => {
    const { db, repository } = databaseFixture(t, Repository);
    const legacySql = table === 'REFUELLING'
      ? "INSERT INTO REFUELLING (Liters, VEHICLE_ID) VALUES (2, NULL)"
      : "INSERT INTO MAINTENANCE (Description, VEHICLE_ID) VALUES ('Registro antigo', NULL)";
    db.run(legacySql);
    await assert.rejects(repository.create(record), VehicleRequiredError);
    assert.equal(db.exec(`SELECT COUNT(*) FROM ${table} WHERE VEHICLE_ID IS NULL`)[0].values[0][0], 1);
  });

  test(`${name}: uma falha ao consultar a seleção impede gravar e mantém o erro de banco`, async (t) => {
    const { db, repository, connection } = databaseFixture(t, Repository);
    connection.query = async () => ({ message: 'Falha de leitura' });
    await assert.rejects(repository.create(record), /Falha de leitura/);
    assert.equal(db.exec(`SELECT COUNT(*) FROM ${table}`)[0].values[0][0], 0);
  });
}

// Small event/element fixture; the handlers and submission flow are the real ones.
function element() {
  const listeners = new Map();
  const classes = new Set();
  return {
    hidden: false, disabled: false, textContent: '', value: 'dados preenchidos',
    classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name) },
    addEventListener(name, handler) { listeners.set(name, handler); },
    async emit(name) { await listeners.get(name)?.({ preventDefault() {} }); },
    setAttribute() {}, append() {}, replaceChildren() {}, focus() {},
  };
}

function sheetFixture(t, recordType, { beforeAdd, addRecord }) {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  globalThis.window = new EventTarget();
  globalThis.document = { createElement: element };
  t.after(() => {
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
  });
  const form = element();
  let resets = 0;
  form.reset = () => { resets += 1; };
  const addButton = element();
  const feedback = element();
  let notices = 0;
  const sheet = createBottomSheet({
    appShell: element(), sheet: element(), openButton: element(), closeButton: element(),
    loading: element(), historyElement: element(), emptyState: element(),
    errorState: element(), retryButton: element(), addButton, addLabel: element(),
    feedback, form, api: { loadHistory: async () => [], addRecord },
    recordType, recordConfig: { stats: [] },
    buildPayload: () => ({ description: 'Troca de óleo', liters: 5 }),
    beforeAdd, onVehicleRequired: () => { notices += 1; },
  });
  return { sheet, form, addButton, feedback, notices: () => notices, resets: () => resets };
}

for (const recordType of ['fueling', 'maintenance']) {
  test(`interface ${recordType}: avisa antes de salvar e permite nova tentativa após selecionar`, async (t) => {
    let selected = false;
    let writes = 0;
    const f = sheetFixture(t, recordType, {
      beforeAdd: async () => { if (!selected) throw new VehicleRequiredError(); },
      addRecord: async () => { writes += 1; return { id: 1 }; },
    });
    await f.sheet.loadHistory();
    await f.form.emit('submit');
    assert.equal(writes, 0);
    assert.equal(f.notices(), 1);
    assert.match(f.feedback.textContent, /Cadastre e selecione/);
    assert.equal(f.resets(), 0);
    assert.equal(f.form.value, 'dados preenchidos');
    assert.equal(f.addButton.disabled, false);
    selected = true;
    await f.form.emit('submit');
    assert.equal(writes, 1);
  });

  test(`interface ${recordType}: também avisa se o repositório recusar após a verificação inicial`, async (t) => {
    const f = sheetFixture(t, recordType, {
      beforeAdd: async () => {},
      addRecord: async () => { throw new VehicleRequiredError(); },
    });
    await f.sheet.loadHistory();
    await f.form.emit('submit');
    assert.equal(f.notices(), 1);
    assert.equal(f.resets(), 0);
    assert.equal(f.addButton.disabled, false);
  });
}
