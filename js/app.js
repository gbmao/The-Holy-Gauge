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

function updateOverlayState() {
  const isMenuOpen = appShell.classList.contains('menu-open');
  const isFuelingOpen = appShell.classList.contains('fueling-open');
  const isMaintenanceOpen = appShell.classList.contains('maintenance-open');
  const isComponentsOpen = appShell.classList.contains('components-open');
  const hasOverlayOpen = isMenuOpen || isFuelingOpen || isMaintenanceOpen || isComponentsOpen;

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
  menuButton: document.querySelector('#menuButton'),
  closeButton: document.querySelector('#closeButton'),
  backdrop,
  menuLinks: document.querySelectorAll('.menu-panel a'),
  menuPanel: document.querySelector('#menuPanel'),
  componentsPanel: document.querySelector('#componentsPanel'),
  closeComponentsButton: document.querySelector('#closeComponentsButton'),
  componentsHandle: document.querySelector('#componentsHandle'),
  closeBottomSheets: () => bottomSheets?.closeAll(),
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
    openClass: 'fueling-open',
    recordType: 'fueling',
    defaultAddLabel: 'Abastecer',
    successMessage: 'Registro mock adicionado.',
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
    addLabel: document.querySelector('#addMaintenanceLabel'),
    feedback: document.querySelector('#maintenanceFeedback'),
    api: maintenanceApi,
    openClass: 'maintenance-open',
    recordType: 'maintenance',
    defaultAddLabel: 'Manutenção',
    successMessage: 'Registro mock adicionado.',
    errorMessage: 'Não foi possível registrar a manutenção.',
    recordConfig: {
      cardClassName: 'fueling-card maintenance-card',
      titleField: 'service',
      titleFallback: 'Manutenção',
      subtitleField: 'workshop',
      subtitleFallback: 'Oficina não informada',
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
