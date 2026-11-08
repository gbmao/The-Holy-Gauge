function normalizeOptionalText(value, fieldName) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new TypeError(`${fieldName} precisa ser um texto.`);
  }

  return value.trim() || null;
}

function normalizeOptionalInteger(value, fieldName, minimum = 1) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const number = typeof value === 'number'
    ? value
    : typeof value === 'string' && /^\d+$/.test(value.trim())
      ? Number(value.trim())
      : Number.NaN;

  if (!Number.isSafeInteger(number) || number < minimum) {
    throw new RangeError(`${fieldName} precisa ser um número inteiro maior ou igual a ${minimum}.`);
  }

  return number;
}

export class Vehicle {
  constructor({ id = null, name, brand = null, model = null, year = null } = {}) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new TypeError('O nome do veículo é obrigatório.');
    }

    this.id = normalizeOptionalInteger(id, 'O ID do veículo');
    this.name = name.trim();
    this.brand = normalizeOptionalText(brand, 'A marca');
    this.model = normalizeOptionalText(model, 'O modelo');
    this.year = normalizeOptionalInteger(year, 'O ano do veículo');
  }
}
