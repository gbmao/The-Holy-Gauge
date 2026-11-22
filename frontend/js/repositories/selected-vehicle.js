import { sqliteErrorMessage } from '../database/sqlite-utils.js';
import { VehicleRequiredError } from '../vehicle-required-error.js';

/** Read the selection from the same database that will receive the record. */
export async function requireSelectedVehicle(connection) {
  const result = await connection.query(`
    SELECT VEHICLE_ID AS id
    FROM VEHICLE
    WHERE CD_STATUS = 1 AND IS_SELECTED = 1
    ORDER BY VEHICLE_ID ASC
    LIMIT 1
  `);
  const message = sqliteErrorMessage(result);
  if (message || !Array.isArray(result?.values)) {
    throw new Error(message || 'Não foi possível consultar o veículo selecionado.');
  }

  const vehicleId = Number(result.values[0]?.id);
  if (!Number.isSafeInteger(vehicleId) || vehicleId <= 0) {
    throw new VehicleRequiredError();
  }

  return vehicleId;
}
