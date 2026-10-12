import { openDatabase } from '../database/database.js';

const SELECT_REFUELLING_COLUMNS = `
  Refuelling_id AS id,
  Liters AS liters,
  Bl_additive AS blAdditive,
  Mileage AS mileage,
  Bl_full_tank AS blFullTank,
  Dh_refuelling AS occurredAt,
  Cd_status AS status,
  Gas_price AS gasPrice,
  GAS_STATION_ID AS gasStationId,
  CASE
    WHEN Gas_price IS NULL THEN NULL
    ELSE ROUND(Liters * Gas_price, 2)
  END AS total
`;

function toSqliteBoolean(value, fieldName) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'boolean') {
    throw new TypeError(`${fieldName} precisa ser verdadeiro, falso ou nulo.`);
  }

  return value ? 1 : 0;
}

function mapRefuellingRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    liters: Number(row.liters),
    blAdditive: row.blAdditive === null ? null : Boolean(row.blAdditive),
    mileage: row.mileage === null ? null : Number(row.mileage),
    blFullTank: row.blFullTank === null ? null : Boolean(row.blFullTank),
    occurredAt: row.occurredAt,
    status: Boolean(row.status),
    gasPrice: row.gasPrice === null ? null : Number(row.gasPrice),
    gasStationId: row.gasStationId === null ? null : Number(row.gasStationId),
    total: row.total === null ? null : Number(row.total),
  };
}

function validateMonthAndYear(month, year) {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError('O mês precisa ser um número inteiro entre 1 e 12.');
  }

  if (!Number.isInteger(year) || year < 1 || year > 9999) {
    throw new RangeError('O ano precisa ser um número inteiro válido.');
  }
}

function getMonthRange(month, year) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const end = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

  return { start, end };
}

function sqliteErrorMessage(result) {
  if (typeof result?.message === 'string' && result.message.trim()) {
    return result.message;
  }

  if (typeof result?.error === 'string' && result.error.trim()) {
    return result.error;
  }

  return null;
}

function assertSqliteSucceeded(result, operation) {
  const changes = result?.changes?.changes;
  const message = sqliteErrorMessage(result);

  if (message || changes === -1 || !Number.isFinite(changes)) {
    throw new Error(message || `O SQLite não conseguiu ${operation}.`);
  }

  return result.changes;
}

function readRows(result, operation) {
  const message = sqliteErrorMessage(result);
  if (message) {
    throw new Error(message);
  }

  if (!Array.isArray(result?.values)) {
    throw new Error(`O SQLite não retornou linhas ao ${operation}.`);
  }

  return result.values;
}

/**
 * Repository using the shared connection managed by database.js. A provider
 * can be injected to keep persistence operations easy to isolate in callers.
 * @param {() => Promise<import('@capacitor-community/sqlite').SQLiteDBConnection>} databaseProvider
 */
export class SqliteRefuellingRepository {
  constructor(databaseProvider = openDatabase) {
    if (typeof databaseProvider !== 'function') {
      throw new TypeError('Informe uma função que forneça a conexão SQLite.');
    }

    this.databaseProvider = databaseProvider;
  }

  async queryRows(statement, values = [], connection = null) {
    const database = connection ?? await this.databaseProvider();
    const result = await database.query(statement, values);
    return readRows(result, 'executar a consulta');
  }

  async create(record) {
    const connection = await this.databaseProvider();
    const result = await connection.run(`
      INSERT INTO REFUELLING (
        Liters,
        Bl_additive,
        Mileage,
        Bl_full_tank,
        Dh_refuelling,
        Cd_status,
        Gas_price,
        GAS_STATION_ID
      ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `, [
      record.liters,
      toSqliteBoolean(record.blAdditive, 'Bl_additive'),
      record.mileage ?? null,
      toSqliteBoolean(record.blFullTank, 'Bl_full_tank'),
      record.occurredAt ?? new Date().toISOString(),
      record.gasPrice ?? null,
      record.gasStationId ?? null,
    ]);
    const changes = assertSqliteSucceeded(result, 'registrar o abastecimento');
    const insertedId = Number(changes.lastId);

    if (!Number.isInteger(insertedId) || insertedId <= 0) {
      throw new Error('O SQLite não retornou o identificador do abastecimento criado.');
    }

    const [row] = await this.queryRows(`
      SELECT ${SELECT_REFUELLING_COLUMNS}
      FROM REFUELLING
      WHERE Refuelling_id = ?
    `, [insertedId], connection);
    const savedRecord = mapRefuellingRow(row);

    if (!savedRecord) {
      throw new Error('O abastecimento foi gravado, mas não pôde ser lido novamente.');
    }

    return {
      ...savedRecord,
      consumptionKmPerLiter: record.consumptionKmPerLiter ?? null,
    };
  }

  async getLatest() {
    const [row] = await this.queryRows(`
      SELECT ${SELECT_REFUELLING_COLUMNS}
      FROM REFUELLING
      WHERE Cd_status = 1
      ORDER BY Dh_refuelling DESC, Refuelling_id DESC
      LIMIT 1
    `);

    return mapRefuellingRow(row);
  }

  async getAll() {
    const rows = await this.queryRows(`
      SELECT ${SELECT_REFUELLING_COLUMNS}
      FROM REFUELLING
      WHERE Cd_status = 1
      ORDER BY Dh_refuelling DESC, Refuelling_id DESC
    `);

    return rows.map(mapRefuellingRow);
  }

  async getMonthlyExpense(month, year) {
    validateMonthAndYear(month, year);
    const { start, end } = getMonthRange(month, year);
    const [row] = await this.queryRows(`
      SELECT COALESCE(SUM(Liters * Gas_price), 0) AS monthlyExpense
      FROM REFUELLING
      WHERE Cd_status = 1
        AND Dh_refuelling >= ?
        AND Dh_refuelling < ?
    `, [start, end]);

    return Number(row?.monthlyExpense ?? 0);
  }

  async getAverageConsumption() {
    const rows = await this.queryRows(`
      SELECT Mileage AS mileage, Liters AS liters
      FROM REFUELLING
      WHERE Cd_status = 1
        AND Bl_full_tank = 1
        AND Mileage IS NOT NULL
        AND Liters > 0
      ORDER BY Dh_refuelling DESC, Refuelling_id DESC
      LIMIT 2
    `);

    if (rows.length < 2) {
      return 0;
    }

    const [latest, previous] = rows;
    const distance = Number(latest.mileage) - Number(previous.mileage);
    if (distance <= 0) {
      return 0;
    }

    return Math.round(((distance / Number(latest.liters)) + Number.EPSILON) * 100) / 100;
  }

  async getTotalKm() {
    const [row] = await this.queryRows(`
        SELECT Mileage AS TotalKm
        FROM REFUELLING
        WHERE Cd_status = 1
          AND Mileage IS NOT NULL
        ORDER BY Dh_refuelling DESC, Refuelling_id DESC
        LIMIT 1
      `);

    return row?.TotalKm !== undefined && row?.TotalKm !== null ? Number(row.TotalKm) : 0;
  }

  async softDelete(id) {
    const connection = await this.databaseProvider();
    const result = await connection.run(`
      UPDATE REFUELLING
      SET Cd_status = 0
      WHERE Refuelling_id = ? AND Cd_status = 1
    `, [id]);
    const changes = assertSqliteSucceeded(result, 'inativar o abastecimento');

    return changes.changes > 0;
  }
}
