import assert from 'node:assert/strict';
import test from 'node:test';
import initSqlJs from 'sql.js';
import { Capacitor } from '@capacitor/core';
import { vehicleApi } from '../js/api.js';
import { DATABASE_MIGRATIONS } from '../js/database/migrations.js';
import { SqliteMaintenanceRepository } from '../js/repositories/sqlite-maintenance-repository.js';
import { SqliteRefuellingRepository } from '../js/repositories/sqlite-refuelling-repository.js';
import { MaintenanceService } from '../js/services/maintenance-service.js';

const SQL = await initSqlJs();
const input = {
  description: 'Troca de óleo', date: '2026-11-02', cost: 100,
  kilometers: 1000, nextKilometers: 2000, nextDate: '2026-12-02', notes: 'Óleo e filtro',
};

function connectionFor(db) {
  return {
    async query(sql, values = []) {
      const statement = db.prepare(sql);
      try {
        statement.bind(values);
        const rows = [];
        while (statement.step()) rows.push(statement.getAsObject());
        return { values: rows };
      } finally { statement.free(); }
    },
    async run(sql, values) {
      db.run(sql, values);
      return { changes: {
        changes: db.getRowsModified(), lastId: db.exec('SELECT last_insert_rowid()')[0].values[0][0],
      } };
    },
  };
}

function fixture(t) {
  const db = new SQL.Database();
  t.after(() => db.close());
  db.run('PRAGMA foreign_keys = ON');
  for (const migration of DATABASE_MIGRATIONS) {
    for (const statement of migration.statements) db.run(statement);
  }
  db.run("INSERT INTO VEHICLE (NAME, IS_SELECTED) VALUES ('Moto', 1), ('Outra', 0)");
  const connection = connectionFor(db);
  t.mock.method(Capacitor, 'isNativePlatform', () => true);
  t.mock.method(vehicleApi, 'getSelectedId', async () => (
    (await connection.query('SELECT VEHICLE_ID AS id FROM VEHICLE WHERE CD_STATUS = 1 AND IS_SELECTED = 1')).values[0]?.id ?? null
  ));
  const repository = new SqliteMaintenanceRepository(async () => connection);
  const expenses = new SqliteRefuellingRepository(async () => connection);
  return { db, connection, repository, expenses, service: new MaintenanceService(repository) };
}

test('manutenção: edição persiste ao reabrir SQLite, mantendo o ID e atualizando custo, mês e próxima revisão', async (t) => {
  const { db, service, expenses } = fixture(t);
  const original = await service.create(input);
  const older = await service.create({ ...input, date: '2026-11-01', cost: 50 });
  db.run("INSERT INTO REFUELLING (Liters, Gas_price, Mileage, VEHICLE_ID, Dh_refuelling) VALUES (10, 6, 5000, 1, '2026-11-24')");
  assert.equal(await expenses.getMonthlyExpense(11, 2026), 210);
  const saved = await service.update(original.id, {
    ...input, description: ' Revisão corrigida ', cost: 200, date: '2026-10-20',
    kilometers: 900, nextKilometers: 1500, nextDate: '2026-11-20', notes: ' Corrigido ',
    id: 99, vehicleId: 2, status: 0,
  });
  assert.equal(saved.id, original.id);
  assert.equal(saved.description, 'Revisão corrigida');
  assert.equal(saved.kilometers, 900);
  assert.equal(saved.nextKilometers, 1500);
  assert.equal(saved.notes, 'Corrigido');
  assert.equal(await expenses.getMonthlyExpense(11, 2026), 110);
  assert.equal(await expenses.getMonthlyExpense(10, 2026), 200);
  assert.deepEqual((await service.getAllMaintenances()).map((record) => record.id), [older.id, original.id]);
  const reopened = new SQL.Database(db.export());
  t.after(() => reopened.close());
  const reopenedRepository = new SqliteMaintenanceRepository(async () => connectionFor(reopened));
  assert.deepEqual(await reopenedRepository.getById(original.id), saved);
  assert.equal(reopened.exec('SELECT COUNT(*) FROM MAINTENANCE')[0].values[0][0], 2);
  assert.equal(reopened.exec('SELECT VEHICLE_ID FROM MAINTENANCE WHERE Maintenance_ID = 1')[0].values[0][0], 1);
});

test('manutenção: excluir e recuperar persiste, altera histórico recente e gasto sem perder dados da revisão', async (t) => {
  const { db, service, repository, expenses } = fixture(t);
  const record = await service.create(input);
  assert.equal(await expenses.getMonthlyExpense(11, 2026), 100);
  await service.delete(record.id);
  assert.deepEqual(await service.getAllMaintenances(), []);
  assert.deepEqual(await repository.getRecentMaintenances(), []);
  assert.equal(await repository.getById(record.id), null);
  assert.equal(await expenses.getMonthlyExpense(11, 2026), 0);
  const reopened = new SQL.Database(db.export());
  t.after(() => reopened.close());
  const reopenedRepository = new SqliteMaintenanceRepository(async () => connectionFor(reopened));
  const reopenedService = new MaintenanceService(reopenedRepository);
  assert.deepEqual(await reopenedService.getDeletedMaintenances(), [record]);
  assert.deepEqual(await reopenedService.getAllMaintenances(), []);
  await reopenedService.restore(record.id);
  assert.deepEqual(await reopenedRepository.getRecentMaintenances(), [record]);
  assert.deepEqual(await reopenedService.getDeletedMaintenances(), []);
  const reopenedExpenses = new SqliteRefuellingRepository(async () => connectionFor(reopened));
  assert.equal(await reopenedExpenses.getMonthlyExpense(11, 2026), 100);
  const restored = new SQL.Database(reopened.export());
  t.after(() => restored.close());
  assert.deepEqual(await new SqliteMaintenanceRepository(async () => connectionFor(restored)).getById(record.id), record);
});

test('manutenção: permite limpar campos opcionais sem preencher com a quilometragem atual', async (t) => {
  const { service } = fixture(t);
  const record = await service.create(input);
  const saved = await service.update(record.id, { description: 'Revisão', date: input.date });
  for (const name of ['cost', 'kilometers', 'nextKilometers', 'nextDate', 'notes']) assert.equal(saved[name], null);
});

for (const [name, changes] of [
  ['descrição vazia', { description: ' ' }],
  ['custo negativo', { cost: -1 }],
  ['custo não numérico', { cost: '100' }],
  ['quilometragem fracionária', { kilometers: 1.5 }],
  ['próxima quilometragem anterior', { nextKilometers: 999 }],
  ['próxima data anterior', { nextDate: '2026-11-01' }],
  ['data inexistente', { date: '2026-02-30' }],
]) {
  test(`manutenção: rejeita ${name} sem alterar o banco`, async (t) => {
    const { service, db } = fixture(t);
    const record = await service.create(input);
    const before = db.exec('SELECT * FROM MAINTENANCE');
    await assert.rejects(service.update(record.id, { ...input, ...changes }));
    assert.deepEqual(db.exec('SELECT * FROM MAINTENANCE'), before);
  });
}

test('manutenção: cadastro e edição antigos usam sua posição no histórico', async (t) => {
  const { service, db } = fixture(t);
  const record = await service.create(input);
  db.run('INSERT INTO REFUELLING (Liters, Mileage, VEHICLE_ID) VALUES (5, 5000, 1)');
  await service.update(record.id, { ...input, kilometers: 800 });
  assert.equal((await service.create(input)).kilometers, 1000);
  await assert.rejects(service.create({ ...input, date: '2099-01-01', nextDate: null }), /anterior/);
});

test('manutenção: não preenche odômetro ausente nem usa odômetro atual para limitar próxima revisão antiga', async (t) => {
  const { service, db } = fixture(t);
  db.run("INSERT INTO REFUELLING (Liters, Mileage, VEHICLE_ID, Dh_refuelling) VALUES (5, 5000, 1, '2026-11-24')");
  const record = await service.create({ description: 'Revisão antiga', date: '2026-10-10', nextKilometers: 2000 });
  assert.equal(record.kilometers, null);
  assert.equal(record.nextKilometers, 2000);
  assert.equal(record.date.slice(0, 10), '2026-10-10');
});

for (const id of [0, -1, 1.5, '1', null, 99]) {
  test(`manutenção: ID inválido ou inexistente ${String(id)} não modifica registros`, async (t) => {
    const { service, db } = fixture(t);
    await service.create(input);
    const before = db.exec('SELECT * FROM MAINTENANCE');
    await assert.rejects(service.update(id, input));
    await assert.rejects(service.delete(id));
    await assert.rejects(service.restore(id));
    assert.deepEqual(db.exec('SELECT * FROM MAINTENANCE'), before);
  });
}

test('manutenção: outro veículo, veículo inativo ou sem seleção não pode editar, excluir ou recuperar', async (t) => {
  const { db, service, repository } = fixture(t);
  const record = await service.create(input);
  const deleted = await service.create(input);
  await service.delete(deleted.id);
  const before = db.exec('SELECT * FROM MAINTENANCE');
  for (const selection of [
    'UPDATE VEHICLE SET IS_SELECTED = CASE WHEN VEHICLE_ID = 2 THEN 1 ELSE 0 END',
    'UPDATE VEHICLE SET IS_SELECTED = 0',
    'UPDATE VEHICLE SET CD_STATUS = 0, IS_SELECTED = 1 WHERE VEHICLE_ID = 1',
  ]) {
    db.run(selection);
    assert.equal(await repository.getById(record.id), null);
    assert.deepEqual(await service.getAllMaintenances(), []);
    assert.deepEqual(await service.getDeletedMaintenances(), []);
    await assert.rejects(service.update(record.id, input));
    await assert.rejects(service.delete(record.id));
    await assert.rejects(service.restore(deleted.id));
    assert.deepEqual(db.exec('SELECT * FROM MAINTENANCE'), before);
  }
});

test('manutenção: registro excluído não pode ser editado ou excluído novamente; ativo não pode ser recuperado', async (t) => {
  const { service, db } = fixture(t);
  const record = await service.create(input);
  await assert.rejects(service.restore(record.id));
  await service.delete(record.id);
  const before = db.exec('SELECT * FROM MAINTENANCE');
  await assert.rejects(service.update(record.id, input));
  await assert.rejects(service.delete(record.id));
  assert.deepEqual(db.exec('SELECT * FROM MAINTENANCE'), before);
});

test('manutenção: falha SQLite não informa sucesso ao editar, excluir ou recuperar', async (t) => {
  const { service, connection, db } = fixture(t);
  const record = await service.create(input);
  const before = db.exec('SELECT * FROM MAINTENANCE');
  connection.run = async () => ({ changes: { changes: -1 }, message: 'Falha de gravação' });
  await assert.rejects(service.update(record.id, input), /Falha de gravação/);
  await assert.rejects(service.delete(record.id), /Falha de gravação/);
  await assert.rejects(service.restore(record.id), /Falha de gravação/);
  assert.deepEqual(db.exec('SELECT * FROM MAINTENANCE'), before);
});

for (const operation of ['update', 'delete', 'restore']) {
  test(`manutenção: ${operation} recusa seleção removida entre consulta e gravação`, async (t) => {
    const { service, connection, db } = fixture(t);
    const record = await service.create(input);
    if (operation === 'restore') await service.delete(record.id);
    const before = db.exec('SELECT * FROM MAINTENANCE');
    const run = connection.run;
    connection.run = async (sql, values) => {
      db.run('UPDATE VEHICLE SET IS_SELECTED = 0');
      return run(sql, values);
    };
    await assert.rejects(service[operation](record.id, input));
    assert.deepEqual(db.exec('SELECT * FROM MAINTENANCE'), before);
  });
}

const originalDocument = globalThis.document;
globalThis.document = { querySelector: () => null };
const { ManutencaoGeralPage } = await import('../pages/manutencao-geral-page.js');
globalThis.document = originalDocument;

function element() {
  const listeners = new Map();
  let value = '';
  return {
    hidden: false, disabled: false, textContent: '', children: [], dataset: {}, attributes: {}, open: false,
    get value() { return value; }, set value(next) { value = String(next); },
    setAttribute(name, next) { this.attributes[name] = next; },
    addEventListener(name, handler) { listeners.set(name, handler); },
    async emit(name) {
      const event = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
      await listeners.get(name)?.(event);
      return event;
    },
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; },
    showModal() { this.open = true; },
    close() { this.open = false; listeners.get('close')?.(); },
  };
}

const uiRecord = { ...input, id: 1, date: '2026-11-02T12:00:00.000Z', nextDate: '2026-12-02T12:00:00.000Z' };

function pageFixture(t, overrides = {}) {
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  globalThis.document = { createElement: element };
  globalThis.window = { addEventListener() {} };
  t.after(() => { globalThis.document = previousDocument; globalThis.window = previousWindow; });
  t.mock.method(console, 'error', () => {});
  const elements = new Map();
  const get = (selector) => {
    if (!elements.has(selector)) elements.set(selector, element());
    return elements.get(selector);
  };
  const fields = Object.fromEntries(Object.keys(input).map((name) => [name, element()]));
  const form = get('[data-edit-form]');
  form.elements = { namedItem: (name) => fields[name] };
  form.reportValidity = () => true;
  form.reset = () => Object.values(fields).forEach((field) => { field.value = ''; });
  const api = {
    loadAllHistory: async () => [uiRecord], loadDeletedHistory: async () => [],
    getById: async () => uiRecord, update: async () => uiRecord,
    delete: async () => true, restore: async () => true,
    ...overrides,
  };
  return { page: new ManutencaoGeralPage({ querySelector: get }, api), get, fields, form };
}

test('tela manutenção: oferece edição e exclusão nos registros ativos', async (t) => {
  const f = pageFixture(t);
  await f.page.loadPromise;
  const actions = f.get('[data-record-list]').children[0].children.at(-1).children;
  assert.deepEqual(actions.map((action) => action.textContent), ['Editar', 'Excluir']);
});

test('tela manutenção: preenche valores numéricos, mantém datas e salva edição sem criar registro', async (t) => {
  const calls = [];
  const f = pageFixture(t, { update: async (id, data) => { calls.push({ id, data }); return uiRecord; } });
  await f.page.loadPromise;
  await f.page.openEdit(uiRecord);
  assert.equal(f.fields.cost.value, '100');
  assert.equal(f.fields.date.value, '2026-11-02');
  f.fields.description.value = 'Óleo corrigido';
  f.fields.cost.value = '150.50';
  f.fields.nextKilometers.value = '';
  await f.form.emit('submit');
  assert.deepEqual(calls, [{ id: 1, data: {
    ...input, date: uiRecord.date, nextDate: uiRecord.nextDate,
    description: 'Óleo corrigido', cost: 150.5, nextKilometers: null,
  } }]);
  assert.equal(f.get('[data-edit-dialog]').open, false);
  assert.match(f.get('[data-feedback]').textContent, /atualizada/);
});

test('tela manutenção: cancelar exclusão não grava; confirmar remove registro e permite recuperá-lo', async (t) => {
  let deleted = false;
  let deleteCalls = 0;
  const f = pageFixture(t, {
    loadAllHistory: async () => deleted ? [] : [uiRecord],
    loadDeletedHistory: async () => deleted ? [uiRecord] : [],
    delete: async () => { deleteCalls += 1; deleted = true; return true; },
    restore: async () => { deleted = false; return true; },
  });
  await f.page.loadPromise;
  f.page.askDelete(uiRecord);
  await f.get('[data-cancel-delete]').emit('click');
  await f.get('[data-confirm-delete]').emit('click');
  assert.equal(deleteCalls, 0);
  assert.equal(f.get('[data-record-list]').children.length, 1);
  f.page.askDelete(uiRecord);
  await f.get('[data-confirm-delete]').emit('click');
  assert.equal(deleteCalls, 1);
  assert.equal(f.get('[data-record-list]').children.length, 0);
  await f.page.changeFilter(true);
  const [restoreButton] = f.get('[data-record-list]').children[0].children.at(-1).children;
  assert.equal(restoreButton.textContent, 'Recuperar');
  await restoreButton.emit('click');
  assert.equal(f.get('[data-record-list]').children.length, 0);
  await f.page.changeFilter(false);
  assert.equal(f.get('[data-record-list]').children.length, 1);
});

test('tela manutenção: falha de edição preserva formulário e permite tentar novamente', async (t) => {
  let attempts = 0;
  const f = pageFixture(t, { update: async () => { if (++attempts === 1) throw new Error('Falha de gravação'); return uiRecord; } });
  await f.page.loadPromise;
  await f.page.openEdit(uiRecord);
  f.fields.description.value = 'Correção';
  await f.form.emit('submit');
  assert.equal(f.fields.description.value, 'Correção');
  assert.equal(f.get('[data-edit-dialog]').open, true);
  assert.equal(f.get('[data-save]').disabled, false);
  assert.match(f.get('[data-edit-error]').textContent, /Falha de gravação/);
  await f.form.emit('submit');
  assert.equal(f.get('[data-edit-dialog]').open, false);
});

test('tela manutenção: falha de exclusão mantém confirmação aberta e registro na lista', async (t) => {
  const f = pageFixture(t, { delete: async () => { throw new Error('Falha de gravação'); } });
  await f.page.loadPromise;
  f.page.askDelete(uiRecord);
  await f.page.deleteRecord();
  assert.equal(f.get('[data-delete-dialog]').open, true);
  assert.equal(f.get('[data-confirm-delete]').disabled, false);
  assert.match(f.get('[data-delete-error]').textContent, /Falha de gravação/);
  assert.equal(f.get('[data-record-list]').children.length, 1);
});

test('tela manutenção: falha de carregamento bloqueia salvar e oferece nova tentativa', async (t) => {
  let attempts = 0;
  const f = pageFixture(t, { getById: async () => { if (++attempts === 1) throw new Error('Falha de leitura'); return uiRecord; } });
  await f.page.loadPromise;
  await f.page.openEdit(uiRecord);
  assert.equal(f.get('[data-save]').disabled, true);
  assert.equal(f.get('[data-retry-edit]').hidden, false);
  await f.get('[data-retry-edit]').emit('click');
  assert.equal(f.get('[data-save]').disabled, false);
});

test('tela manutenção: resposta antiga não preenche formulário de outra manutenção', async (t) => {
  let complete;
  const other = { ...uiRecord, id: 2, description: 'Freios' };
  const f = pageFixture(t, { getById: async (id) => id === 1 ? new Promise((resolve) => { complete = resolve; }) : other });
  await f.page.loadPromise;
  const firstLoad = f.page.openEdit(uiRecord);
  f.get('[data-edit-dialog]').close();
  await f.page.openEdit(other);
  complete(uiRecord);
  await firstLoad;
  assert.equal(f.fields.description.value, 'Freios');
  assert.equal(f.page.editingRecord.id, 2);
});

for (const operation of ['editar', 'excluir', 'recuperar']) {
  test(`tela manutenção: bloqueia envio duplicado e fechamento durante ${operation}`, async (t) => {
    let complete;
    let calls = 0;
    const pending = () => { calls += 1; return new Promise((resolve) => { complete = resolve; }); };
    const f = pageFixture(t, { update: pending, delete: pending, restore: pending });
    await f.page.loadPromise;
    let action;
    let dialog;
    if (operation === 'editar') {
      await f.page.openEdit(uiRecord);
      action = () => f.page.saveEdit();
      dialog = f.get('[data-edit-dialog]');
    } else if (operation === 'excluir') {
      f.page.askDelete(uiRecord);
      action = () => f.page.deleteRecord();
      dialog = f.get('[data-delete-dialog]');
    } else {
      action = () => f.page.restoreRecord(uiRecord, element());
    }
    const first = action();
    await action();
    assert.equal(calls, 1);
    if (dialog) assert.equal((await dialog.emit('cancel')).defaultPrevented, true);
    complete(true);
    await first;
  });
}
