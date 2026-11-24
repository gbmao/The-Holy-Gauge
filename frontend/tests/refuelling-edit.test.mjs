import assert from 'node:assert/strict';
import test from 'node:test';
import initSqlJs from 'sql.js';
import { Capacitor } from '@capacitor/core';
import { vehicleApi } from '../js/api.js';
import { DATABASE_MIGRATIONS } from '../js/database/migrations.js';
import { SqliteRefuellingRepository } from '../js/repositories/sqlite-refuelling-repository.js';
import { RefuellingService } from '../js/services/refuelling-service.js';
import { SqliteMaintenanceRepository } from '../js/repositories/sqlite-maintenance-repository.js';
import { MaintenanceService } from '../js/services/maintenance-service.js';

const SQL = await initSqlJs();
const input = {
  liters: 10, gasPrice: 6, mileage: 1000, blAdditive: false,
  blFullTank: true, occurredAt: '2026-11-02T15:00:00.000Z',
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
  db.run("INSERT INTO VEHICLE (NAME, IS_SELECTED) VALUES ('Moto', 1), ('Outra moto', 0)");
  const connection = connectionFor(db);
  t.mock.method(Capacitor, 'isNativePlatform', () => true);
  t.mock.method(vehicleApi, 'getSelectedId', async () => (
    (await connection.query('SELECT VEHICLE_ID AS id FROM VEHICLE WHERE CD_STATUS = 1 AND IS_SELECTED = 1')).values[0]?.id ?? null
  ));
  const repository = new SqliteRefuellingRepository(async () => connection);
  const service = new RefuellingService(repository);
  const add = (mileage, day, changes = {}) => service.create({
    ...input, mileage, occurredAt: `2026-11-${String(day).padStart(2, '0')}T15:00:00.000Z`, ...changes,
  });
  return { db, connection, repository, service, add };
}

test('excluir abastecimento: retira custo e atualiza par consecutivo do consumo, persistindo ao reabrir', async (t) => {
  const { db, service, repository, add } = fixture(t);
  const first = await add(1000, 1);
  const partial = await add(1100, 2, { blFullTank: false, liters: 5 });
  const last = await add(1300, 3);
  assert.equal(await repository.getMonthlyExpense(11, 2026), 150);
  assert.equal(await repository.getAverageConsumption(), null);
  await service.delete(partial.id);
  assert.equal(await repository.getMonthlyExpense(11, 2026), 120);
  assert.equal(await repository.getAverageConsumption(), 30);
  assert.deepEqual((await repository.getAll()).map((record) => record.id), [last.id, first.id]);
  assert.equal(await repository.getById(partial.id), null);
  const reopened = new SQL.Database(db.export());
  t.after(() => reopened.close());
  const reopenedRepository = new SqliteRefuellingRepository(async () => connectionFor(reopened));
  assert.equal(await reopenedRepository.getMonthlyExpense(11, 2026), 120);
  assert.equal(await reopenedRepository.getAverageConsumption(), 30);
  assert.deepEqual((await reopenedRepository.getRecent()).map((record) => record.id), [last.id, first.id]);
  assert.equal(reopened.exec('SELECT Cd_status FROM REFUELLING WHERE Refuelling_id = 2')[0].values[0][0], 0);
});

test('excluir último abastecimento: indicadores usam os registros ativos restantes', async (t) => {
  const { service, repository, add } = fixture(t);
  const first = await add(1000, 1);
  await add(1200, 2);
  const last = await add(1500, 3);
  assert.equal(await repository.getTotalKm(), 1500);
  assert.equal(await repository.getAverageConsumption(), 30);
  await service.delete(last.id);
  assert.equal(await repository.getTotalKm(), 1200);
  assert.equal(await repository.getAverageConsumption(), 20);
  await service.delete(2);
  assert.equal(await repository.getAverageConsumption(), null);
  await service.delete(first.id);
  assert.equal(await repository.getTotalKm(), 0);
  assert.equal(await repository.getMonthlyExpense(11, 2026), 0);
});

test('excluir abastecimento: protege outro veículo, veículo inativo e ausência de seleção', async (t) => {
  const { db, repository, service, add } = fixture(t);
  const record = await add(1000, 1);
  const before = db.exec('SELECT * FROM REFUELLING');
  for (const selection of [
    'UPDATE VEHICLE SET IS_SELECTED = CASE WHEN VEHICLE_ID = 2 THEN 1 ELSE 0 END',
    'UPDATE VEHICLE SET IS_SELECTED = 0',
    'UPDATE VEHICLE SET CD_STATUS = 0, IS_SELECTED = 1 WHERE VEHICLE_ID = 1',
  ]) {
    db.run(selection);
    assert.equal(await repository.getById(record.id), null);
    await assert.rejects(service.delete(record.id));
    assert.deepEqual(db.exec('SELECT * FROM REFUELLING'), before);
  }
});

for (const id of [0, -1, 1.5, '1', null]) {
  test(`abastecimento: rejeita ID inválido ${String(id)}`, async (t) => {
    const { service, repository } = fixture(t);
    await assert.rejects(service.getById(id), RangeError);
    await assert.rejects(service.update(id, input), RangeError);
    await assert.rejects(service.delete(id), RangeError);
    await assert.rejects(service.restore(id), RangeError);
    await assert.rejects(repository.update(id, input), RangeError);
    await assert.rejects(repository.softDelete(id), RangeError);
  });
}

test('excluir abastecimento: falha SQLite não informa sucesso nem altera os dados', async (t) => {
  const { db, connection, service, add } = fixture(t);
  const record = await add(1000, 1);
  const before = db.exec('SELECT * FROM REFUELLING');
  connection.run = async () => ({ changes: { changes: -1 }, message: 'Falha de gravação' });
  await assert.rejects(service.delete(record.id), /Falha de gravação/);
  assert.deepEqual(db.exec('SELECT * FROM REFUELLING'), before);
});

for (const operation of ['update', 'restore']) {
  test(`abastecimento: ${operation} preserva os dados e retorna erro se SQLite falhar`, async (t) => {
    const { db, connection, service, add } = fixture(t);
    const record = await add(1000, 1);
    if (operation === 'restore') await service.delete(record.id);
    const before = db.exec('SELECT * FROM REFUELLING');
    connection.run = async () => ({ changes: { changes: -1 }, message: 'Falha de gravação' });
    await assert.rejects(service[operation](record.id, input), /Falha de gravação/);
    assert.deepEqual(db.exec('SELECT * FROM REFUELLING'), before);
  });
}

test('editar abastecimento: persiste ID, vínculo com posto e veículo, mês, custo e nova ordem ao reabrir SQLite', async (t) => {
  const { db, repository, service, add } = fixture(t);
  const first = await add(1000, 1);
  const middle = await add(1200, 2);
  const last = await add(1400, 3);
  db.run("INSERT INTO GAS_STATION (GAS_STATION_ID, NAME, VEHICLE_ID) VALUES (1, 'Posto', 1)");
  db.run('UPDATE REFUELLING SET GAS_STATION_ID = 1 WHERE Refuelling_id = 2');
  const saved = await service.update(middle.id, {
    ...input, occurredAt: '2026-10-31T15:00:00.000Z', mileage: 900, liters: 20, gasPrice: 5.123,
    blAdditive: true, id: 99, vehicleId: 2, gasStationId: 99, status: false,
  });
  assert.equal(saved.id, middle.id);
  assert.equal(saved.vehicleId, 1);
  assert.equal(saved.gasStationId, 1);
  assert.equal(saved.status, true);
  assert.equal(saved.total, 102.46);
  assert.equal(saved.blAdditive, true);
  assert.deepEqual((await repository.getAll()).map((record) => record.id), [last.id, first.id, middle.id]);
  assert.equal(await repository.getMonthlyExpense(11, 2026), 120);
  assert.ok(Math.abs(await repository.getMonthlyExpense(10, 2026) - 102.46) < 1e-8);
  assert.equal(await repository.getAverageConsumption(), 40);
  const reopened = new SQL.Database(db.export());
  t.after(() => reopened.close());
  const reopenedRepository = new SqliteRefuellingRepository(async () => connectionFor(reopened));
  assert.deepEqual(await reopenedRepository.getById(middle.id), saved);
  assert.equal(await reopenedRepository.getTotalKm(), 1400);
  assert.equal(await reopenedRepository.getAverageConsumption(), 40);
  assert.equal(reopened.exec('SELECT COUNT(*) FROM REFUELLING')[0].values[0][0], 3);
});

test('editar último abastecimento: atualiza consumo, gasto e quilometragem sem alterar registros anteriores', async (t) => {
  const { repository, service, add } = fixture(t);
  const first = await add(1000, 1);
  const last = await add(1200, 2);
  await service.update(last.id, { ...input, mileage: 1300, liters: 15, gasPrice: 7 });
  assert.equal(await repository.getAverageConsumption(), 20);
  assert.equal(await repository.getMonthlyExpense(11, 2026), 165);
  assert.equal(await repository.getTotalKm(), 1300);
  assert.equal((await repository.getById(first.id)).mileage, 1000);
  await service.update(last.id, { ...input, mileage: 1300, blFullTank: false });
  assert.equal(await repository.getAverageConsumption(), null);
});

test('editar abastecimento: permite limpar opcionais e preservar informações de tanque/combustível desconhecidas', async (t) => {
  const { repository, service, add } = fixture(t);
  await add(1000, 1);
  const last = await add(1200, 2);
  const saved = await service.update(last.id, { ...input, mileage: null, gasPrice: null, blFullTank: null, blAdditive: null });
  assert.equal(saved.mileage, null);
  assert.equal(saved.gasPrice, null);
  assert.equal(saved.blFullTank, null);
  assert.equal(saved.blAdditive, null);
  assert.equal(saved.total, null);
  assert.equal(await repository.getAverageConsumption(), null);
  assert.equal(await repository.getTotalKm(), 1000);
  await assert.rejects(service.create({ ...input, blFullTank: null }), /tanque/);
});

for (const [name, changes, message] of [
  ['igual ao anterior', { mileage: 1000 }, /anterior/],
  ['menor que o anterior', { mileage: 900 }, /anterior/],
  ['igual ao posterior', { mileage: 1400 }, /posterior/],
  ['maior que o posterior', { mileage: 1500 }, /posterior/],
  ['data antes de odômetro menor', { mileage: 1200, occurredAt: '2026-10-01T15:00:00.000Z' }, /posterior/],
  ['data após odômetro maior', { mileage: 1200, occurredAt: '2026-12-01T15:00:00.000Z' }, /anterior/],
]) {
  test(`cronologia: rejeita ${name} sem alterar nenhum registro`, async (t) => {
    const { db, service, add } = fixture(t);
    await add(1000, 1);
    const middle = await add(1200, 2);
    await add(1400, 3);
    const before = db.exec('SELECT * FROM REFUELLING');
    await assert.rejects(service.update(middle.id, { ...input, ...changes }), message);
    assert.deepEqual(db.exec('SELECT * FROM REFUELLING'), before);
  });
}

test('cronologia: compara os vizinhos com odômetro, sem pular registros no cálculo de consumo', async (t) => {
  const { repository, service, add } = fixture(t);
  await add(1000, 1);
  await add(null, 2);
  const middle = await add(1200, 3);
  await add(null, 4);
  await add(1400, 5);
  await assert.rejects(service.update(middle.id, { ...input, mileage: 1000, occurredAt: '2026-11-03T15:00:00.000Z' }), /anterior/);
  await assert.rejects(service.update(middle.id, { ...input, mileage: 1400, occurredAt: '2026-11-03T15:00:00.000Z' }), /posterior/);
  await service.update(middle.id, { ...input, mileage: 1300, occurredAt: '2026-11-03T15:00:00.000Z' });
  assert.equal(await repository.getAverageConsumption(), null);
});

test('cronologia: data/hora igual usa o ID para ordenar e validar', async (t) => {
  const { service, repository, add } = fixture(t);
  const occurredAt = '2026-11-01T15:00:00.000Z';
  const first = await add(1000, 1, { occurredAt });
  const middle = await add(1200, 1, { occurredAt });
  const last = await add(1400, 1, { occurredAt });
  await service.update(middle.id, { ...input, occurredAt, mileage: 1300 });
  await assert.rejects(service.update(first.id, { ...input, occurredAt, mileage: 1300 }), /posterior/);
  await assert.rejects(service.update(last.id, { ...input, occurredAt, mileage: 1300 }), /anterior/);
  assert.deepEqual((await repository.getAll()).map((record) => record.id), [last.id, middle.id, first.id]);
  assert.equal(await repository.getAverageConsumption(), 10);
});

test('cronologia: ordena formatos SQLite e ISO e offsets pelo instante real', async (t) => {
  const { db, repository, service } = fixture(t);
  db.run(`INSERT INTO REFUELLING (Liters, Mileage, Bl_full_tank, Dh_refuelling, VEHICLE_ID)
    VALUES (10, 1000, 1, '2026-11-02T11:00:00+03:00', 1),
           (10, 1200, 1, '2026-11-02 09:00:00', 1),
           (10, 1400, 1, '2026-11-02T10:00:00.000Z', 1)`);
  assert.deepEqual((await repository.getAll()).map((record) => record.mileage), [1400, 1200, 1000]);
  assert.equal(await repository.getTotalKm(), 1400);
  assert.equal(await repository.getAverageConsumption(), 20);
  await service.update(2, { ...input, mileage: 1300, occurredAt: '2026-11-02T06:00:00-03:00' });
  await assert.rejects(service.update(2, { ...input, mileage: 900, occurredAt: '2026-11-02T06:00:00-03:00' }), /anterior/);
});

test('cronologia: outros veículos, registros excluídos e dados antigos sem veículo não limitam a edição', async (t) => {
  const { db, service, add } = fixture(t);
  await add(1000, 1);
  const middle = await add(1200, 2);
  const removed = await add(1250, 3);
  await add(1400, 4);
  await service.delete(removed.id);
  db.run(`INSERT INTO REFUELLING (Liters, Mileage, Dh_refuelling, VEHICLE_ID)
    VALUES (10, 5000, '2026-11-02T14:00:00.000Z', 2),
           (10, 5000, '2026-11-02T14:00:00.000Z', NULL)`);
  assert.equal((await service.update(middle.id, { ...input, mileage: 1300 })).mileage, 1300);
});

test('recuperar abastecimento: persiste reativação e devolve custo e influência no consumo', async (t) => {
  const { db, repository, service, add } = fixture(t);
  await add(1000, 1);
  const partial = await add(1100, 2, { blFullTank: false });
  await add(1300, 3);
  await service.delete(partial.id);
  const deleted = await repository.getDeletedById(partial.id);
  assert.equal(await repository.getAverageConsumption(), 30);
  const reopened = new SQL.Database(db.export());
  t.after(() => reopened.close());
  const reopenedRepository = new SqliteRefuellingRepository(async () => connectionFor(reopened));
  const reopenedService = new RefuellingService(reopenedRepository);
  assert.deepEqual(await reopenedService.getDeleted(), [deleted]);
  await reopenedService.restore(partial.id);
  assert.equal(await reopenedRepository.getAverageConsumption(), null);
  assert.equal(await reopenedRepository.getMonthlyExpense(11, 2026), 180);
  assert.deepEqual(await reopenedRepository.getDeleted(), []);
  const restored = new SQL.Database(reopened.export());
  t.after(() => restored.close());
  assert.equal((await new SqliteRefuellingRepository(async () => connectionFor(restored)).getById(partial.id)).status, true);
});

for (const conflict of ['anterior', 'posterior']) {
  test(`recuperação: recusa conflito com o abastecimento ${conflict} após outras edições`, async (t) => {
    const { db, repository, service, add } = fixture(t);
    const first = await add(1000, 1);
    const middle = await add(1200, 2);
    const last = await add(1400, 3);
    await service.delete(middle.id);
    if (conflict === 'anterior') await service.update(first.id, { ...input, occurredAt: first.occurredAt, mileage: 1250 });
    else await service.update(last.id, { ...input, occurredAt: last.occurredAt, mileage: 1150 });
    const before = db.exec('SELECT * FROM REFUELLING');
    await assert.rejects(service.restore(middle.id), new RegExp(`recuperar.*${conflict}`));
    await assert.rejects(repository.restore(middle.id), new RegExp(conflict));
    assert.deepEqual(db.exec('SELECT * FROM REFUELLING'), before);
  });
}

for (const [name, changes] of [
  ['litros zero', { liters: 0 }], ['litros negativos', { liters: -1 }],
  ['litros acima do limite SQLite', { liters: 1000 }], ['litros inválidos', { liters: NaN }],
  ['preço negativo', { gasPrice: -1 }], ['preço acima do limite SQLite', { gasPrice: 1000 }],
  ['quilometragem negativa', { mileage: -1 }], ['quilometragem fracionária', { mileage: 1.5 }],
  ['tanque inválido', { blFullTank: 'sim' }], ['combustível inválido', { blAdditive: 'sim' }],
  ['data inexistente', { occurredAt: '2026-02-30T15:00:00.000Z' }],
  ['data inválida', { occurredAt: 'inválida' }],
]) {
  test(`editar abastecimento: rejeita ${name} sem gravar`, async (t) => {
    const { db, service, add } = fixture(t);
    const record = await add(1000, 1);
    const before = db.exec('SELECT * FROM REFUELLING');
    await assert.rejects(service.update(record.id, { ...input, ...changes }));
    assert.deepEqual(db.exec('SELECT * FROM REFUELLING'), before);
  });
}

test('editar e recuperar abastecimento: não modifica registros de outro veículo ou sem seleção ativa', async (t) => {
  const { db, service, add } = fixture(t);
  const record = await add(1000, 1);
  const deleted = await add(1200, 2);
  await service.delete(deleted.id);
  const before = db.exec('SELECT * FROM REFUELLING');
  for (const selection of [
    'UPDATE VEHICLE SET IS_SELECTED = CASE WHEN VEHICLE_ID = 2 THEN 1 ELSE 0 END',
    'UPDATE VEHICLE SET IS_SELECTED = 0',
    'UPDATE VEHICLE SET CD_STATUS = 0, IS_SELECTED = 1 WHERE VEHICLE_ID = 1',
  ]) {
    db.run(selection);
    await assert.rejects(service.update(record.id, input));
    await assert.rejects(service.restore(deleted.id));
    assert.deepEqual(await service.getDeleted(), []);
    assert.deepEqual(db.exec('SELECT * FROM REFUELLING'), before);
  }
});

test('abastecimento: não recria ID ausente, não edita/exclui inativo e não recupera ativo', async (t) => {
  const { db, service, add } = fixture(t);
  const record = await add(1000, 1);
  await assert.rejects(service.restore(record.id));
  await service.delete(record.id);
  const before = db.exec('SELECT * FROM REFUELLING');
  await assert.rejects(service.update(record.id, input));
  await assert.rejects(service.delete(record.id));
  for (const method of ['update', 'delete', 'restore']) await assert.rejects(service[method](99, input));
  assert.deepEqual(db.exec('SELECT * FROM REFUELLING'), before);
});

for (const operation of ['update', 'delete', 'restore']) {
  test(`abastecimento: ${operation} recusa seleção removida entre consulta e gravação`, async (t) => {
    const { db, connection, service, add } = fixture(t);
    const record = await add(1000, 1);
    if (operation === 'restore') await service.delete(record.id);
    const before = db.exec('SELECT * FROM REFUELLING');
    const run = connection.run;
    connection.run = async (sql, values) => {
      db.run('UPDATE VEHICLE SET IS_SELECTED = 0');
      return run(sql, values);
    };
    await assert.rejects(service[operation](record.id, input));
    assert.deepEqual(db.exec('SELECT * FROM REFUELLING'), before);
  });
}

test('cronologia SQLite: alteração de vizinho após a validação ainda bloqueia gravação incompatível', async (t) => {
  const { db, connection, service, add } = fixture(t);
  await add(1000, 1);
  const middle = await add(1200, 2);
  await add(1400, 3);
  const run = connection.run;
  connection.run = async (sql, values) => {
    db.run('UPDATE REFUELLING SET Mileage = 1250 WHERE Refuelling_id = 3');
    return run(sql, values);
  };
  await assert.rejects(service.update(middle.id, { ...input, mileage: 1300 }), /posterior/);
  assert.equal(db.exec('SELECT Mileage FROM REFUELLING WHERE Refuelling_id = 2')[0].values[0][0], 1200);
});

test('migration 9: preserva dados existentes, protege edição e não impede excluir um registro inválido antigo', async (t) => {
  const db = new SQL.Database();
  t.after(() => db.close());
  for (const migration of DATABASE_MIGRATIONS.filter((item) => item.toVersion < 9)) {
    for (const statement of migration.statements) db.run(statement);
  }
  db.run("INSERT INTO VEHICLE (NAME, IS_SELECTED) VALUES ('Moto', 1)");
  db.run(`INSERT INTO REFUELLING (Liters, Mileage, Dh_refuelling, VEHICLE_ID)
    VALUES (10, 1000, '2026-11-01', 1), (10, 1200, '2026-11-02', 1)`);
  db.run('UPDATE REFUELLING SET Mileage = 900 WHERE Refuelling_id = 2');
  const before = db.exec('SELECT * FROM REFUELLING');
  for (const statement of DATABASE_MIGRATIONS.find((item) => item.toVersion === 9).statements) db.run(statement);
  assert.deepEqual(db.exec('SELECT * FROM REFUELLING'), before);
  assert.throws(() => db.run('UPDATE REFUELLING SET Mileage = 800 WHERE Refuelling_id = 2'), /anterior/);
  db.run('UPDATE REFUELLING SET Cd_status = 0 WHERE Refuelling_id = 2');
  assert.equal(db.exec('SELECT Cd_status FROM REFUELLING WHERE Refuelling_id = 2')[0].values[0][0], 0);
  const existing = db.exec('SELECT * FROM REFUELLING');
  for (const statement of DATABASE_MIGRATIONS.find((item) => item.toVersion === 10).statements) db.run(statement);
  assert.deepEqual(db.exec('SELECT * FROM REFUELLING'), existing);
});

test('evento passado: insere no meio do histórico e calcula consumo pelo antecessor da data informada', async (t) => {
  const { repository, add } = fixture(t);
  await add(1000, 1);
  const last = await add(1400, 3);
  const middle = await add(1200, 2);
  await add(800, 1, { occurredAt: '2026-10-31T15:00:00.000Z' });
  assert.equal(middle.consumptionKmPerLiter, 20);
  assert.equal((await repository.getRecent())[0].id, last.id);
  assert.equal(await repository.getAverageConsumption(), 20);
  assert.equal(await repository.getMonthlyExpense(10, 2026), 60);
  assert.equal(await repository.getMonthlyExpense(11, 2026), 180);
  await assert.rejects(add(1500, 2), /posterior/);
  await assert.rejects(add(900, 2), /anterior/);
  await assert.rejects(add(1200, 2), /anterior/);
});

test('cronologia conjunta: cadastro, edição e recuperação cruzam os dois tipos entre dias diferentes', async (t) => {
  const { connection, service, add } = fixture(t);
  const maintenance = new MaintenanceService(new SqliteMaintenanceRepository(async () => connection));
  const first = await add(1000, 1);
  await add(1400, 3);
  const record = await maintenance.create({ description: 'Revisão', date: '2026-11-02', kilometers: 1200 });
  await assert.rejects(add(900, 4), /anterior/);
  await assert.rejects(maintenance.create({ description: 'Revisão', date: '2026-11-02', kilometers: 1500 }), /posterior/);
  await assert.rejects(service.update(first.id, { ...input, occurredAt: first.occurredAt, mileage: 1300 }), /posterior/);
  await assert.rejects(maintenance.update(record.id, { description: 'Revisão', date: '2026-11-02', kilometers: 900 }), /anterior/);
  await maintenance.delete(record.id);
  await service.update(first.id, { ...input, occurredAt: first.occurredAt, mileage: 1300 });
  await assert.rejects(maintenance.restore(record.id), /anterior/);
});

test('cronologia conjunta: aceita igualdade entre tipos, ignora odômetros ausentes e não ordena manutenção pela hora', async (t) => {
  const { connection, add } = fixture(t);
  const maintenance = new MaintenanceService(new SqliteMaintenanceRepository(async () => connection));
  await add(1000, 1);
  await maintenance.create({ description: 'Mesmo odômetro', date: '2026-11-02', kilometers: 1000 });
  await add(null, 3);
  await add(1001, 4);
  const unknown = await maintenance.create({ description: 'Sem odômetro', date: '2026-11-03' });
  assert.equal(unknown.kilometers, null);
  await maintenance.create({ description: 'Mesmo dia sem hora', date: '2026-11-04', kilometers: 1500 });
  await add(1100, 4, { occurredAt: '2026-11-04T18:00:00.000Z' });
});

test('SQLite: valida também inserções diretas de eventos passados', async (t) => {
  const { db, connection } = fixture(t);
  db.run("INSERT INTO REFUELLING (Liters, Mileage, VEHICLE_ID, Dh_refuelling) VALUES (5, 2000, 1, '2026-11-20')");
  await assert.rejects(connection.run("INSERT INTO MAINTENANCE (Description, KILOMETERS, VEHICLE_ID, MAINTENANCEDATE) VALUES ('Revisão', 2500, 1, '2026-11-10')"), /posterior/);
  await connection.run("INSERT INTO MAINTENANCE (Description, KILOMETERS, VEHICLE_ID, MAINTENANCEDATE) VALUES ('Revisão', 1500, 1, '2026-11-10')");
  await assert.rejects(connection.run("INSERT INTO REFUELLING (Liters, Mileage, VEHICLE_ID, Dh_refuelling) VALUES (5, 1200, 1, '2026-11-15')"), /anterior/);
  const before = db.exec('SELECT * FROM REFUELLING');
  const reopened = new SQL.Database(db.export());
  t.after(() => reopened.close());
  assert.deepEqual(reopened.exec('SELECT * FROM REFUELLING'), before);
});

const originalDocument = globalThis.document;
globalThis.document = { querySelector: () => null };
const { AbastecimentosPage } = await import('../pages/abastecimentos-page.js');
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

const uiRecord = { ...input, id: 1, occurredAt: '2026-11-02T15:00:32.123Z', total: 60 };

function pageFixture(t, overrides = {}) {
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  globalThis.document = { createElement: element };
  const windowListeners = new Map();
  globalThis.window = { addEventListener(name, handler) { windowListeners.set(name, handler); } };
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
  return { page: new AbastecimentosPage({ querySelector: get }, api), get, fields, form, windowListeners };
}

test('tela abastecimento: edição carrega valores numéricos, salva flags e preserva segundos quando não muda a data', async (t) => {
  const calls = [];
  const f = pageFixture(t, { update: async (id, data) => { calls.push({ id, data }); return uiRecord; } });
  await f.page.loadPromise;
  const actions = f.get('[data-record-list]').children[0].children.at(-1).children;
  assert.deepEqual(actions.map((action) => action.textContent), ['Editar', 'Excluir']);
  await f.page.openEdit(uiRecord);
  assert.equal(f.fields.liters.value, '10');
  assert.equal(f.fields.gasPrice.value, '6');
  assert.equal(f.fields.blFullTank.value, 'true');
  assert.equal(f.fields.blAdditive.value, 'false');
  f.fields.liters.value = '12.5';
  f.fields.gasPrice.value = '6.123';
  f.fields.blFullTank.value = 'false';
  f.fields.blAdditive.value = '';
  await f.form.emit('submit');
  assert.deepEqual(calls, [{ id: 1, data: {
    ...input, liters: 12.5, gasPrice: 6.123, blFullTank: false, blAdditive: null, occurredAt: uiRecord.occurredAt,
  } }]);
  assert.equal(f.get('[data-edit-dialog]').open, false);
  assert.match(f.get('[data-feedback]').textContent, /atualizado/);
});

test('tela abastecimento: mudar data/hora envia o instante local convertido para UTC', async (t) => {
  let saved;
  const f = pageFixture(t, { update: async (id, data) => { saved = data; return uiRecord; } });
  await f.page.loadPromise;
  await f.page.openEdit(uiRecord);
  f.fields.occurredAt.value = '2026-10-31T22:15';
  await f.form.emit('submit');
  assert.equal(saved.occurredAt, new Date('2026-10-31T22:15').toISOString());
});

test('tela abastecimento: cancelar exclusão não grava; confirmar exclui e permite recuperar', async (t) => {
  let deleted = false;
  let calls = 0;
  const f = pageFixture(t, {
    loadAllHistory: async () => deleted ? [] : [uiRecord],
    loadDeletedHistory: async () => deleted ? [uiRecord] : [],
    delete: async () => { calls += 1; deleted = true; return true; },
    restore: async () => { deleted = false; return true; },
  });
  await f.page.loadPromise;
  f.page.askDelete(uiRecord);
  await f.get('[data-cancel-delete]').emit('click');
  await f.get('[data-confirm-delete]').emit('click');
  assert.equal(calls, 0);
  f.page.askDelete(uiRecord);
  await f.get('[data-confirm-delete]').emit('click');
  assert.equal(calls, 1);
  assert.equal(f.get('[data-record-list]').children.length, 0);
  await f.page.changeFilter(true);
  const controls = f.get('[data-record-list]').children[0].children.at(-1).children;
  assert.deepEqual(controls.map((control) => control.textContent), ['Recuperar']);
  await controls[0].emit('click');
  assert.equal(f.get('[data-record-list]').children.length, 0);
  await f.page.changeFilter(false);
  assert.equal(f.get('[data-record-list]').children.length, 1);
});

test('tela abastecimento: conflito de quilometragem mantém o formulário e os dados para correção', async (t) => {
  let attempts = 0;
  const f = pageFixture(t, {
    update: async () => { if (++attempts === 1) throw new RangeError('A quilometragem precisa ser menor que a do abastecimento posterior.'); return uiRecord; },
  });
  await f.page.loadPromise;
  await f.page.openEdit(uiRecord);
  f.fields.mileage.value = '1400';
  await f.form.emit('submit');
  assert.equal(f.fields.mileage.value, '1400');
  assert.equal(f.get('[data-edit-dialog]').open, true);
  assert.equal(f.get('[data-save]').disabled, false);
  assert.match(f.get('[data-edit-error]').textContent, /posterior/);
  f.fields.mileage.value = '1300';
  await f.form.emit('submit');
  assert.equal(f.get('[data-edit-dialog]').open, false);
});

test('tela abastecimento: falha de exclusão mantém confirmação aberta e registro na lista', async (t) => {
  const f = pageFixture(t, { delete: async () => { throw new Error('Falha de gravação'); } });
  await f.page.loadPromise;
  f.page.askDelete(uiRecord);
  await f.page.deleteRecord();
  assert.equal(f.get('[data-delete-dialog]').open, true);
  assert.equal(f.get('[data-confirm-delete]').disabled, false);
  assert.match(f.get('[data-delete-error]').textContent, /Falha de gravação/);
  assert.equal(f.get('[data-record-list]').children.length, 1);
});

test('tela abastecimento: recuperação incompatível mantém excluído e explica a recusa', async (t) => {
  const f = pageFixture(t, {
    loadDeletedHistory: async () => [uiRecord],
    restore: async () => { throw new RangeError('Não foi possível recuperar: quilometragem incompatível com o abastecimento anterior.'); },
  });
  await f.page.loadPromise;
  await f.page.changeFilter(true);
  const [button] = f.get('[data-record-list]').children[0].children.at(-1).children;
  await button.emit('click');
  assert.equal(f.get('[data-record-list]').children.length, 1);
  assert.match(f.get('[data-feedback]').textContent, /recuperar.*anterior/);
  assert.equal(button.disabled, false);
});

test('tela abastecimento: falha ao carregar bloqueia salvar e permite nova tentativa', async (t) => {
  let attempts = 0;
  const f = pageFixture(t, { getById: async () => { if (++attempts === 1) throw new Error('Falha de leitura'); return uiRecord; } });
  await f.page.loadPromise;
  await f.page.openEdit(uiRecord);
  assert.equal(f.get('[data-save]').disabled, true);
  assert.equal(f.get('[data-retry-edit]').hidden, false);
  await f.get('[data-retry-edit]').emit('click');
  assert.equal(f.get('[data-save]').disabled, false);
});

test('tela abastecimento: retorno pelo cache recarrega histórico', async (t) => {
  let calls = 0;
  const f = pageFixture(t, { loadAllHistory: async () => { calls += 1; return [uiRecord]; } });
  await f.page.loadPromise;
  await f.windowListeners.get('pageshow')({ persisted: true });
  assert.equal(calls, 2);
});

test('tela abastecimento: trocar filtro ignora respostas anteriores que chegam atrasadas', async (t) => {
  let complete;
  const f = pageFixture(t, { loadAllHistory: async () => new Promise((resolve) => { complete = resolve; }) });
  await f.page.changeFilter(true);
  complete([uiRecord]);
  await f.page.loadPromise;
  assert.equal(f.get('[data-record-list]').children.length, 0);
  assert.equal(f.get('[data-empty]').hidden, false);
});

for (const operation of ['editar', 'excluir', 'recuperar']) {
  test(`tela abastecimento: bloqueia envio duplicado e fechamento durante ${operation}`, async (t) => {
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
