const DEFAULT_TIMESTAMP = () => new Date();

function normalizeOptionalNonNegativeNumber(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${fieldName} precisa ser um número válido.`);
  }

  if (value < 0) {
    throw new RangeError(`${fieldName} não pode ser negativo.`);
  }

  return value;
}

function normalizeOptionalKilometers(value, fieldName) {
  const kilometers = normalizeOptionalNonNegativeNumber(value, fieldName);

  if (kilometers !== null && !Number.isInteger(kilometers)) {
    throw new RangeError(`${fieldName} precisa ser um número inteiro maior ou igual a zero.`);
  }

  return kilometers;
}

function normalizeDate(value, fieldName, defaultValue = null) {
  if (value === undefined || value === null || value === '') {
    value = defaultValue;
  }

  if (value === null) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`${fieldName} é inválida.`);
  }

  return date.toISOString();
}

function normalizeAndValidateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Os dados da manutenção são obrigatórios.');
  }

  if (typeof input.description !== 'string' || input.description.trim() === '') {
    throw new TypeError('A descrição da manutenção é obrigatória.');
  }

  const description = input.description.trim();
  if (description.length > 225) {
    throw new RangeError('A descrição não pode ultrapassar 225 caracteres.');
  }

  if (input.notes !== undefined && input.notes !== null && typeof input.notes !== 'string') {
    throw new TypeError('As observações precisam ser um texto.');
  }

  const date = normalizeDate(input.date, 'A data da manutenção', DEFAULT_TIMESTAMP());
  const nextDate = normalizeDate(input.nextDate, 'A data da próxima manutenção');
  const cost = normalizeOptionalNonNegativeNumber(input.cost, 'O custo');
  const kilometers = normalizeOptionalKilometers(input.kilometers, 'A quilometragem');
  const nextKilometers = normalizeOptionalKilometers(input.nextKilometers, 'A próxima quilometragem');

  if (nextDate !== null && new Date(nextDate).getTime() < new Date(date).getTime()) {
    throw new RangeError('A próxima data não pode ser anterior à data da manutenção.');
  }

  return {
    description,
    date,
    cost,
    kilometers,
    nextKilometers,
    nextDate,
    notes: input.notes?.trim() || null,
  };
}

/**
 * Business rules for maintenance records. The injected repository must
 * implement getAllMaintenances(), getLatestRefuellingMileage() and create().
 */
export class MaintenanceService {
  constructor(repository) {
    if (!repository
      || typeof repository.getAllMaintenances !== 'function'
      || typeof repository.getLatestRefuellingMileage !== 'function'
      || typeof repository.create !== 'function') {
      throw new TypeError(
        'O repositório precisa implementar getAllMaintenances(), getLatestRefuellingMileage() e create().',
      );
    }

    this.repository = repository;
  }

  async getAllMaintenances() {
    return this.repository.getAllMaintenances();
  }

  async create(input) {
    const maintenance = normalizeAndValidateInput(input);
    const latestMileage = await this.repository.getLatestRefuellingMileage();

    if (latestMileage !== null && latestMileage !== undefined) {
      if (maintenance.kilometers !== null && maintenance.kilometers < latestMileage) {
        throw new RangeError('A quilometragem não pode ser menor que a do último abastecimento.');
      }

      const effectiveMileage = maintenance.kilometers ?? latestMileage;
      if (maintenance.nextKilometers !== null && maintenance.nextKilometers < effectiveMileage) {
        throw new RangeError('A próxima quilometragem não pode ser menor que a quilometragem atual.');
      }
    } else if (maintenance.kilometers !== null
      && maintenance.nextKilometers !== null
      && maintenance.nextKilometers < maintenance.kilometers) {
      throw new RangeError('A próxima quilometragem não pode ser menor que a quilometragem atual.');
    }

    const savedRecord = await this.repository.create(maintenance);
    if (savedRecord && typeof savedRecord === 'object') {
      return { ...maintenance, ...savedRecord };
    }

    return savedRecord === undefined || savedRecord === null
      ? maintenance
      : { ...maintenance, id: savedRecord };
  }
}
