import assert from 'node:assert/strict';
import test from 'node:test';
import initSqlJs from 'sql.js';
import { DATABASE_MIGRATIONS } from '../js/database/migrations.js';
import { SqliteVehicleRepository } from '../js/repositories/sqlite-vehicle-repository.js';
import { VehicleService } from '../js/services/vehicle-service.js';

const SQL = await initSqlJs();

function connectionFor(db) {
  return {
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
      return { changes: { changes: db.getRowsModified() } };
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
  db.run("INSERT INTO VEHICLE (NAME, BRAND, MODEL, YEAR, IS_SELECTED) VALUES ('Minha moto', 'Honda', 'CG', 2020, 1), ('Outra moto', 'Yamaha', 'Factor', 2021, 0)");
  db.run("INSERT INTO GAS_STATION (GAS_STATION_ID, NAME, VEHICLE_ID) VALUES (1, 'Posto', 1)");
  db.run('INSERT INTO REFUELLING (Liters, Mileage, VEHICLE_ID, GAS_STATION_ID) VALUES (5, 100, 1, 1)');
  db.run("INSERT INTO MAINTENANCE (Description, KILOMETERS, VEHICLE_ID) VALUES ('Troca de óleo', 100, 1)");
  db.run("INSERT INTO PHOTO (FILE_PATH, VEHICLE_ID, PHOTO_TYPE) VALUES ('vehicle-photos/vehicle_1_100.jpg', 1, 'vehicle')");
  const connection = connectionFor(db);
  const repository = new SqliteVehicleRepository(async () => connection);
  return { db, connection, repository, service: new VehicleService(repository) };
}

test('editar veículo: persiste após reabrir o banco e preserva ID, seleção, fotos e históricos', async (t) => {
  const { db, service } = fixture(t);
  const relatedTables = ['GAS_STATION', 'REFUELLING', 'MAINTENANCE', 'PHOTO'];
  const before = relatedTables.map((table) => db.exec(`SELECT * FROM ${table}`));
  const otherVehicle = db.exec('SELECT * FROM VEHICLE WHERE VEHICLE_ID = 2');
  const updated = await service.update(1, {
    name: ' Moto de viagem ', brand: ' Yamaha ', model: ' Lander ', year: '2026',
    id: 99, isSelected: false, status: false,
  });
  assert.equal(updated.id, 1);
  assert.equal(updated.name, 'Moto de viagem');
  assert.equal(updated.brand, 'Yamaha');
  assert.equal(updated.model, 'Lander');
  assert.equal(updated.year, 2026);
  assert.equal(updated.isSelected, true);
  assert.deepEqual(relatedTables.map((table) => db.exec(`SELECT * FROM ${table}`)), before);
  assert.deepEqual(db.exec('SELECT * FROM VEHICLE WHERE VEHICLE_ID = 2'), otherVehicle);
  assert.equal(db.exec('SELECT COUNT(*) FROM VEHICLE')[0].values[0][0], 2);

  const reopened = new SQL.Database(db.export());
  t.after(() => reopened.close());
  const reopenedRepository = new SqliteVehicleRepository(async () => connectionFor(reopened));
  const saved = await new VehicleService(reopenedRepository).getById(1);
  assert.deepEqual(saved, updated);
  assert.deepEqual(relatedTables.map((table) => reopened.exec(`SELECT * FROM ${table}`)), before);
});

test('editar veículo: pode limpar marca, modelo e ano opcionais', async (t) => {
  const { service } = fixture(t);
  const updated = await service.update(1, { name: 'Moto', brand: ' ', model: '', year: null });
  assert.equal(updated.brand, null);
  assert.equal(updated.model, null);
  assert.equal(updated.year, null);
  assert.deepEqual(await service.getById(1), updated);
});

test('editar veículo: editar outro veículo não altera a seleção atual', async (t) => {
  const { service, repository } = fixture(t);
  const updated = await service.update(2, { name: 'Segunda moto', isSelected: true });
  assert.equal(updated.isSelected, false);
  assert.equal(await repository.getSelectedId(), 1);
});

for (const [name, input] of [
  ['nome vazio', { name: ' ' }],
  ['ano negativo', { name: 'Moto', year: -1 }],
  ['ano fracionário', { name: 'Moto', year: 2020.5 }],
]) {
  test(`editar veículo: rejeita ${name} sem modificar o cadastro`, async (t) => {
    const { db, service } = fixture(t);
    const before = db.exec('SELECT * FROM VEHICLE');
    await assert.rejects(service.update(1, input));
    assert.deepEqual(db.exec('SELECT * FROM VEHICLE'), before);
  });
}

for (const vehicleId of [0, -1, 1.5, '1', null]) {
  test(`editar veículo: rejeita ID inválido ${String(vehicleId)}`, async (t) => {
    const { service, repository } = fixture(t);
    await assert.rejects(service.getById(vehicleId), RangeError);
    await assert.rejects(service.update(vehicleId, { name: 'Moto' }), RangeError);
    await assert.rejects(repository.update(vehicleId, { name: 'Moto' }), RangeError);
  });
}

for (const [scenario, id] of [['inexistente', 99], ['inativo', 1]]) {
  test(`editar veículo: não edita nem recria veículo ${scenario}`, async (t) => {
    const { db, service, repository } = fixture(t);
    if (scenario === 'inativo') db.run('UPDATE VEHICLE SET CD_STATUS = 0 WHERE VEHICLE_ID = 1');
    const before = db.exec('SELECT * FROM VEHICLE');
    assert.equal(await service.getById(id), null);
    assert.equal(await repository.update(id, { name: 'Novo nome' }), null);
    await assert.rejects(service.update(id, { name: 'Novo nome' }), /não foi encontrado|não está mais ativo/);
    assert.deepEqual(db.exec('SELECT * FROM VEHICLE'), before);
  });
}

test('editar veículo: falha de gravação não retorna sucesso nem altera o cadastro', async (t) => {
  const { db, connection, service } = fixture(t);
  const before = db.exec('SELECT * FROM VEHICLE');
  connection.run = async () => ({ changes: { changes: -1 }, message: 'Falha de gravação' });
  await assert.rejects(service.update(1, { name: 'Moto' }), /Falha de gravação/);
  assert.deepEqual(db.exec('SELECT * FROM VEHICLE'), before);
});

// Import the page controllers without automatically mounting a page in Node.
const originalDocument = globalThis.document;
globalThis.document = { querySelector: () => null };
const { AdicionarVeiculoPage } = await import('../pages/adicionar-veiculo-page.js');
const { MeusVeiculosPage } = await import('../pages/meus-veiculos-page.js');
globalThis.document = originalDocument;

function element() {
  const listeners = new Map();
  let value = '';
  return {
    hidden: false, disabled: false, textContent: '', dataset: {}, children: [], attributes: {}, open: false,
    get value() { return value; }, set value(next) { value = String(next); },
    setAttribute(name, next) { this.attributes[name] = next; },
    addEventListener(name, handler) { listeners.set(name, handler); },
    async emit(name) { await listeners.get(name)?.({ preventDefault() {} }); },
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; },
    showModal() { this.open = true; }, close() { this.open = false; },
  };
}

function pageFixture(t, api, search = '?id=1') {
  const oldDocument = globalThis.document;
  globalThis.document = { title: '', createElement: element };
  t.after(() => { globalThis.document = oldDocument; });
  t.mock.method(console, 'error', () => {});
  const elements = new Map();
  const get = (selector) => {
    if (!elements.has(selector)) elements.set(selector, element());
    return elements.get(selector);
  };
  const fields = Object.fromEntries(['name', 'brand', 'model', 'year'].map((name) => [name, element()]));
  const form = get('[data-form]');
  form.elements = { namedItem: (name) => fields[name] };
  form.reportValidity = () => true;
  get('[data-success-dialog]').querySelector = get;
  const navigation = [];
  const page = new AdicionarVeiculoPage({ querySelector: get }, api, {
    location: { search, replace: (path) => navigation.push(path) },
  });
  return { page, fields, get, form, navigation };
}

const vehicle = { id: 1, name: 'Minha moto', brand: 'Honda', model: 'CG', year: 2020, isSelected: true };

test('tela: carrega os dados, salva a edição no mesmo ID e confirma antes de voltar', async (t) => {
  const calls = [];
  const f = pageFixture(t, {
    getById: async (id) => { assert.equal(id, 1); return vehicle; },
    update: async (id, data) => { calls.push({ id, data }); return { ...vehicle, ...data }; },
    create: async () => assert.fail('A edição não pode criar outro veículo'),
  });
  assert.equal(f.get('[data-submit]').disabled, true);
  await f.page.loadPromise;
  assert.equal(f.fields.name.value, 'Minha moto');
  assert.equal(f.fields.year.value, '2020');
  assert.equal(f.get('[data-page-title]').textContent, 'Editar veículo');
  assert.equal(f.get('[data-submit-label]').textContent, 'Salvar alterações');
  f.fields.name.value = 'Moto atualizada';
  f.fields.brand.value = '';
  f.fields.year.value = '';
  await f.form.emit('submit');
  assert.deepEqual(calls, [{ id: 1, data: { name: 'Moto atualizada', brand: null, model: 'CG', year: null } }]);
  assert.equal(f.get('[data-success-dialog]').open, true);
  assert.equal(f.get('[data-success-title]').textContent, 'Veículo atualizado');
  assert.equal(f.get('[data-vehicle-detail="name"]').textContent, 'Moto atualizada');
  assert.deepEqual(f.navigation, []);
  await f.get('[data-dialog-ok]').emit('click');
  assert.deepEqual(f.navigation, ['./meus-veiculos.html']);
});

for (const search of ['?id=', '?id=abc', '?id=-1', '?id=1.5', '?id=1e2']) {
  test(`tela: URL inválida ${search} bloqueia a edição sem cair no cadastro`, async (t) => {
    const f = pageFixture(t, {
      getById: async () => assert.fail('ID inválido não deve ser consultado'),
      create: async () => assert.fail('URL de edição inválida não pode cadastrar'),
      update: async () => assert.fail('ID inválido não pode ser editado'),
    }, search);
    await f.page.loadPromise;
    await f.form.emit('submit');
    assert.equal(f.get('[data-submit]').disabled, true);
    assert.match(f.get('[data-feedback]').textContent, /inválido/);
  });
}

test('tela: veículo inexistente ou inativo mantém a gravação bloqueada', async (t) => {
  const f = pageFixture(t, {
    getById: async () => null,
    update: async () => assert.fail('Não pode editar veículo ausente'),
  });
  await f.page.loadPromise;
  await f.form.emit('submit');
  assert.equal(f.get('[data-submit]').disabled, true);
  assert.match(f.get('[data-feedback]').textContent, /não foi encontrado|não está mais ativo/);
});

test('tela: falha de carregamento permite tentar novamente e só então habilita salvar', async (t) => {
  let attempts = 0;
  const f = pageFixture(t, {
    getById: async () => { if (++attempts === 1) throw new Error('Falha de leitura'); return vehicle; },
    update: async () => assert.fail('Não deve salvar durante o carregamento'),
  });
  await f.page.loadPromise;
  await f.form.emit('submit');
  assert.equal(f.get('[data-submit]').disabled, true);
  assert.equal(f.get('[data-retry-load]').hidden, false);
  await f.get('[data-retry-load]').emit('click');
  assert.equal(f.get('[data-submit]').disabled, false);
  assert.equal(f.fields.name.value, 'Minha moto');
});

test('tela: falha de gravação mantém os dados preenchidos para nova tentativa', async (t) => {
  let attempts = 0;
  const f = pageFixture(t, {
    getById: async () => vehicle,
    update: async (id, data) => { if (++attempts === 1) throw new Error('Falha'); return { ...vehicle, ...data }; },
  });
  await f.page.loadPromise;
  f.fields.name.value = 'Nome corrigido';
  await f.form.emit('submit');
  assert.equal(f.fields.name.value, 'Nome corrigido');
  assert.equal(f.get('[data-submit]').disabled, false);
  assert.equal(f.get('[data-success-dialog]').open, false);
  await f.form.emit('submit');
  assert.equal(f.get('[data-success-dialog]').open, true);
});

test('tela: evita dois envios enquanto salva e após abrir a confirmação', async (t) => {
  let complete;
  let calls = 0;
  const f = pageFixture(t, {
    getById: async () => vehicle,
    update: async () => { calls += 1; return new Promise((resolve) => { complete = resolve; }); },
  });
  await f.page.loadPromise;
  const saving = f.form.emit('submit');
  await f.form.emit('submit');
  assert.equal(calls, 1);
  complete(vehicle);
  await saving;
  await f.form.emit('submit');
  assert.equal(calls, 1);
});

test('tela: abrir sem ID continua criando um veículo', async (t) => {
  let calls = 0;
  const f = pageFixture(t, {
    create: async (data) => { calls += 1; return { ...vehicle, ...data }; },
    update: async () => assert.fail('Cadastro não deve chamar edição'),
  }, '');
  f.fields.name.value = 'Nova moto';
  await f.form.emit('submit');
  assert.equal(calls, 1);
  assert.equal(f.get('[data-success-dialog]').open, true);
});

test('cartão: oferece o link de edição fora da área que seleciona o veículo', (t) => {
  const oldDocument = globalThis.document;
  globalThis.document = { createElement: element };
  t.after(() => { globalThis.document = oldDocument; });
  const list = element();
  MeusVeiculosPage.prototype.render.call({
    list, count: element(), setState() {}, askDeleteVehicle() {}, selectVehicle() {},
  }, [vehicle]);
  const [card] = list.children;
  const editLink = card.children.find((child) => child.className === 'meus-veiculos-edit');
  assert.equal(editLink.textContent, 'Editar veículo');
  assert.equal(editLink.href, './adicionar-veiculo.html?id=1');
  assert.equal(card.children[0].children.includes(editLink), false);
});
