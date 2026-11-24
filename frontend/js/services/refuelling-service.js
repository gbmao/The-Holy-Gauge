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

function validateRefuellingId(id) {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new RangeError('O ID do abastecimento precisa ser um número inteiro positivo.');
  }
}

function normalizeOccurredAt(value) {
  if (typeof value === 'string') {
    const parts = /^(\d{4})-(\d{2})-(\d{2})(?:T| |$)/.exec(value);
    if (parts) {
      const [year, month, day] = parts.slice(1).map(Number);
      const calendarDate = new Date(0);
      calendarDate.setUTCFullYear(year, month - 1, day);
      if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1
        || calendarDate.getUTCDate() !== day) {
        throw new TypeError('A data do abastecimento é inválida.');
      }
    }
  }
  const occurredAt = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(occurredAt.getTime()) || occurredAt.getUTCFullYear() < 1 || occurredAt.getUTCFullYear() > 9999) {
    throw new TypeError('A data do abastecimento é inválida.');
  }

  return occurredAt.toISOString();
}

function validateAndNormalizeInput(input, tankCapacityLiters, { allowUnknownFullTank = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Os dados do abastecimento são obrigatórios.');
  }

  const liters = requireFiniteNumber(input.liters, 'Litros');
  if (liters <= 0) {
    throw new RangeError('A quantidade de litros precisa ser maior que zero.');
  }
  if (liters > 999.99) {
    throw new RangeError('A quantidade de litros não pode ultrapassar 999,99 L.');
  }
  if (tankCapacityLiters !== null && liters > tankCapacityLiters) {
    throw new RangeError(`A quantidade de litros não pode exceder a capacidade do tanque (${tankCapacityLiters} L).`);
  }

  const mileage = input.mileage === undefined || input.mileage === null || input.mileage === ''
    ? null
    : requireFiniteNumber(input.mileage, 'Quilometragem');
  if (mileage !== null && (!Number.isSafeInteger(mileage) || mileage < 0)) {
    throw new RangeError('A quilometragem precisa ser um número inteiro maior ou igual a zero.');
  }

  if (typeof input.blFullTank !== 'boolean' && !(allowUnknownFullTank && input.blFullTank === null)) {
    throw new TypeError('Informe se o tanque foi completado.');
  }

  if (input.blAdditive !== undefined && input.blAdditive !== null && typeof input.blAdditive !== 'boolean') {
    throw new TypeError('A informação sobre gasolina aditivada precisa ser verdadeira ou falsa.');
  }

  const gasPrice = normalizeOptionalNonNegativeNumber(input.gasPrice, 'O preço por litro');
  if (gasPrice !== null && gasPrice > 999.999) {
    throw new RangeError('O preço por litro não pode ultrapassar R$ 999,999.');
  }

  return {
    liters,
    mileage,
    gasPrice,
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
 * - getById(), getDeletedById(), getDeleted(): active/deleted records for the selected vehicle
 * - getMileageNeighbors(id, occurredAt): nearest known odometers in chronological order
 * - update(), softDelete(), restore(): persist corrections and status changes
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

  async getById(id) {
    validateRefuellingId(id);
    return this.repository.getById(id);
  }

  async getDeleted() {
    return this.repository.getDeleted();
  }

  async validateChronology(id, record) {
    if (record.mileage === null) return;
    const { previousMileage, nextMileage } = await this.repository.getMileageNeighbors(id, record.occurredAt);
    if (previousMileage !== null && record.mileage <= previousMileage) {
      throw new RangeError(`A quilometragem precisa ser maior que a do abastecimento anterior (${previousMileage.toLocaleString('pt-BR')} km).`);
    }
    if (nextMileage !== null && record.mileage >= nextMileage) {
      throw new RangeError(`A quilometragem precisa ser menor que a do abastecimento posterior (${nextMileage.toLocaleString('pt-BR')} km).`);
    }
  }

  async update(id, input) {
    validateRefuellingId(id);
    const current = await this.repository.getById(id);
    if (!current) throw new Error('O abastecimento não foi encontrado ou não está mais ativo neste veículo.');
    const record = validateAndNormalizeInput({ ...input, occurredAt: input?.occurredAt ?? current.occurredAt },
      this.tankCapacityLiters, { allowUnknownFullTank: true });
    await this.validateChronology(id, record);
    const saved = await this.repository.update(id, record);
    if (!saved) throw new Error('O abastecimento não foi encontrado ou não está mais ativo neste veículo.');
    return saved;
  }

  async restore(id) {
    validateRefuellingId(id);
    const record = await this.repository.getDeletedById(id);
    if (!record) throw new Error('O abastecimento excluído não foi encontrado neste veículo.');
    try {
      await this.validateChronology(id, record);
    } catch (error) {
      if (error instanceof RangeError) {
        throw new RangeError(`Não foi possível recuperar: ${error.message} Confira os registros ativos antes de tentar novamente.`);
      }
      throw error;
    }
    if (!await this.repository.restore(id)) throw new Error('O abastecimento excluído não foi encontrado neste veículo.');
    return true;
  }

  async delete(id) {
    validateRefuellingId(id);
    if (!await this.repository.softDelete(id)) {
      throw new Error('O abastecimento não foi encontrado ou não está mais ativo neste veículo.');
    }
    return true;
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
