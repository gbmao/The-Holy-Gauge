import { openDatabase } from '../database/database.js';
import { assertSqliteSucceeded, sqliteErrorMessage } from '../database/sqlite-utils.js';
import { Vehicle } from '../models/vehicle.js';

const SELECT_VEHICLE_COLUMNS = `
  VEHICLE_ID AS id,
  NAME AS name,
  BRAND AS brand,
  MODEL AS model,
  YEAR AS year,
  IS_SELECTED AS isSelected
`;

function mapVehicleRow(row) {
  return row ? new Vehicle({ ...row, isSelected: Boolean(row.isSelected) }) : null;
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
      WHERE CD_STATUS = 1
      ORDER BY NAME COLLATE NOCASE ASC, VEHICLE_ID ASC
    `);

    return rows.map(mapVehicleRow);
  }

  async getSelectedId() {
    const [row] = await this.queryRows(`
      SELECT VEHICLE_ID AS id
      FROM VEHICLE
      WHERE CD_STATUS = 1 AND IS_SELECTED = 1
      ORDER BY VEHICLE_ID ASC
      LIMIT 1
    `);

    return row?.id === null || row?.id === undefined ? null : Number(row.id);
  }

  async select(vehicleId) {
    if (!Number.isSafeInteger(vehicleId) || vehicleId <= 0) {
      throw new RangeError('O ID do veículo precisa ser um número inteiro positivo.');
    }

    const [vehicle] = await this.queryRows(`
      SELECT VEHICLE_ID AS id
      FROM VEHICLE
      WHERE VEHICLE_ID = ? AND CD_STATUS = 1
    `, [vehicleId]);

    if (!vehicle) {
      return false;
    }

    const connection = await this.databaseProvider();
    const result = await connection.executeTransaction([
      {
        statement: `
          UPDATE VEHICLE
          SET IS_SELECTED = 0
          WHERE IS_SELECTED = 1 AND VEHICLE_ID <> ?
        `,
        values: [vehicleId],
      },
      {
        statement: `
          UPDATE VEHICLE
          SET IS_SELECTED = 1
          WHERE VEHICLE_ID = ? AND CD_STATUS = 1
        `,
        values: [vehicleId],
      },
    ]);
    assertSqliteSucceeded(result, 'selecionar o veículo');

    return true;
  }

  async create(input) {
    const vehicle = input instanceof Vehicle ? input : new Vehicle(input);
    const connection = await this.databaseProvider();
    const result = await connection.run(`
      INSERT INTO VEHICLE (NAME, BRAND, MODEL, YEAR, IS_SELECTED)
      VALUES (?, ?, ?, ?, ?)
    `, [
      vehicle.name,
      vehicle.brand,
      vehicle.model,
      vehicle.year,
      vehicle.isSelected ? 1 : 0,
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

  async softDelete(vehicleId) {
    if (!Number.isSafeInteger(vehicleId) || vehicleId <= 0) {
      throw new RangeError('O ID do veículo precisa ser um número inteiro positivo.');
    }

    const connection = await this.databaseProvider();
    const result = await connection.executeTransaction([
      {
        statement: `
          UPDATE GAS_STATION
          SET CD_STATUS = 0
          WHERE VEHICLE_ID = ? AND CD_STATUS = 1
        `,
        values: [vehicleId],
      },
      {
        statement: `
          UPDATE REFUELLING
          SET CD_STATUS = 0
          WHERE VEHICLE_ID = ? AND CD_STATUS = 1
        `,
        values: [vehicleId],
      },
      {
        statement: `
          UPDATE MAINTENANCE
          SET CD_STATUS = 0
          WHERE VEHICLE_ID = ? AND CD_STATUS = 1
        `,
        values: [vehicleId],
      },
      {
        statement: `
          UPDATE VEHICLE
          SET CD_STATUS = 0
          WHERE VEHICLE_ID = ? AND CD_STATUS = 1
        `,
        values: [vehicleId],
      },
    ]);
    const changes = assertSqliteSucceeded(result, 'excluir o veículo');

    return changes.changes > 0;
  }
}
