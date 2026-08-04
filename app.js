const appShell = document.querySelector('#appShell');
const menuButton = document.querySelector('#menuButton');
const closeButton = document.querySelector('#closeButton');
const backdrop = document.querySelector('#backdrop');
const menuLinks = document.querySelectorAll('.menu-panel a');
const menuPanel = document.querySelector('#menuPanel');
const componentsPanel = document.querySelector('#componentsPanel');
const closeComponentsButton = document.querySelector('#closeComponentsButton');
const componentsHandle = document.querySelector('#componentsHandle');
const homeMotorcycleImage = document.querySelector('#homeMotorcycleImage');
const openFuelingButton = document.querySelector('#openFuelingButton');
const fuelingSheet = document.querySelector('#fuelingSheet');
const closeFuelingButton = document.querySelector('#closeFuelingButton');
const historyLoading = document.querySelector('#historyLoading');
const fuelingHistoryElement = document.querySelector('#fuelingHistory');
const fuelingEmptyState = document.querySelector('#fuelingEmptyState');
const historyError = document.querySelector('#historyError');
const retryFuelingButton = document.querySelector('#retryFuelingButton');
const addFuelingButton = document.querySelector('#addFuelingButton');
const addFuelingLabel = document.querySelector('#addFuelingLabel');
const fuelingFeedback = document.querySelector('#fuelingFeedback');
const openMaintenanceButton = document.querySelector('#openMaintenanceButton');
const maintenanceSheet = document.querySelector('#maintenanceSheet');
const closeMaintenanceButton = document.querySelector('#closeMaintenanceButton');
const maintenanceLoading = document.querySelector('#maintenanceLoading');
const maintenanceHistoryElement = document.querySelector('#maintenanceHistory');
const maintenanceEmptyState = document.querySelector('#maintenanceEmptyState');
const maintenanceError = document.querySelector('#maintenanceError');
const retryMaintenanceButton = document.querySelector('#retryMaintenanceButton');
const addMaintenanceButton = document.querySelector('#addMaintenanceButton');
const addMaintenanceLabel = document.querySelector('#addMaintenanceLabel');
const maintenanceFeedback = document.querySelector('#maintenanceFeedback');

const IMAGE_STORAGE_KEY = 'controlador-da-moto-image';
const IMAGE_NAME_STORAGE_KEY = 'controlador-da-moto-image-name';

// Keep the API URL and endpoint names in one place for the future C# integration.
const API_CONFIG = {
  baseUrl: 'https://localhost:7000/api',
  endpoints: {
    fuelingHistory: '/fuelings',
    maintenanceHistory: '/maintenance',
  },
};

const MOCK_FUELING_HISTORY = [
  {
    id: 'mock-fueling-001',
    occurredAt: '2026-07-28T16:30:00-03:00',
    date: '28 JUL 2026',
    station: 'Posto Central',
    liters: '11,4 L',
    total: 'R$ 69,45',
    odometer: '8.420 km',
  },
  {
    id: 'mock-fueling-002',
    occurredAt: '2026-07-12T10:15:00-03:00',
    date: '12 JUL 2026',
    station: 'Auto Posto Avenida',
    liters: '10,8 L',
    total: 'R$ 65,75',
    odometer: '8.155 km',
  },
  {
    id: 'mock-fueling-003',
    occurredAt: '2026-06-27T14:45:00-03:00',
    date: '27 JUN 2026',
    station: 'Posto da Serra',
    liters: '12,1 L',
    total: 'R$ 72,80',
    odometer: '7.890 km',
  },
];

const MOCK_MAINTENANCE_HISTORY = [
  {
    id: 'mock-maintenance-001',
    occurredAt: '2026-07-25T09:30:00-03:00',
    date: '25 JUL 2026',
    service: 'Troca de óleo',
    workshop: 'Moto Center',
    cost: 'R$ 120,00',
    odometer: '8.350 km',
    status: 'Concluída',
  },
  {
    id: 'mock-maintenance-002',
    occurredAt: '2026-06-18T15:00:00-03:00',
    date: '18 JUN 2026',
    service: 'Revisão dos freios',
    workshop: 'Oficina Avenida',
    cost: 'R$ 85,00',
    odometer: '7.950 km',
    status: 'Concluída',
  },
  {
    id: 'mock-maintenance-003',
    occurredAt: '2026-04-09T11:20:00-03:00',
    date: '09 ABR 2026',
    service: 'Troca de relação',
    workshop: 'Garagem XRE',
    cost: 'R$ 480,00',
    odometer: '7.100 km',
    status: 'Concluída',
  },
];

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function sortRecordsRecentFirst(records) {
  return [...records].sort((first, second) => (
    new Date(second.occurredAt || 0).getTime() - new Date(first.occurredAt || 0).getTime()
  ));
}

async function requestApi(endpoint, options = {}) {
  const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.json();
}

// These methods currently return mock data. Replace only their bodies with requestApi()
// calls when the C# backend is available.
const fuelingApi = {
  async loadHistory() {
    // return requestApi(API_CONFIG.endpoints.fuelingHistory);
    await wait(650);
    return sortRecordsRecentFirst(MOCK_FUELING_HISTORY);
  },

  async addRecord(payload) {
    // return requestApi(API_CONFIG.endpoints.fuelingHistory, {
    //   method: 'POST',
    //   body: JSON.stringify(payload),
    // });
    await wait(400);
    return {
      id: `mock-fueling-${Date.now()}`,
      occurredAt: new Date().toISOString(),
      date: 'AGORA',
      station: 'Novo abastecimento',
      liters: '—',
      total: '—',
      odometer: 'Pendente',
      ...payload,
    };
  },
};

const maintenanceApi = {
  async loadHistory() {
    // return requestApi(API_CONFIG.endpoints.maintenanceHistory);
    await wait(650);
    return sortRecordsRecentFirst(MOCK_MAINTENANCE_HISTORY);
  },

  async addRecord(payload) {
    // return requestApi(API_CONFIG.endpoints.maintenanceHistory, {
    //   method: 'POST',
    //   body: JSON.stringify(payload),
    // });
    await wait(400);
    return {
      id: `mock-maintenance-${Date.now()}`,
      occurredAt: new Date().toISOString(),
      date: 'AGORA',
      service: 'Nova manutenção',
      workshop: 'Aguardando oficina',
      cost: '—',
      odometer: 'Pendente',
      status: 'Pendente',
      ...payload,
    };
  },
};

let fuelingHistory = null;
let isAddingFueling = false;
let maintenanceHistory = null;
let isAddingMaintenance = false;

// Placeholder values for now. The C# backend can later provide the same keys.
const placeholderMetrics = {
  kmPerLiter: '12,5',
  totalKm: '8.420',
};

function renderMotoMetrics(metrics) {
  Object.entries(metrics).forEach(([key, value]) => {
    const element = document.querySelector(`[data-metric-key="${key}"]`);

    if (element && value !== undefined && value !== null) {
      element.textContent = value;
    }
  });
}

renderMotoMetrics(placeholderMetrics);

if (homeMotorcycleImage) {
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

function setMenuState(isOpen) {
  appShell.classList.toggle('menu-open', isOpen);
  menuButton.setAttribute('aria-expanded', String(isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
  menuPanel.setAttribute('aria-hidden', String(!isOpen));

  updateOverlayState();
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

function setComponentsState(isOpen) {
  const shouldOpen = Boolean(isOpen);
  appShell.classList.toggle('components-open', shouldOpen);
  componentsPanel.setAttribute('aria-hidden', String(!shouldOpen));
  componentsHandle.setAttribute('aria-expanded', String(shouldOpen));
  componentsHandle.setAttribute('aria-label', shouldOpen ? 'Fechar componentes' : 'Abrir componentes');
  componentsPanel.style.removeProperty('transform');
  componentsPanel.style.removeProperty('visibility');
  componentsPanel.style.removeProperty('pointer-events');
  componentsPanel.style.removeProperty('transition');
  updateOverlayState();

  if (shouldOpen) {
    closeComponentsButton.focus({ preventScroll: true });
  }
}

function setFuelingSheetState(isOpen) {
  appShell.classList.toggle('fueling-open', isOpen);
  fuelingSheet.setAttribute('aria-hidden', String(!isOpen));
  openFuelingButton.setAttribute('aria-expanded', String(isOpen));
  updateOverlayState();

  if (isOpen) {
    closeFuelingButton.focus({ preventScroll: true });
  }
}

function setMaintenanceSheetState(isOpen) {
  appShell.classList.toggle('maintenance-open', isOpen);
  maintenanceSheet.setAttribute('aria-hidden', String(!isOpen));
  openMaintenanceButton.setAttribute('aria-expanded', String(isOpen));
  updateOverlayState();

  if (isOpen) {
    closeMaintenanceButton.focus({ preventScroll: true });
  }
}

function setHistoryState(state) {
  historyLoading.hidden = state !== 'loading';
  fuelingHistoryElement.hidden = state !== 'loaded';
  fuelingEmptyState.hidden = state !== 'empty';
  historyError.hidden = state !== 'error';
  addFuelingButton.disabled = state === 'loading' || state === 'error';
}

function makeHistoryStat(label, value) {
  const stat = document.createElement('span');
  stat.className = 'fueling-stat';

  const statLabel = document.createElement('span');
  statLabel.className = 'fueling-stat-label';
  statLabel.textContent = label;

  const statValue = document.createElement('strong');
  statValue.className = 'fueling-stat-value';
  statValue.textContent = value || '—';

  stat.append(statLabel, statValue);
  return stat;
}

function renderFuelingHistory(history) {
  fuelingHistoryElement.replaceChildren();

  history.forEach((record) => {
    const card = document.createElement('article');
    card.className = 'fueling-card';
    card.setAttribute('role', 'listitem');

    const main = document.createElement('div');
    main.className = 'fueling-card-main';

    const date = document.createElement('span');
    date.className = 'fueling-card-date';
    date.textContent = record.date || 'SEM DATA';

    const location = document.createElement('strong');
    location.className = 'fueling-card-location';
    location.textContent = record.station || 'Abastecimento';
    main.append(date, location);

    const stats = document.createElement('div');
    stats.className = 'fueling-card-stats';
    stats.append(
      makeHistoryStat('Litros', record.liters),
      makeHistoryStat('Total', record.total),
      makeHistoryStat('Km', record.odometer),
    );

    card.append(main, stats);
    fuelingHistoryElement.append(card);
  });

  setHistoryState(history.length ? 'loaded' : 'empty');
}

function setMaintenanceState(state) {
  maintenanceLoading.hidden = state !== 'loading';
  maintenanceHistoryElement.hidden = state !== 'loaded';
  maintenanceEmptyState.hidden = state !== 'empty';
  maintenanceError.hidden = state !== 'error';
  addMaintenanceButton.disabled = state === 'loading' || state === 'error';
}

function renderMaintenanceHistory(history) {
  maintenanceHistoryElement.replaceChildren();

  history.forEach((record) => {
    const card = document.createElement('article');
    card.className = 'fueling-card maintenance-card';
    card.setAttribute('role', 'listitem');

    const main = document.createElement('div');
    main.className = 'fueling-card-main';

    const date = document.createElement('span');
    date.className = 'fueling-card-date';
    date.textContent = record.date || 'SEM DATA';

    const service = document.createElement('strong');
    service.className = 'fueling-card-location';
    service.textContent = record.service || 'Manutenção';

    const workshop = document.createElement('span');
    workshop.className = 'record-subtitle';
    workshop.textContent = record.workshop || 'Oficina não informada';
    main.append(date, service, workshop);

    const stats = document.createElement('div');
    stats.className = 'fueling-card-stats';
    stats.append(
      makeHistoryStat('Custo', record.cost),
      makeHistoryStat('Km', record.odometer),
      makeHistoryStat('Status', record.status),
    );

    card.append(main, stats);
    maintenanceHistoryElement.append(card);
  });

  setMaintenanceState(history.length ? 'loaded' : 'empty');
}

async function loadFuelingHistory() {
  setHistoryState('loading');
  fuelingFeedback.textContent = '';

  try {
    fuelingHistory = await fuelingApi.loadHistory();
    renderFuelingHistory(fuelingHistory);
  } catch (error) {
    console.error('Unable to load fueling history', error);
    setHistoryState('error');
  }
}

async function loadMaintenanceHistory() {
  setMaintenanceState('loading');
  maintenanceFeedback.textContent = '';

  try {
    maintenanceHistory = await maintenanceApi.loadHistory();
    renderMaintenanceHistory(maintenanceHistory);
  } catch (error) {
    console.error('Unable to load maintenance history', error);
    setMaintenanceState('error');
  }
}

async function handleAddFueling() {
  if (isAddingFueling || fuelingHistory === null) {
    return;
  }

  isAddingFueling = true;
  addFuelingButton.disabled = true;
  addFuelingLabel.textContent = 'Salvando...';
  fuelingFeedback.textContent = '';

  try {
    const newRecord = await fuelingApi.addRecord({ motorcycleId: 'current-motorcycle' });
    fuelingHistory = [newRecord, ...fuelingHistory];
    renderFuelingHistory(fuelingHistory);
    fuelingFeedback.textContent = 'Registro mock adicionado.';
  } catch (error) {
    console.error('Unable to add fueling record', error);
    fuelingFeedback.textContent = 'Não foi possível registrar o abastecimento.';
  } finally {
    isAddingFueling = false;
    addFuelingLabel.textContent = 'Abastecer';

    if (fuelingHistory !== null) {
      addFuelingButton.disabled = false;
    }
  }
}

async function handleAddMaintenance() {
  if (isAddingMaintenance || maintenanceHistory === null) {
    return;
  }

  isAddingMaintenance = true;
  addMaintenanceButton.disabled = true;
  addMaintenanceLabel.textContent = 'Salvando...';
  maintenanceFeedback.textContent = '';

  try {
    const newRecord = await maintenanceApi.addRecord({ motorcycleId: 'current-motorcycle' });
    maintenanceHistory = [newRecord, ...maintenanceHistory];
    renderMaintenanceHistory(maintenanceHistory);
    maintenanceFeedback.textContent = 'Registro mock adicionado.';
  } catch (error) {
    console.error('Unable to add maintenance record', error);
    maintenanceFeedback.textContent = 'Não foi possível registrar a manutenção.';
  } finally {
    isAddingMaintenance = false;
    addMaintenanceLabel.textContent = 'Manutenção';

    if (maintenanceHistory !== null) {
      addMaintenanceButton.disabled = false;
    }
  }
}

menuButton.addEventListener('click', () => {
  const shouldOpen = !appShell.classList.contains('menu-open');

  if (shouldOpen) {
    setComponentsState(false);
    setFuelingSheetState(false);
    setMaintenanceSheetState(false);
  }

  setMenuState(shouldOpen);
});

closeButton.addEventListener('click', () => {
  setMenuState(false);
  setComponentsState(false);
});
backdrop.addEventListener('click', () => {
  setMenuState(false);
  setComponentsState(false);
  setFuelingSheetState(false);
  setMaintenanceSheetState(false);
});

closeComponentsButton.addEventListener('click', () => setComponentsState(false));

openFuelingButton.addEventListener('click', () => {
  setMenuState(false);
  setComponentsState(false);
  setMaintenanceSheetState(false);
  setFuelingSheetState(true);

  if (fuelingHistory === null) {
    loadFuelingHistory();
  } else {
    renderFuelingHistory(fuelingHistory);
  }
});

closeFuelingButton.addEventListener('click', () => setFuelingSheetState(false));
retryFuelingButton.addEventListener('click', loadFuelingHistory);
addFuelingButton.addEventListener('click', handleAddFueling);

openMaintenanceButton.addEventListener('click', () => {
  setMenuState(false);
  setComponentsState(false);
  setFuelingSheetState(false);
  setMaintenanceSheetState(true);

  if (maintenanceHistory === null) {
    loadMaintenanceHistory();
  } else {
    renderMaintenanceHistory(maintenanceHistory);
  }
});

closeMaintenanceButton.addEventListener('click', () => setMaintenanceSheetState(false));
retryMaintenanceButton.addEventListener('click', loadMaintenanceHistory);
addMaintenanceButton.addEventListener('click', handleAddMaintenance);

menuLinks.forEach((link) => {
  link.addEventListener('click', () => {
    setMenuState(false);
    setComponentsState(false);
  });
});

let menuGestureStart = null;
let componentsGestureStart = null;
let componentsHandleGesture = null;
let suppressHandleClick = false;

function startHorizontalGesture(event, target) {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return;
  }

  try {
    target.setPointerCapture?.(event.pointerId);
  } catch {
    // Some synthetic or unsupported pointer events cannot be captured.
  }

  return { x: event.clientX, y: event.clientY };
}

function isHorizontalSwipe(start, event) {
  if (!start) {
    return null;
  }

  const deltaX = event.clientX - start.x;
  const deltaY = event.clientY - start.y;
  const isHorizontal = Math.abs(deltaX) >= 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2;

  return isHorizontal ? deltaX : null;
}

function updateComponentsDragPosition(deltaX, isOpen) {
  const panelDistance = componentsPanel.offsetWidth * 1.05;
  const boundedDelta = isOpen
    ? Math.min(Math.max(deltaX, 0), panelDistance)
    : Math.max(Math.min(deltaX, 0), -panelDistance);
  const basePosition = isOpen ? 0 : panelDistance;

  componentsPanel.style.visibility = 'visible';
  componentsPanel.style.pointerEvents = 'auto';
  componentsPanel.style.transition = 'none';
  componentsPanel.style.transform = `translateX(${basePosition + boundedDelta}px)`;
}

componentsHandle.addEventListener('click', () => {
  if (suppressHandleClick) {
    suppressHandleClick = false;
    return;
  }

  setComponentsState(!appShell.classList.contains('components-open'));
});

componentsHandle.addEventListener('pointerdown', (event) => {
  const start = startHorizontalGesture(event, componentsHandle);

  if (!start) {
    return;
  }

  componentsHandleGesture = {
    ...start,
    isOpen: appShell.classList.contains('components-open'),
    moved: false,
  };
});

componentsHandle.addEventListener('pointermove', (event) => {
  if (!componentsHandleGesture) {
    return;
  }

  const deltaX = event.clientX - componentsHandleGesture.x;
  const deltaY = event.clientY - componentsHandleGesture.y;

  if (Math.abs(deltaX) < 5 || Math.abs(deltaX) <= Math.abs(deltaY)) {
    return;
  }

  event.preventDefault();
  componentsHandleGesture.moved = true;
  updateComponentsDragPosition(deltaX, componentsHandleGesture.isOpen);
});

componentsHandle.addEventListener('pointerup', (event) => {
  if (!componentsHandleGesture) {
    return;
  }

  const gesture = componentsHandleGesture;
  const deltaX = event.clientX - gesture.x;
  const shouldOpen = !gesture.isOpen && deltaX <= -60;
  const shouldClose = gesture.isOpen && deltaX >= 60;
  componentsHandleGesture = null;
  suppressHandleClick = gesture.moved;

  if (shouldOpen) {
    setComponentsState(true);
  } else if (shouldClose) {
    setComponentsState(false);
  } else {
    setComponentsState(gesture.isOpen);
  }
});

componentsHandle.addEventListener('pointercancel', () => {
  if (componentsHandleGesture) {
    setComponentsState(componentsHandleGesture.isOpen);
  }

  componentsHandleGesture = null;
});

menuPanel.addEventListener('pointerdown', (event) => {
  menuGestureStart = startHorizontalGesture(event, menuPanel);
});

menuPanel.addEventListener('pointerup', (event) => {
  const deltaX = isHorizontalSwipe(menuGestureStart, event);
  menuGestureStart = null;

  if (deltaX > 0) {
    setComponentsState(true);
  }
});

menuPanel.addEventListener('pointercancel', () => {
  menuGestureStart = null;
});

componentsPanel.addEventListener('pointerdown', (event) => {
  componentsGestureStart = startHorizontalGesture(event, componentsPanel);
});

componentsPanel.addEventListener('pointerup', (event) => {
  const deltaX = isHorizontalSwipe(componentsGestureStart, event);
  componentsGestureStart = null;

  if (deltaX < 0) {
    setComponentsState(false);
  }
});

componentsPanel.addEventListener('pointercancel', () => {
  componentsGestureStart = null;
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    setMenuState(false);
    setComponentsState(false);
    setFuelingSheetState(false);
    setMaintenanceSheetState(false);
  }
});
