import assert from 'node:assert/strict';
import test from 'node:test';
import { PhotoService } from '../js/services/photo-service.js';
import { VehicleService } from '../js/services/vehicle-service.js';
import { PhotoCamera } from '../js/photos/photo-camera.js';
import { PhotoStorage } from '../js/photos/photo-storage.js';

function fixture() {
  const rows = [
    { id: 1, vehicleId: 1, type: 'vehicle', filePath: 'vehicle-photos/vehicle_1_100.jpg' },
    { id: 2, vehicleId: 2, type: 'vehicle', filePath: 'vehicle-photos/vehicle_2_100.jpg' },
  ];
  const files = new Set(rows.map((photo) => photo.filePath));
  const events = [];
  const captured = { path: 'file:///cache/capture.jpg', format: 'jpeg' };
  const repository = {
    async isVehicleActive(id) { return id === 1 || id === 2; },
    async getForVehicle(id, type = null) {
      return rows.filter((row) => row.vehicleId === id && (type === null || row.type === type))
        .sort((a, b) => b.id - a.id);
    },
    async create(photo) {
      events.push('db-create');
      const row = { ...photo, id: Math.max(0, ...rows.map((item) => item.id)) + 1 };
      rows.push(row);
      return row;
    },
    async delete(id, vehicleId) {
      events.push(`db-delete:${id}`);
      const index = rows.findIndex((row) => row.id === id && row.vehicleId === vehicleId);
      if (index >= 0) rows.splice(index, 1);
    },
  };
  const storage = {
    async getDisplayUrl(path) { return files.has(path) ? `display:${path}` : null; },
    async saveCameraPhoto(id) {
      events.push('file-save');
      const path = `vehicle-photos/vehicle_${id}_200.jpg`;
      files.add(path);
      return path;
    },
    async delete(path) { events.push(`file-delete:${path}`); files.delete(path); },
    async discardCameraPhoto() { events.push('temp-delete'); },
  };
  const camera = {
    async capture(id) { events.push(`camera:${id}`); return captured; },
    getPendingVehicleId() { return 1; },
    finishCapture() { events.push('capture-finished'); },
  };
  return { rows, files, events, captured, repository, storage, camera, service: new PhotoService(repository, storage, camera) };
}

test('a substituição grava a nova foto antes de excluir a anterior e preserva outro veículo', async () => {
  const f = fixture();
  const result = await f.service.captureAndSave(1);
  assert.equal(result.photo.vehicleId, 1);
  assert.equal(result.cleanupPending, false);
  assert.deepEqual(f.events, [
    'camera:1', 'file-save', 'db-create',
    'file-delete:vehicle-photos/vehicle_1_100.jpg', 'db-delete:1',
    'temp-delete', 'capture-finished',
  ]);
  assert.deepEqual([...f.files].sort(), ['vehicle-photos/vehicle_1_200.jpg', 'vehicle-photos/vehicle_2_100.jpg']);
  assert.equal((await f.service.getCurrent(1)).photo.id, result.photo.id);
  assert.equal((await f.service.getCurrent(2)).photo.id, 2);
});

test('cancelar a câmera não altera os dados nem os arquivos anteriores', async () => {
  const f = fixture();
  f.camera.capture = async () => null;
  assert.equal(await f.service.captureAndSave(1), null);
  assert.equal(f.rows.length, 2);
  assert.equal(f.files.size, 2);
  assert.deepEqual(f.events, ['capture-finished']);
});

test('falha no SQLite remove o novo arquivo e preserva a foto anterior', async () => {
  const f = fixture();
  f.repository.create = async () => { throw new Error('SQLite indisponível'); };
  await assert.rejects(f.service.captureAndSave(1), /SQLite indisponível/);
  assert.equal(f.rows.length, 2);
  assert.deepEqual([...f.files].sort(), ['vehicle-photos/vehicle_1_100.jpg', 'vehicle-photos/vehicle_2_100.jpg']);
  assert.ok(f.events.includes('temp-delete'));
  assert.equal(f.events.at(-1), 'capture-finished');
});

test('falha ao copiar a imagem mantém o registro e o arquivo anteriores', async () => {
  const f = fixture();
  f.storage.saveCameraPhoto = async () => { throw new Error('Sem espaço'); };
  await assert.rejects(f.service.captureAndSave(1), /Sem espaço/);
  assert.equal(f.rows.length, 2);
  assert.equal(f.files.size, 2);
  assert.ok(!f.events.includes('db-create'));
  assert.ok(f.events.includes('temp-delete'));
});

test('falha ao excluir arquivo preserva sua referência e permite tentar novamente', async () => {
  const f = fixture();
  const deleteFile = f.storage.delete;
  f.storage.delete = async () => { throw new Error('Arquivo bloqueado'); };
  await assert.rejects(f.service.deleteCurrent(1), /Arquivo bloqueado/);
  assert.equal(f.rows.length, 2);
  f.storage.delete = deleteFile;
  await f.service.deleteCurrent(1);
  assert.equal(f.rows.length, 1);
  assert.equal(f.rows[0].vehicleId, 2);
  assert.equal(f.files.size, 1);
});

test('a recuperação da câmera usa o veículo original gravado antes de abrir a Activity', async () => {
  const f = fixture();
  const result = await f.service.restoreCapture({ pluginId: 'Camera', methodName: 'getPhoto', success: true, data: f.captured });
  assert.equal(result.photo.vehicleId, 1);
  assert.equal((await f.service.getCurrent(2)).photo.filePath, 'vehicle-photos/vehicle_2_100.jpg');
  assert.equal(f.events.at(-1), 'capture-finished');
});

test('falha ao limpar a foto antiga mantém a nova e conserva a referência antiga para nova tentativa', async (t) => {
  const f = fixture();
  t.mock.method(console, 'error', () => {});
  const deleteFile = f.storage.delete;
  f.storage.delete = async (path) => {
    if (path === 'vehicle-photos/vehicle_1_100.jpg') throw new Error('Arquivo bloqueado');
    return deleteFile(path);
  };
  const result = await f.service.captureAndSave(1);
  assert.equal(result.cleanupPending, true);
  assert.equal((await f.service.getCurrent(1)).photo.id, result.photo.id);
  assert.ok(f.rows.some((row) => row.id === 1));
  assert.ok(f.files.has('vehicle-photos/vehicle_1_100.jpg'));
  f.storage.delete = deleteFile;
  await f.service.deleteCurrent(1);
  assert.equal((await f.repository.getForVehicle(1)).length, 0);
  assert.equal(f.files.size, 1);
});

test('cancelar uma captura recuperada mantém a foto anterior e limpa a captura pendente', async () => {
  const f = fixture();
  assert.equal(await f.service.restoreCapture({
    pluginId: 'Camera', methodName: 'getPhoto', success: false,
    error: { message: 'User cancelled photos app' },
  }), null);
  assert.equal(f.files.size, 2);
  assert.equal(f.rows.length, 2);
  assert.deepEqual(f.events, ['capture-finished']);
});

test('veículo sem seleção ou inativo não recebe uma captura', async () => {
  const f = fixture();
  assert.equal(await f.service.getCurrent(null), null);
  assert.equal(await f.service.getCurrent(3), null);
  await assert.rejects(f.service.captureAndSave(null), /Selecione um veículo/);
  await assert.rejects(f.service.captureAndSave(3), /não está mais ativo/);
  assert.deepEqual(f.events, []);
});

test('a exclusão do veículo remove todas as categorias de fotos antes de inativar o veículo', async () => {
  const f = fixture();
  f.rows.push({ id: 3, vehicleId: 1, type: 'receipt', filePath: 'vehicle-photos/vehicle_1_150.jpg' });
  f.files.add('vehicle-photos/vehicle_1_150.jpg');
  const vehicles = new VehicleService({
    create() {},
    async softDelete() { f.events.push('vehicle-inactive'); return true; },
  }, (id) => f.service.deleteAllForVehicle(id));
  assert.equal(await vehicles.delete(1), true);
  assert.equal(f.events.at(-1), 'vehicle-inactive');
  assert.equal(f.rows.length, 1);
  assert.equal(f.rows[0].vehicleId, 2);
  assert.equal(f.files.size, 1);
});

test('o veículo permanece ativo se suas fotos não puderem ser apagadas', async () => {
  let inactivated = false;
  const vehicles = new VehicleService({
    create() {},
    async softDelete() { inactivated = true; },
  }, async () => { throw new Error('Foto não removida'); });
  await assert.rejects(vehicles.delete(1), /Foto não removida/);
  assert.equal(inactivated, false);
});

test('a captura persiste o ID original e trata cancelamento sem salvar uma imagem', async () => {
  const pending = new Map();
  const camera = new PhotoCamera({
    async getPhoto(options) {
      assert.equal(options.source, 'CAMERA');
      assert.equal(options.saveToGallery, false);
      throw new Error('User cancelled photos app');
    },
  }, {
    setItem(key, value) { pending.set(key, value); },
    getItem(key) { return pending.get(key); },
    removeItem(key) { pending.delete(key); },
  });
  assert.equal(await camera.capture(12), null);
  assert.equal(camera.getPendingVehicleId(), 12);
  camera.finishCapture();
  assert.equal(camera.getPendingVehicleId(), null);
});

test('o armazenamento cria a pasta privada, mantém o ID no nome e recusa apagar caminhos externos', async () => {
  const files = new Set();
  const operations = [];
  const storage = new PhotoStorage({
    async mkdir(options) { operations.push(options); },
    async stat({ path }) {
      if (!files.has(path)) throw new Error('File does not exist');
      return { type: 'file' };
    },
    async copy(options) { operations.push(options); files.add(options.to); },
    async getUri({ path }) { return { uri: `file:///app/files/${path}` }; },
    async deleteFile({ path }) {
      if (!files.has(path)) throw new Error('File does not exist');
      files.delete(path);
    },
  }, (uri) => `webview:${uri}`, () => 1731085200000);
  const path = await storage.saveCameraPhoto(12, { path: 'file:///cache/camera.jpg', format: 'jpeg' });
  assert.equal(path, 'vehicle-photos/vehicle_12_1731085200000.jpg');
  assert.equal(operations[0].directory, 'DATA');
  assert.equal(operations[1].toDirectory, 'DATA');
  assert.equal(await storage.getDisplayUrl(path), `webview:file:///app/files/${path}`);
  await assert.rejects(storage.saveCameraPhoto(12, { path: 'file:///cache/camera.jpg', format: 'jpeg' }), /Já existe/);
  await assert.rejects(storage.delete('../database.db'), /não pertence/);
  await storage.delete(path);
  await storage.delete(path);
  assert.equal(await storage.getDisplayUrl(path), null);
});
