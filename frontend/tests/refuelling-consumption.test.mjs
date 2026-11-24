import assert from 'node:assert/strict';
import test from 'node:test';
import initSqlJs from 'sql.js';
import { Capacitor } from '@capacitor/core';
import { vehicleApi } from '../js/api.js';
import { DATABASE_MIGRATIONS } from '../js/database/migrations.js';
import { SqliteRefuellingRepository } from '../js/repositories/sqlite-refuelling-repository.js';
import { RefuellingService } from '../js/services/refuelling-service.js';
import { formatAverageConsumption } from '../js/formatters/consumption.js';

const SQL = await initSqlJs();

function fixture(t) {
  const db = new SQL.Database();
  t.after(() => db.close());
  db.run('PRAGMA foreign_keys = ON');
  for (const migration of DATABASE_MIGRATIONS) {
    for (const statement of migration.statements) db.run(statement);
  }
  db.run("INSERT INTO VEHICLE (NAME, IS_SELECTED) VALUES ('Moto em uso', 1), ('Outra moto', 0)");
  const connection = {
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
      db.run(sql, values);
      return { changes: {
        changes: db.getRowsModified(),
        lastId: db.exec('SELECT last_insert_rowid()')[0].values[0][0],
      } };
    },
  };
  t.mock.method(Capacitor, 'isNativePlatform', () => true);
  t.mock.method(vehicleApi, 'getSelectedId', async () => (
    (await connection.query('SELECT VEHICLE_ID AS id FROM VEHICLE WHERE CD_STATUS = 1 AND IS_SELECTED = 1')).values[0]?.id ?? null
  ));
  let sequence = 0;
  function add({ mileage, liters = 10, fullTank = true, vehicleId = 1, date } = {}) {
    sequence += 1;
    db.run(`
      INSERT INTO REFUELLING (Mileage, Liters, Bl_full_tank, VEHICLE_ID, Dh_refuelling)
      VALUES (?, ?, ?, ?, ?)
    `, [mileage ?? null, liters, fullTank === null ? null : Number(fullTank), vehicleId,
      date ?? `2026-11-${String(sequence).padStart(2, '0')}T12:00:00.000Z`]);
  }
  const repository = new SqliteRefuellingRepository(async () => connection);
  return { db, add, repository, service: new RefuellingService(repository) };
}

for (const [name, records, expected] of [
  ['sem abastecimentos', [], null],
  ['com apenas um abastecimento', [{ mileage: 1000 }], null],
  ['dois tanques cheios consecutivos', [{ mileage: 1000, liters: 20 }, { mileage: 1200, liters: 5 }], 40],
  ['usa somente o par mais recente', [{ mileage: 1000 }, { mileage: 1100 }, { mileage: 1500 }], 40],
  ['parcial entre dois tanques cheios', [{ mileage: 1000 }, { mileage: 1100, fullTank: false }, { mileage: 1200 }], null],
  ['último abastecimento parcial não reutiliza consumo anterior', [{ mileage: 1000 }, { mileage: 1200 }, { mileage: 1300, fullTank: false }], null],
  ['registro intermediário sem quilometragem não é pulado', [{ mileage: 1000 }, { mileage: null }, { mileage: 1200 }], null],
  ['último registro sem quilometragem', [{ mileage: 1000 }, { mileage: null }], null],
  ['tanque cheio não informado', [{ mileage: 1000 }, { mileage: 1200, fullTank: null }], null],
  ['litros atuais iguais a zero', [{ mileage: 1000 }, { mileage: 1200, liters: 0 }], null],
  ['quilometragem inicial zero é válida', [{ mileage: 0 }, { mileage: 200 }], 20],
  ['arredondamento em duas casas', [{ mileage: 1000 }, { mileage: 1333, liters: 11 }], 30.27],
]) {
  test(`consumo SQLite: ${name}`, async (t) => {
    const { add, repository } = fixture(t);
    for (const record of records) add(record);
    assert.equal(await repository.getAverageConsumption(), expected);
  });
}

test('consumo SQLite: sem seleção retorna ausência de consumo', async (t) => {
  const { db, add, repository } = fixture(t);
  add({ mileage: 1000 });
  add({ mileage: 1200 });
  db.run('UPDATE VEHICLE SET IS_SELECTED = 0');
  assert.equal(await repository.getAverageConsumption(), null);
});

test('consumo SQLite: outros veículos e registros antigos sem veículo não interferem no par', async (t) => {
  const { db, add, repository } = fixture(t);
  add({ mileage: 1000 });
  add({ mileage: 1200 });
  add({ mileage: 50, fullTank: false, vehicleId: 2 });
  add({ mileage: 100, fullTank: false, vehicleId: null });
  assert.equal(await repository.getAverageConsumption(), 20);
  db.run('UPDATE VEHICLE SET IS_SELECTED = CASE WHEN VEHICLE_ID = 2 THEN 1 ELSE 0 END');
  assert.equal(await repository.getAverageConsumption(), null);
});

test('consumo SQLite: considera somente registros ativos', async (t) => {
  const { db, add, repository } = fixture(t);
  add({ mileage: 1000 });
  add({ mileage: 1200 });
  add({ mileage: 1300, fullTank: false });
  db.run('UPDATE REFUELLING SET Cd_status = 0 WHERE Mileage = 1300');
  assert.equal(await repository.getAverageConsumption(), 20);
});

test('consumo SQLite: desempata registros com a mesma data pelo ID', async (t) => {
  const { add, repository } = fixture(t);
  const date = '2026-11-22T12:00:00.000Z';
  add({ mileage: 1000, date });
  add({ mileage: 1100, fullTank: false, date });
  add({ mileage: 1300, date });
  assert.equal(await repository.getAverageConsumption(), null);
});

for (const invalidMileage of [1000, 900]) {
  test(`consumo SQLite: distância inválida com quilometragem final ${invalidMileage}`, async (t) => {
    const { db, add, repository } = fixture(t);
    add({ mileage: 1000 });
    add({ mileage: 1200 });
    // Simulate legacy/corrupted data: normal edits now reject this sequence.
    db.run('DROP TRIGGER TR_REFUELLING_UPDATE_MILEAGE');
    db.run('UPDATE REFUELLING SET Mileage = ? WHERE Refuelling_id = 2', [invalidMileage]);
    assert.equal(await repository.getAverageConsumption(), null);
  });
}

test('serviço e indicador concordam ao salvar, reler e interromper um par com um parcial', async (t) => {
  const { service, repository } = fixture(t);
  const save = (mileage, blFullTank, occurredAt) => service.create({
    mileage, liters: 10, blFullTank, occurredAt,
  });
  const first = await save(1000, true, '2026-11-01T12:00:00.000Z');
  assert.equal(first.consumptionKmPerLiter, null);
  assert.equal(await repository.getAverageConsumption(), null);
  const second = await save(1200, true, '2026-11-02T12:00:00.000Z');
  assert.equal(second.consumptionKmPerLiter, 20);
  assert.equal(await repository.getAverageConsumption(), second.consumptionKmPerLiter);
  const partial = await save(1300, false, '2026-11-03T12:00:00.000Z');
  assert.equal(partial.consumptionKmPerLiter, null);
  assert.equal(await repository.getAverageConsumption(), null);
  const afterPartial = await save(1400, true, '2026-11-04T12:00:00.000Z');
  assert.equal(afterPartial.consumptionKmPerLiter, null);
  assert.equal(await repository.getAverageConsumption(), null);
  const nextFull = await save(1700, true, '2026-11-05T12:00:00.000Z');
  assert.equal(nextFull.consumptionKmPerLiter, 30);
  // A new instance reads persisted data rather than relying on create()'s response.
  const reopenedRepository = new SqliteRefuellingRepository(repository.databaseProvider);
  assert.equal(await reopenedRepository.getAverageConsumption(), 30);
});

for (const value of [null, undefined, '', NaN, Infinity, -1]) {
  test(`indicador: apresenta “—” para ${String(value)}`, () => {
    assert.equal(formatAverageConsumption(value), '—');
  });
}

test('indicador: formata um consumo válido em português com uma casa decimal', () => {
  assert.equal(formatAverageConsumption(30.27), '30,3');
  assert.equal(formatAverageConsumption(20), '20,0');
});
