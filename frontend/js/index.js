import { closeAllOverlays } from './app.js';
import './keyboard-viewport.js';
import { fuelingApi } from './api.js';
import { loadSelectedVehicleId } from './vehicle-selection.js';
import { VehiclePhotoModal } from '../pages/vehicle-photo-modal.js';
import { formatAverageConsumption } from './formatters/consumption.js';

new VehiclePhotoModal(document.querySelector('#appShell'), { closeOverlays: closeAllOverlays });

const averageConsumptionElement = document.querySelector('#kmPerLiter');
const totalKmElement = document.querySelector('#totalKm');

function formatTotalKm(value) {
  const totalKm = Number(value);

  return Number.isFinite(totalKm)
    ? totalKm.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
    : '0';
}

async function loadAverageConsumption() {
  if (!averageConsumptionElement) {
    return;
  }

  averageConsumptionElement.textContent = '—';

  try {
    const averageConsumption = await fuelingApi.getAverageConsumption();
    averageConsumptionElement.textContent = formatAverageConsumption(averageConsumption);
  } catch {
    averageConsumptionElement.textContent = '—';
  }
}

async function loadTotalKm() {
  if (!totalKmElement) {
    return;
  }

  totalKmElement.textContent = '0';

  try {
    const totalKm = await fuelingApi.getTotalKm();
    totalKmElement.textContent = formatTotalKm(totalKm);
  } catch {
    totalKmElement.textContent = '0';
  }
}

loadTotalKm();
window.addEventListener('fueling-record-added', loadTotalKm);

loadAverageConsumption();
window.addEventListener('fueling-record-added', loadAverageConsumption);

loadSelectedVehicleId();

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    loadAverageConsumption();
    loadTotalKm();
  }
});
