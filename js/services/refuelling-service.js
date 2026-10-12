const DEFAULT_TIMESTAMP = () => new Date();

function requireFiniteNumber(value, fieldName) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${fieldName} precisa ser um número válido.`);
  }

  return value;
}

function normalizeOptionalNonNegativeNumber(value, fieldName) {
  if (value === undefined || value === null) {
    return null;
  }

  const number = requireFiniteNumber(value, fieldName);
  if (number < 0) {
    throw new RangeError(`${fieldName} não pode ser negativo.`);
  }

  return number;
}

function roundTo(value, decimalPlaces) {
  const factor = 10 ** decimalPlaces;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function normalizeOccurredAt(value) {
  const occurredAt = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(occurredAt.getTime())) {
    throw new TypeError('A data do abastecimento é inválida.');
  }

  return occurredAt.toISOString();
}

function validateAndNormalizeInput(input, tankCapacityLiters) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Os dados do abastecimento são obrigatórios.');
  }

  const liters = requireFiniteNumber(input.liters, 'Litros');
  if (liters <= 0) {
    throw new RangeError('A quantidade de litros precisa ser maior que zero.');
  }
  if (tankCapacityLiters !== null && liters > tankCapacityLiters) {
    throw new RangeError(`A quantidade de litros não pode exceder a capacidade do tanque (${tankCapacityLiters} L).`);
  }

  const mileage = input.mileage === undefined || input.mileage === null || input.mileage === ''
    ? null
    : requireFiniteNumber(input.mileage, 'Quilometragem');
  if (mileage !== null && (!Number.isInteger(mileage) || mileage < 0)) {
    throw new RangeError('A quilometragem precisa ser um número inteiro maior ou igual a zero.');
  }

  if (typeof input.blFullTank !== 'boolean') {
    throw new TypeError('Informe se o tanque foi completado.');
  }

  if (input.blAdditive !== undefined && input.blAdditive !== null && typeof input.blAdditive !== 'boolean') {
    throw new TypeError('A informação sobre gasolina aditivada precisa ser verdadeira ou falsa.');
  }

  return {
    liters,
    mileage,
    gasPrice: normalizeOptionalNonNegativeNumber(input.gasPrice, 'O preço por litro'),
    blAdditive: input.blAdditive ?? null,
    blFullTank: input.blFullTank,
    occurredAt: normalizeOccurredAt(input.occurredAt ?? DEFAULT_TIMESTAMP()),
  };
}

/**
 * Business rules for refuelling records.
 *
 * The injected repository must implement:
 * - getLatest(): returns the latest record or null
 * - create(record): persists the record and may return it or its id
 *
 * Tank capacity is optional and only validated when the motorcycle's capacity
 * is configured. The service remains independent from SQLite.
 */
export class RefuellingService {
  constructor(repository, { tankCapacityLiters } = {}) {
    if (!repository || typeof repository.getLatest !== 'function' || typeof repository.create !== 'function') {
      throw new TypeError('O repositório precisa implementar getLatest() e create().');
    }

    if (tankCapacityLiters !== undefined
      && tankCapacityLiters !== null
      && (typeof tankCapacityLiters !== 'number' || !Number.isFinite(tankCapacityLiters) || tankCapacityLiters <= 0)) {
      throw new TypeError('Informe uma capacidade de tanque válida em litros.');
    }

    this.repository = repository;
    this.tankCapacityLiters = tankCapacityLiters ?? null;
  }

  async create(input) {
    const refuelling = validateAndNormalizeInput(input, this.tankCapacityLiters);
    const previous = await this.repository.getLatest();
    let previousMileage = null;

    if (refuelling.mileage !== null && previous?.mileage !== undefined && previous?.mileage !== null) {
      previousMileage = requireFiniteNumber(previous.mileage, 'Quilometragem do abastecimento anterior');

      if (refuelling.mileage <= previousMileage) {
        throw new RangeError('A quilometragem precisa ser maior que a do abastecimento anterior.');
      }
    }

    const total = refuelling.gasPrice === null
      ? null
      : roundTo(refuelling.liters * refuelling.gasPrice, 2);

    const consumptionKmPerLiter = previous?.blFullTank === true
      && previousMileage !== null
      && refuelling.mileage !== null
      && refuelling.blFullTank
      ? roundTo((refuelling.mileage - previousMileage) / refuelling.liters, 2)
      : null;

    const record = {
      ...refuelling,
      total,
      consumptionKmPerLiter,
    };

    const savedRecord = await this.repository.create(record);
    if (savedRecord && typeof savedRecord === 'object') {
      return { ...record, ...savedRecord };
    }

    return savedRecord === undefined || savedRecord === null
      ? record
      : { ...record, id: savedRecord };
  }
}
