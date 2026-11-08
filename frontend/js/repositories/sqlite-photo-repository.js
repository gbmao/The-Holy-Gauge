import { openDatabase } from '../database/database.js';
import { assertSqliteSucceeded, sqliteErrorMessage } from '../database/sqlite-utils.js';
import { Photo, requirePhotoVehicleId } from '../models/photo.js';

export class SqlitePhotoRepository {
  constructor(databaseProvider = openDatabase) {
    this.databaseProvider = databaseProvider;
  }

  async queryRows(statement, values = []) {
    const connection = await this.databaseProvider();
    const result = await connection.query(statement, values);
    const message = sqliteErrorMessage(result);
    if (message || !Array.isArray(result?.values)) {
      throw new Error(message || 'O SQLite não retornou as fotos do veículo.');
    }
    return result.values;
  }

  async isVehicleActive(vehicleId) {
    requirePhotoVehicleId(vehicleId);
    const rows = await this.queryRows(`
      SELECT VEHICLE_ID FROM VEHICLE
      WHERE VEHICLE_ID = ? AND CD_STATUS = 1
    `, [vehicleId]);
    return rows.length > 0;
  }

  async getForVehicle(vehicleId, type = null) {
    if (vehicleId === null) {
      return [];
    }
    requirePhotoVehicleId(vehicleId);
    const rows = await this.queryRows(`
      SELECT PHOTO_ID AS id, FILE_PATH AS filePath,
             VEHICLE_ID AS vehicleId, PHOTO_TYPE AS type
      FROM PHOTO
      WHERE VEHICLE_ID = ? ${type === null ? '' : 'AND PHOTO_TYPE = ?'}
      ORDER BY PHOTO_ID DESC
    `, type === null ? [vehicleId] : [vehicleId, type]);
    return rows.map((row) => new Photo({
      ...row,
      id: Number(row.id),
      vehicleId: Number(row.vehicleId),
    }));
  }

  async create(input) {
    const photo = input instanceof Photo ? input : new Photo(input);
    const connection = await this.databaseProvider();
    const result = await connection.run(`
      INSERT INTO PHOTO (FILE_PATH, VEHICLE_ID, PHOTO_TYPE)
      SELECT ?, VEHICLE_ID, ? FROM VEHICLE
      WHERE VEHICLE_ID = ? AND CD_STATUS = 1
    `, [photo.filePath, photo.type, photo.vehicleId]);
    const changes = assertSqliteSucceeded(result, 'salvar a foto');
    if (changes.changes !== 1) {
      throw new Error('O veículo não está mais ativo.');
    }
    return new Photo({ ...photo, id: Number(changes.lastId) });
  }

  async delete(photoId, vehicleId) {
    requirePhotoVehicleId(vehicleId);
    if (!Number.isSafeInteger(photoId) || photoId <= 0) {
      throw new RangeError('O ID da foto precisa ser um número inteiro positivo.');
    }
    const connection = await this.databaseProvider();
    const result = await connection.run(`
      DELETE FROM PHOTO WHERE PHOTO_ID = ? AND VEHICLE_ID = ?
    `, [photoId, vehicleId]);
    assertSqliteSucceeded(result, 'excluir a foto');
  }
}
