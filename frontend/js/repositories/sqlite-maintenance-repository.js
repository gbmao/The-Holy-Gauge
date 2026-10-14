import { openDatabase } from '../database/database.js';
import { assertSqliteSucceeded, sqliteErrorMessage } from '../database/sqlite-utils.js';

const SELECT_MAINTENANCE_COLUMNS = `
  Maintenance_ID AS id,
  Description AS description,
  MAINTENANCEDATE AS date,
  COST AS cost,
  KILOMETERS AS kilometers,
  NEXTKILOMETERS AS nextKilometers,
  NEXTDATE AS nextDate,
  NOTES AS notes
`;

function mapMaintenanceRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    description: row.description,
    date: row.date ?? null,
    cost: row.cost === null || row.cost === undefined ? null : Number(row.cost),
    kilometers: row.kilometers === null || row.kilometers === undefined
      ? null
      : Number(row.kilometers),
    nextKilometers: row.nextKilometers === null || row.nextKilometers === undefined
      ? null
      : Number(row.nextKilometers),
    nextDate: row.nextDate ?? null,
    notes: row.notes ?? null,
  };
}

/**
 * SQLite persistence for maintenance records, using the shared database
 * connection. A provider can be injected to isolate callers from the plugin.
 * @param {() => Promise<import('@capacitor-community/sqlite').SQLiteDBConnection>} databaseProvider
 */
export class SqliteMaintenanceRepository {
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
      throw new Error('O SQLite não retornou linhas ao executar a consulta.');
    }

    return result.values;
  }

  async getAllMaintenances() {
    const rows = await this.queryRows(`
      SELECT ${SELECT_MAINTENANCE_COLUMNS}
      FROM MAINTENANCE
      ORDER BY MAINTENANCEDATE DESC, Maintenance_ID DESC
    `);

    return rows.map(mapMaintenanceRow);
  }

  async getLatestRefuellingMileage() {
    const [row] = await this.queryRows(`
      SELECT Mileage AS mileage
      FROM REFUELLING
      WHERE Cd_status = 1 AND Mileage IS NOT NULL
      ORDER BY Dh_refuelling DESC, Refuelling_id DESC
      LIMIT 1
    `);

    return row?.mileage === null || row?.mileage === undefined
      ? null
      : Number(row.mileage);
  }

  async create(record) {
    const connection = await this.databaseProvider();
    const result = await connection.run(`
      INSERT INTO MAINTENANCE (
        Description,
        MAINTENANCEDATE,
        COST,
        KILOMETERS,
        NEXTKILOMETERS,
        NEXTDATE,
        NOTES
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      record.description,
      record.date ?? null,
      record.cost ?? null,
      record.kilometers ?? null,
      record.nextKilometers ?? null,
      record.nextDate ?? null,
      record.notes ?? null,
    ]);
    const changes = assertSqliteSucceeded(result, 'registrar a manutenção');
    const insertedId = Number(changes.lastId);

    if (!Number.isInteger(insertedId) || insertedId <= 0) {
      throw new Error('O SQLite não retornou o identificador da manutenção criada.');
    }

    const [row] = await this.queryRows(`
      SELECT ${SELECT_MAINTENANCE_COLUMNS}
      FROM MAINTENANCE
      WHERE Maintenance_ID = ?
    `, [insertedId], connection);
    const savedRecord = mapMaintenanceRow(row);

    if (!savedRecord) {
      throw new Error('A manutenção foi gravada, mas não pôde ser lida novamente.');
    }

    return savedRecord;
  }
}
