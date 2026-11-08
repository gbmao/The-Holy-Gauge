import { Vehicle } from '../models/vehicle.js';

export class VehicleService {
  constructor(repository) {
    if (!repository || typeof repository.create !== 'function') {
      throw new TypeError('O repositório de veículos precisa implementar create().');
    }

    this.repository = repository;
  }

  async create(input) {
    const vehicle = input instanceof Vehicle ? input : new Vehicle(input);
    const savedVehicle = await this.repository.create(vehicle);

    if (savedVehicle instanceof Vehicle) {
      return savedVehicle;
    }

    if (savedVehicle && typeof savedVehicle === 'object') {
      return new Vehicle({ ...vehicle, ...savedVehicle });
    }

    if (Number.isSafeInteger(savedVehicle) && savedVehicle > 0) {
      return new Vehicle({ ...vehicle, id: savedVehicle });
    }

    throw new Error('O repositório não retornou o veículo criado.');
  }

  async getAll() {
    if (typeof this.repository.getAll !== 'function') {
      throw new TypeError('O repositório de veículos precisa implementar getAll().');
    }

    const vehicles = await this.repository.getAll();
    if (!Array.isArray(vehicles)) {
      throw new TypeError('O repositório não retornou uma lista de veículos.');
    }

    return vehicles.map((vehicle) => (
      vehicle instanceof Vehicle ? vehicle : new Vehicle(vehicle)
    ));
  }
}
