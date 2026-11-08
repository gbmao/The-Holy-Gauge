export const VEHICLE_PHOTO_TYPE = 'vehicle';

export function requirePhotoVehicleId(vehicleId) {
  if (!Number.isSafeInteger(vehicleId) || vehicleId <= 0) {
    throw new RangeError('Selecione um veículo válido para gerenciar sua foto.');
  }
  return vehicleId;
}

export class Photo {
  constructor({ id = null, filePath, vehicleId, type = VEHICLE_PHOTO_TYPE } = {}) {
    if (id !== null && (!Number.isSafeInteger(id) || id <= 0)) {
      throw new RangeError('O ID da foto precisa ser um número inteiro positivo.');
    }
    if (typeof filePath !== 'string' || !filePath.trim()) {
      throw new TypeError('O caminho da foto é obrigatório.');
    }
    if (typeof type !== 'string' || !type.trim()) {
      throw new TypeError('O tipo da foto é obrigatório.');
    }

    this.id = id;
    this.filePath = filePath.trim();
    this.vehicleId = requirePhotoVehicleId(vehicleId);
    this.type = type.trim();
  }
}
