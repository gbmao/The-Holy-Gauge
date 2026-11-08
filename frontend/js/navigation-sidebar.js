function captureHandleGesture(event, handle) {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return null;
  }

  try {
    handle.setPointerCapture?.(event.pointerId);
  } catch {
    // Unsupported or synthetic pointer events can be ignored.
  }

  return { x: event.clientX, y: event.clientY };
}

export function createNavigationSidebar({
  appShell,
  panel,
  handle,
  closeButton,
  closeComponents = () => {},
  closeBottomSheets = () => {},
  onStateChange = () => {},
}) {
  let panelGestureStart = null;
  let handleGesture = null;
  let suppressHandleClick = false;

  function setState(isOpen) {
    const shouldOpen = Boolean(isOpen);

    if (shouldOpen) {
      closeComponents();
      closeBottomSheets();
    }

    appShell.classList.toggle('navigation-open', shouldOpen);
    panel.setAttribute('aria-hidden', String(!shouldOpen));
    handle.setAttribute('aria-expanded', String(shouldOpen));
    handle.setAttribute('aria-label', shouldOpen ? 'Fechar menu' : 'Abrir menu');
    panel.style.removeProperty('transform');
    panel.style.removeProperty('visibility');
    panel.style.removeProperty('pointer-events');
    panel.style.removeProperty('transition');
    onStateChange();

    if (shouldOpen) {
      closeButton.focus({ preventScroll: true });
    }
  }

  function updateDragPosition(deltaX, isOpen) {
    const panelDistance = panel.offsetWidth * 1.05;
    const boundedDelta = isOpen
      ? Math.max(Math.min(deltaX, 0), -panelDistance)
      : Math.min(Math.max(deltaX, 0), panelDistance);
    const basePosition = isOpen ? 0 : -panelDistance;

    panel.style.visibility = 'visible';
    panel.style.pointerEvents = 'auto';
    panel.style.transition = 'none';
    panel.style.transform = `translateX(${basePosition + boundedDelta}px)`;
  }

  closeButton.addEventListener('click', () => setState(false));

  handle.addEventListener('click', () => {
    if (suppressHandleClick) {
      suppressHandleClick = false;
      return;
    }

    setState(!appShell.classList.contains('navigation-open'));
  });

  handle.addEventListener('pointerdown', (event) => {
    const start = captureHandleGesture(event, handle);
    if (!start) {
      return;
    }

    handleGesture = {
      ...start,
      isOpen: appShell.classList.contains('navigation-open'),
      moved: false,
    };
  });

  handle.addEventListener('pointermove', (event) => {
    if (!handleGesture) {
      return;
    }

    const deltaX = event.clientX - handleGesture.x;
    const deltaY = event.clientY - handleGesture.y;
    if (Math.abs(deltaX) < 5 || Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }

    event.preventDefault();
    handleGesture.moved = true;
    updateDragPosition(deltaX, handleGesture.isOpen);
  });

  handle.addEventListener('pointerup', (event) => {
    if (!handleGesture) {
      return;
    }

    const gesture = handleGesture;
    const deltaX = event.clientX - gesture.x;
    const shouldOpen = !gesture.isOpen && deltaX >= 60;
    const shouldClose = gesture.isOpen && deltaX <= -60;
    handleGesture = null;
    suppressHandleClick = gesture.moved;

    if (shouldOpen) {
      setState(true);
    } else if (shouldClose) {
      setState(false);
    } else {
      setState(gesture.isOpen);
    }
  });

  handle.addEventListener('pointercancel', () => {
    if (handleGesture) {
      setState(handleGesture.isOpen);
    }
    handleGesture = null;
  });

  panel.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      panelGestureStart = null;
      return;
    }

    panelGestureStart = { x: event.clientX, y: event.clientY };
  });

  panel.addEventListener('pointerup', (event) => {
    if (!panelGestureStart) {
      return;
    }

    const deltaX = event.clientX - panelGestureStart.x;
    const deltaY = event.clientY - panelGestureStart.y;
    panelGestureStart = null;

    if (deltaX <= -60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      setState(false);
    }
  });

  panel.addEventListener('pointercancel', () => {
    panelGestureStart = null;
  });

  return {
    closeAll() {
      setState(false);
    },
  };
}
