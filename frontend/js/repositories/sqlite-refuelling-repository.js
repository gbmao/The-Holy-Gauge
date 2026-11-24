import { openDatabase } from '../database/database.js';
import { assertSqliteSucceeded, sqliteErrorMessage } from '../database/sqlite-utils.js';
import { getSelectedVehicleId } from '../vehicle-selection.js';
import { requireSelectedVehicle } from './selected-vehicle.js';
import { VehicleRequiredError } from '../vehicle-required-error.js';

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
  VEHICLE_ID AS vehicleId,
  CASE
    WHEN Gas_price IS NULL THEN NULL
    ELSE ROUND(Liters * Gas_price, 2)
  END AS total
`;

function validateRefuellingId(id) {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new RangeError('O ID do abastecimento precisa ser um número inteiro positivo.');
  }
}

const SELECTED_VEHICLE_EXISTS = `EXISTS (
  SELECT 1 FROM VEHICLE
  WHERE VEHICLE_ID = REFUELLING.VEHICLE_ID AND CD_STATUS = 1 AND IS_SELECTED = 1
)`;

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
    vehicleId: row.vehicleId === null || row.vehicleId === undefined ? null : Number(row.vehicleId),
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
    const vehicleId = await requireSelectedVehicle(connection);
    const result = await connection.run(`
      INSERT INTO REFUELLING (
        Liters,
        Bl_additive,
        Mileage,
        Bl_full_tank,
        Dh_refuelling,
        Cd_status,
        Gas_price,
        GAS_STATION_ID,
        VEHICLE_ID
      ) SELECT ?, ?, ?, ?, ?, 1, ?, ?, ?
      WHERE EXISTS (
        SELECT 1 FROM VEHICLE
        WHERE VEHICLE_ID = ? AND CD_STATUS = 1 AND IS_SELECTED = 1
      )
    `, [
      record.liters,
      toSqliteBoolean(record.blAdditive, 'Bl_additive'),
      record.mileage ?? null,
      toSqliteBoolean(record.blFullTank, 'Bl_full_tank'),
      record.occurredAt ?? new Date().toISOString(),
      record.gasPrice ?? null,
      record.gasStationId ?? null,
      vehicleId,
      vehicleId,
    ]);
    const changes = assertSqliteSucceeded(result, 'registrar o abastecimento');
    if (changes.changes === 0) {
      throw new VehicleRequiredError();
    }
    const insertedId = Number(changes.lastId);

    if (!Number.isInteger(insertedId) || insertedId <= 0) {
      throw new Error('O SQLite não retornou o identificador do abastecimento criado.');
    }

    const [row] = await this.queryRows(`
      SELECT ${SELECT_REFUELLING_COLUMNS}
      FROM REFUELLING
      WHERE Refuelling_id = ? AND VEHICLE_ID IS ?
    `, [insertedId, vehicleId], connection);
    const savedRecord = mapRefuellingRow(row);

    if (!savedRecord) {
      throw new Error('O abastecimento foi gravado, mas não pôde ser lido novamente.');
    }

    return {
      ...savedRecord,
      consumptionKmPerLiter: record.consumptionKmPerLiter ?? null,
    };
  }

  async getLatest(before = null) {
    const vehicleId = await getSelectedVehicleId();
    if (vehicleId === null) {
      return null;
    }

    const [row] = await this.queryRows(`
      SELECT ${SELECT_REFUELLING_COLUMNS}
      FROM REFUELLING
      WHERE Cd_status = 1 AND VEHICLE_ID = ?
        AND (? IS NULL OR julianday(Dh_refuelling) <= julianday(?))
      ORDER BY julianday(Dh_refuelling) DESC, Refuelling_id DESC
      LIMIT 1
    `, [vehicleId, before, before]);

    return mapRefuellingRow(row);
  }

  async getRecent() {
    const vehicleId = await getSelectedVehicleId();
    if (vehicleId === null) {
      return [];
    }

    const rows = await this.queryRows(`
      SELECT ${SELECT_REFUELLING_COLUMNS}
      FROM REFUELLING
      WHERE Cd_status = 1 AND VEHICLE_ID = ?
      ORDER BY julianday(Dh_refuelling) DESC, Refuelling_id DESC
      LIMIT 3
    `, [vehicleId]);

    return rows.map(mapRefuellingRow);
  }

  async getAll() {
    const vehicleId = await getSelectedVehicleId();
    if (vehicleId === null) {
      return [];
    }

    const rows = await this.queryRows(`
      SELECT ${SELECT_REFUELLING_COLUMNS}
      FROM REFUELLING
      WHERE Cd_status = 1 AND VEHICLE_ID = ?
      ORDER BY julianday(Dh_refuelling) DESC, Refuelling_id DESC
    `, [vehicleId]);

    return rows.map(mapRefuellingRow);
  }

  async getById(id) {
    validateRefuellingId(id);
    const [row] = await this.queryRows(`
      SELECT ${SELECT_REFUELLING_COLUMNS} FROM REFUELLING
      WHERE Refuelling_id = ? AND Cd_status = 1 AND ${SELECTED_VEHICLE_EXISTS}
    `, [id]);
    return mapRefuellingRow(row);
  }

  async getDeleted() {
    const rows = await this.queryRows(`
      SELECT ${SELECT_REFUELLING_COLUMNS} FROM REFUELLING
      WHERE Cd_status = 0 AND ${SELECTED_VEHICLE_EXISTS}
      ORDER BY julianday(Dh_refuelling) DESC, Refuelling_id DESC
    `);
    return rows.map(mapRefuellingRow);
  }

  async getDeletedById(id) {
    validateRefuellingId(id);
    const [row] = await this.queryRows(`
      SELECT ${SELECT_REFUELLING_COLUMNS} FROM REFUELLING
      WHERE Refuelling_id = ? AND Cd_status = 0 AND ${SELECTED_VEHICLE_EXISTS}
    `, [id]);
    return mapRefuellingRow(row);
  }

  async getMileageNeighbors(id, occurredAt) {
    if (id !== null) validateRefuellingId(id);
    // An inserted record follows existing IDs when its timestamp ties.
    const positionId = id ?? Number.MAX_SAFE_INTEGER;
    const connection = await this.databaseProvider();
    const vehicleId = await requireSelectedVehicle(connection);
    const result = {};
    for (const [key, comparison, order] of [
      ['previousMileage', '<', 'DESC'], ['nextMileage', '>', 'ASC'],
    ]) {
      const [row] = await this.queryRows(`
        SELECT Mileage AS mileage FROM REFUELLING
        WHERE VEHICLE_ID = ? AND Cd_status = 1 AND Mileage IS NOT NULL
          AND Refuelling_id <> ?
          AND (julianday(Dh_refuelling) ${comparison} julianday(?)
            OR (julianday(Dh_refuelling) = julianday(?) AND Refuelling_id ${comparison} ?))
        ORDER BY julianday(Dh_refuelling) ${order}, Refuelling_id ${order}
        LIMIT 1
      `, [vehicleId, positionId, occurredAt, occurredAt, positionId], connection);
      result[key] = row ? Number(row.mileage) : null;
    }
    return result;
  }

  async update(id, record) {
    validateRefuellingId(id);
    const connection = await this.databaseProvider();
    const vehicleId = await requireSelectedVehicle(connection);
    const result = await connection.run(`
      UPDATE REFUELLING
      SET Liters = ?, Bl_additive = ?, Mileage = ?, Bl_full_tank = ?,
          Dh_refuelling = ?, Gas_price = ?
      WHERE Refuelling_id = ? AND VEHICLE_ID = ? AND Cd_status = 1
        AND ${SELECTED_VEHICLE_EXISTS}
    `, [record.liters, toSqliteBoolean(record.blAdditive, 'Bl_additive'),
      record.mileage ?? null, toSqliteBoolean(record.blFullTank, 'Bl_full_tank'),
      record.occurredAt, record.gasPrice ?? null, id, vehicleId]);
    if (assertSqliteSucceeded(result, 'atualizar o abastecimento').changes === 0) return null;

    const [row] = await this.queryRows(`
      SELECT ${SELECT_REFUELLING_COLUMNS} FROM REFUELLING
      WHERE Refuelling_id = ? AND VEHICLE_ID = ? AND Cd_status = 1
    `, [id, vehicleId], connection);
    if (!row) throw new Error('O abastecimento foi atualizado, mas não pôde ser lido novamente.');
    return mapRefuellingRow(row);
  }

  async getMonthlyExpense(month, year) {
    validateMonthAndYear(month, year);
    const vehicleId = await getSelectedVehicleId();
    if (vehicleId === null) {
      return 0;
    }

    const { start, end } = getMonthRange(month, year);
    const [row] = await this.queryRows(`
      SELECT
        COALESCE((
          SELECT SUM(Liters * Gas_price)
          FROM REFUELLING
          WHERE Cd_status = 1
            AND VEHICLE_ID = ?
            AND Dh_refuelling >= ?
            AND Dh_refuelling < ?
        ), 0)
        + COALESCE((
          SELECT SUM(COST)
          FROM MAINTENANCE
          WHERE Cd_status = 1
            AND VEHICLE_ID = ?
            AND MAINTENANCEDATE >= ?
            AND MAINTENANCEDATE < ?
        ), 0) AS monthlyExpense
    `, [vehicleId, start, end, vehicleId, start, end]);

    return Number(row?.monthlyExpense ?? 0);
  }

  async getAverageConsumption() {
    const vehicleId = await getSelectedVehicleId();
    if (vehicleId === null) {
      return null;
    }

    const rows = await this.queryRows(`
      SELECT Mileage AS mileage, Liters AS liters, Bl_full_tank AS blFullTank
      FROM REFUELLING
      WHERE Cd_status = 1
        AND VEHICLE_ID = ?
      ORDER BY julianday(Dh_refuelling) DESC, Refuelling_id DESC
      LIMIT 2
    `, [vehicleId]);

    if (rows.length < 2) {
      return null;
    }

    const [latest, previous] = rows;
    // Select consecutive records first: a partial or incomplete entry must
    // interrupt the pair instead of being skipped in search of older full tanks.
    if (Number(latest.blFullTank) !== 1 || Number(previous.blFullTank) !== 1
      || latest.mileage === null || latest.mileage === undefined
      || previous.mileage === null || previous.mileage === undefined) {
      return null;
    }

    const latestMileage = Number(latest.mileage);
    const previousMileage = Number(previous.mileage);
    const liters = Number(latest.liters);
    const distance = latestMileage - previousMileage;
    if (!Number.isFinite(latestMileage) || !Number.isFinite(previousMileage)
      || !Number.isFinite(liters) || liters <= 0 || distance <= 0) {
      return null;
    }

    return Math.round(((distance / liters) + Number.EPSILON) * 100) / 100;
  }

  async getTotalKm() {
    const vehicleId = await getSelectedVehicleId();
    if (vehicleId === null) {
      return 0;
    }

    const [row] = await this.queryRows(`
        SELECT Mileage AS TotalKm
        FROM REFUELLING
        WHERE Cd_status = 1
          AND VEHICLE_ID = ?
          AND Mileage IS NOT NULL
        ORDER BY julianday(Dh_refuelling) DESC, Refuelling_id DESC
        LIMIT 1
      `, [vehicleId]);

    return row?.TotalKm !== undefined && row?.TotalKm !== null ? Number(row.TotalKm) : 0;
  }

  async softDelete(id) {
    return this.setStatus(id, 0);
  }

  async restore(id) {
    return this.setStatus(id, 1);
  }

  async setStatus(id, status) {
    validateRefuellingId(id);
    const connection = await this.databaseProvider();
    const vehicleId = await requireSelectedVehicle(connection);
    const result = await connection.run(`
      UPDATE REFUELLING
      SET Cd_status = ?
      WHERE Refuelling_id = ? AND VEHICLE_ID = ? AND Cd_status = ?
        AND ${SELECTED_VEHICLE_EXISTS}
    `, [status, id, vehicleId, status === 0 ? 1 : 0]);
    const changes = assertSqliteSucceeded(result, status === 0 ? 'excluir o abastecimento' : 'recuperar o abastecimento');

    return changes.changes > 0;
  }
}
