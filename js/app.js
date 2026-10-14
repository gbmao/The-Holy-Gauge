import { fuelingApi, maintenanceApi } from './api.js';
import { createBottomSheets } from './bottom-sheet.js';
import { createSidebar } from './sidebar.js';

const appShell = document.querySelector('#appShell');
const backdrop = document.querySelector('#backdrop');
const homeMotorcycleImage = document.querySelector('#homeMotorcycleImage');

const IMAGE_STORAGE_KEY = 'controlador-da-moto-image';
const IMAGE_NAME_STORAGE_KEY = 'controlador-da-moto-image-name';

const placeholderMetrics = {
  kmPerLiter: '12,5',
  totalKm: '8.420',
};

function renderMotoMetrics(metrics) {
  Object.entries(metrics).forEach(([key, value]) => {
    const element = document.querySelector('[data-metric-key="' + key + '"]');

    if (element && value !== undefined && value !== null) {
      element.textContent = value;
    }
  });
}

function loadSavedMotorcycleImage() {
  if (!homeMotorcycleImage) {
    return;
  }

  try {
    const savedImage = localStorage.getItem(IMAGE_STORAGE_KEY);
    const savedImageName = localStorage.getItem(IMAGE_NAME_STORAGE_KEY);

    if (savedImage) {
      homeMotorcycleImage.src = savedImage;
      homeMotorcycleImage.alt = savedImageName || 'Imagem da minha moto';
    }
  } catch {
    // The default image remains available if browser storage is disabled.
  }
}

function buildFuelingPayload() {
  const litersInput = document.querySelector('#fuelingLitersInput');
  const mileageInput = document.querySelector('#fuelingMileageInput');
  const gasPriceInput = document.querySelector('#fuelingGasPriceInput');
  const additiveInput = document.querySelector('#fuelingAdditiveInput');
  const fullTankInput = document.querySelector('#fuelingFullTankInput');

  const litersValue = litersInput.value.trim();
  const mileageValue = mileageInput.value.trim();
  const gasPriceValue = gasPriceInput.value.trim();
  const liters = Number(litersValue);
  const mileage = mileageValue ? Number(mileageValue) : null;
  const gasPrice = gasPriceValue ? Number(gasPriceValue) : null;

  if (!litersValue || !Number.isFinite(liters) || liters < 0) {
    throw new Error('Informe uma quantidade válida de litros.');
  }

  if (mileageValue && !Number.isFinite(mileage)) {
    throw new Error('Informe uma quilometragem válida.');
  }

  if (gasPriceValue && !Number.isFinite(gasPrice)) {
    throw new Error('Informe um preço por litro válido.');
  }

  return {
    liters,
    mileage,
    gasPrice,
    blAdditive: additiveInput.checked,
    blFullTank: fullTankInput.checked,
  };
}

function toLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function readOptionalMaintenanceNumber(selector, label, { integer = false } = {}) {
  const value = document.querySelector(selector).value.trim();
  if (!value) {
    return null;
  }

  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new RangeError(`${label} precisa ser um número maior ou igual a zero.`);
  }

  if (integer && !Number.isInteger(number)) {
    throw new RangeError(`${label} precisa ser um número inteiro.`);
  }

  return number;
}

function buildMaintenancePayload() {
  const description = document.querySelector('#maintenanceDescriptionInput').value.trim();
  if (!description) {
    throw new TypeError('Informe a descrição da manutenção.');
  }

  return {
    description,
    date: document.querySelector('#maintenanceDateInput').value || toLocalDateInputValue(),
    kilometers: readOptionalMaintenanceNumber('#maintenanceKilometersInput', 'A quilometragem', { integer: true }),
    cost: readOptionalMaintenanceNumber('#maintenanceCostInput', 'O custo'),
    nextKilometers: readOptionalMaintenanceNumber(
      '#maintenanceNextKilometersInput',
      'A próxima quilometragem',
      { integer: true },
    ),
    nextDate: document.querySelector('#maintenanceNextDateInput').value || null,
    notes: document.querySelector('#maintenanceNotesInput').value.trim() || null,
  };
}

function updateOverlayState() {
  const isFuelingOpen = appShell.classList.contains('fueling-open');
  const isMaintenanceOpen = appShell.classList.contains('maintenance-open');
  const isComponentsOpen = appShell.classList.contains('components-open');
  const hasOverlayOpen = isFuelingOpen || isMaintenanceOpen || isComponentsOpen;

  backdrop.setAttribute('aria-hidden', String(!hasOverlayOpen));
  document.body.style.overflow = hasOverlayOpen ? 'hidden' : '';
}

let sidebar;
let bottomSheets;

function closeAllOverlays() {
  sidebar?.closeAll();
  bottomSheets?.closeAll();
}

renderMotoMetrics(placeholderMetrics);
loadSavedMotorcycleImage();

sidebar = createSidebar({
  appShell,
  backdrop,
  componentsPanel: document.querySelector('#componentsPanel'),
  closeComponentsButton: document.querySelector('#closeComponentsButton'),
  componentsHandle: document.querySelector('#componentsHandle'),
  onBackdrop: closeAllOverlays,
  onStateChange: updateOverlayState,
});

bottomSheets = createBottomSheets({
  appShell,
  closeSidebar: () => sidebar.closeAll(),
  onStateChange: updateOverlayState,
  fueling: {
    sheet: document.querySelector('#fuelingSheet'),
    openButton: document.querySelector('#openFuelingButton'),
    closeButton: document.querySelector('#closeFuelingButton'),
    loading: document.querySelector('#historyLoading'),
    historyElement: document.querySelector('#fuelingHistory'),
    emptyState: document.querySelector('#fuelingEmptyState'),
    errorState: document.querySelector('#historyError'),
    retryButton: document.querySelector('#retryFuelingButton'),
    addButton: document.querySelector('#addFuelingButton'),
    addLabel: document.querySelector('#addFuelingLabel'),
    feedback: document.querySelector('#fuelingFeedback'),
    api: fuelingApi,
    form: document.querySelector('#fuelingForm'),
    buildPayload: buildFuelingPayload,
    openClass: 'fueling-open',
    recordType: 'fueling',
    defaultAddLabel: 'Abastecer',
    successMessage: 'Abastecimento registrado.',
    errorMessage: 'Não foi possível registrar o abastecimento.',
    recordConfig: {
      cardClassName: 'fueling-card',
      titleField: 'station',
      titleFallback: 'Abastecimento',
      stats: [
        ['Litros', 'liters'],
        ['Total', 'total'],
        ['Km', 'odometer'],
      ],
    },
  },
  maintenance: {
    sheet: document.querySelector('#maintenanceSheet'),
    openButton: document.querySelector('#openMaintenanceButton'),
    closeButton: document.querySelector('#closeMaintenanceButton'),
    loading: document.querySelector('#maintenanceLoading'),
    historyElement: document.querySelector('#maintenanceHistory'),
    emptyState: document.querySelector('#maintenanceEmptyState'),
    errorState: document.querySelector('#maintenanceError'),
    retryButton: document.querySelector('#retryMaintenanceButton'),
    addButton: document.querySelector('#addMaintenanceButton'),
    formOpenButton: document.querySelector('#openMaintenanceFormButton'),
    formCancelButton: document.querySelector('#cancelMaintenanceFormButton'),
    addLabel: document.querySelector('#addMaintenanceLabel'),
    feedback: document.querySelector('#maintenanceFeedback'),
    api: maintenanceApi,
    form: document.querySelector('#maintenanceForm'),
    buildPayload: buildMaintenancePayload,
    openClass: 'maintenance-open',
    recordType: 'maintenance',
    defaultAddLabel: 'Salvar manutenção',
    successMessage: 'Manutenção registrada.',
    errorMessage: 'Não foi possível registrar a manutenção.',
    recordConfig: {
      cardClassName: 'fueling-card maintenance-card',
      titleField: 'service',
      titleFallback: 'Manutenção',
      subtitleField: 'notes',
      subtitleFallback: 'Sem observações',
      stats: [
        ['Custo', 'cost'],
        ['Km', 'odometer'],
        ['Status', 'status'],
      ],
    },
  },
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeAllOverlays();
  }
});

updateOverlayState();
