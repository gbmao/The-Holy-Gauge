import './app.js';
import { fuelingApi } from './api.js';

const averageConsumptionElement = document.querySelector('#kmPerLiter');
const totalKmElement = document.querySelector('#totalKm');

function formatTotalKm(value) {
  const totalKm = Number(value);

  return Number.isFinite(totalKm)
    ? totalKm.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
    : '0';
}

function formatAverageConsumption(value) {
  const consumption = Number(value);

  return Number.isFinite(consumption)
    ? consumption.toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })
    : '0,0';
}

async function loadAverageConsumption() {
  if (!averageConsumptionElement) {
    return;
  }

  averageConsumptionElement.textContent = '0,0';

  try {
    const averageConsumption = await fuelingApi.getAverageConsumption();
    averageConsumptionElement.textContent = formatAverageConsumption(averageConsumption);
  } catch {
    averageConsumptionElement.textContent = '0,0';
  }
}

async function loadTotalKm() {
  if (!totalKmElement) {
    return;
  }

  totalKmElement.textContent = '0';

  try {
    const totalKm = await fuelingApi.getTotalMileage();
    totalKmElement.textContent = formatTotalKm(totalKm);
  } catch {
    totalKmElement.textContent = '0';
  }
}

loadTotalKm();

loadAverageConsumption();
window.addEventListener('fueling-record-added', loadAverageConsumption);
