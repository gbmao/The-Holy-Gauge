export function formatAverageConsumption(value) {
  // Number(null) is zero, so absence must be checked before converting.
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const consumption = Number(value);
  return Number.isFinite(consumption) && consumption >= 0
    ? consumption.toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })
    : '—';
}
