import { fuelingApi } from './api.js';

function formatMonthlyExpense(expense) {
  const value = Number(expense);

  return Number.isFinite(value)
    ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\u00a0/g, ' ')
    : 'R$ 0,00';
}

function createMonthlyExpenseMonitor(componentsPanel) {
  const monitor = document.createElement('div');
  const icon = document.createElement('span');
  const copy = document.createElement('span');
  const title = document.createElement('strong');
  const period = document.createElement('small');
  const valueElement = document.createElement('strong');
  const componentsList = componentsPanel.querySelector('.components-list');

  monitor.className = 'component-item monthly-expense';
  monitor.setAttribute('role', 'listitem');
  icon.className = 'component-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '$';
  copy.className = 'component-copy';
  title.textContent = 'Gasto mensal';
  period.textContent = 'Mês atual';
  valueElement.className = 'component-status';
  valueElement.setAttribute('aria-live', 'polite');
  valueElement.textContent = 'R$ 0,00';
  copy.append(title, period);
  monitor.append(icon, copy, valueElement);
  componentsList.append(monitor);

  return valueElement;
}

async function loadMonthlyExpense(valueElement) {
  const currentDate = new Date();

  try {
    const expense = await fuelingApi.getMonthlyExpense(
      currentDate.getMonth() + 1,
      currentDate.getFullYear(),
    );

    valueElement.textContent = formatMonthlyExpense(expense);
  } catch {
    valueElement.textContent = 'R$ 0,00';
  }
}

function startHorizontalGesture(event, target) {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return null;
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

export function createSidebar({
  appShell,
  backdrop,
  componentsPanel,
  closeComponentsButton,
  componentsHandle,
  onBackdrop = () => {},
  onStateChange = () => {},
}) {
  let componentsGestureStart = null;
  let componentsHandleGesture = null;
  let suppressHandleClick = false;
  const monthlyExpenseValue = createMonthlyExpenseMonitor(componentsPanel);

  loadMonthlyExpense(monthlyExpenseValue);

  function notifyStateChange() {
    onStateChange();
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
    notifyStateChange();

    if (shouldOpen) {
      closeComponentsButton.focus({ preventScroll: true });
    }
  }

  function closeAll() {
    setComponentsState(false);
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
    componentsPanel.style.transform = 'translateX(' + (basePosition + boundedDelta) + 'px)';
  }

  backdrop.addEventListener('click', onBackdrop);
  closeComponentsButton.addEventListener('click', () => setComponentsState(false));

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

  return {
    closeAll,
    setComponentsState,
  };
}
