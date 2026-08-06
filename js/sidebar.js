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
  menuButton,
  closeButton,
  backdrop,
  menuLinks,
  menuPanel,
  componentsPanel,
  closeComponentsButton,
  componentsHandle,
  closeBottomSheets = () => {},
  onBackdrop = () => {},
  onStateChange = () => {},
}) {
  let menuGestureStart = null;
  let componentsGestureStart = null;
  let componentsHandleGesture = null;
  let suppressHandleClick = false;

  function notifyStateChange() {
    onStateChange();
  }

  function setMenuState(isOpen) {
    const shouldOpen = Boolean(isOpen);
    appShell.classList.toggle('menu-open', shouldOpen);
    menuButton.setAttribute('aria-expanded', String(shouldOpen));
    menuButton.setAttribute('aria-label', shouldOpen ? 'Fechar menu' : 'Abrir menu');
    menuPanel.setAttribute('aria-hidden', String(!shouldOpen));

    notifyStateChange();
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
    setMenuState(false);
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

  menuButton.addEventListener('click', () => {
    const shouldOpen = !appShell.classList.contains('menu-open');

    if (shouldOpen) {
      setComponentsState(false);
      closeBottomSheets();
    }

    setMenuState(shouldOpen);
  });

  closeButton.addEventListener('click', closeAll);
  backdrop.addEventListener('click', onBackdrop);
  closeComponentsButton.addEventListener('click', () => setComponentsState(false));

  menuLinks.forEach((link) => {
    link.addEventListener('click', closeAll);
  });

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

  return {
    closeAll,
    setMenuState,
    setComponentsState,
  };
}
