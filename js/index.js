import './app.js';
import { fuelingApi } from './api.js';

const averageConsumptionElement = document.querySelector('#kmPerLiter');

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

loadAverageConsumption();
