import { openDatabase } from '../database/database.js';
import { assertSqliteSucceeded, sqliteErrorMessage } from '../database/sqlite-utils.js';
import { Vehicle } from '../models/vehicle.js';

const SELECT_VEHICLE_COLUMNS = `
  VEHICLE_ID AS id,
  NAME AS name,
  BRAND AS brand,
  MODEL AS model,
  YEAR AS year
`;

function mapVehicleRow(row) {
  return row ? new Vehicle(row) : null;
}

/**
 * SQLite persistence for vehicles, using the shared connection managed by
 * database.js. A provider can be injected for isolated callers.
 * @param {() => Promise<import('@capacitor-community/sqlite').SQLiteDBConnection>} databaseProvider
 */
export class SqliteVehicleRepository {
  constructor(databaseProvider = openDatabase) {
    if (typeof databaseProvider !== 'function') {
      throw new TypeError('Informe uma função que forneça a conexão SQLite.');
    }

    this.databaseProvider = databaseProvider;
  }

  async queryRows(statement, values = [], connection = null) {
    const database = connection ?? await this.databaseProvider();
    const result = await database.query(statement, values);
    const message = sqliteErrorMessage(result);

    if (message) {
      throw new Error(message);
    }

    if (!Array.isArray(result?.values)) {
      throw new Error('O SQLite não retornou linhas ao consultar veículos.');
    }

    return result.values;
  }

  async getAll() {
    const rows = await this.queryRows(`
      SELECT ${SELECT_VEHICLE_COLUMNS}
      FROM VEHICLE
      ORDER BY NAME COLLATE NOCASE ASC, VEHICLE_ID ASC
    `);

    return rows.map(mapVehicleRow);
  }

  async create(input) {
    const vehicle = input instanceof Vehicle ? input : new Vehicle(input);
    const connection = await this.databaseProvider();
    const result = await connection.run(`
      INSERT INTO VEHICLE (NAME, BRAND, MODEL, YEAR)
      VALUES (?, ?, ?, ?)
    `, [
      vehicle.name,
      vehicle.brand,
      vehicle.model,
      vehicle.year,
    ]);
    const changes = assertSqliteSucceeded(result, 'registrar o veículo');
    const insertedId = Number(changes.lastId);

    if (!Number.isSafeInteger(insertedId) || insertedId <= 0) {
      throw new Error('O SQLite não retornou o identificador do veículo criado.');
    }

    const [row] = await this.queryRows(`
      SELECT ${SELECT_VEHICLE_COLUMNS}
      FROM VEHICLE
      WHERE VEHICLE_ID = ?
    `, [insertedId], connection);
    const savedVehicle = mapVehicleRow(row);

    if (!savedVehicle) {
      throw new Error('O veículo foi gravado, mas não pôde ser lido novamente.');
    }

    return savedVehicle;
  }
}
