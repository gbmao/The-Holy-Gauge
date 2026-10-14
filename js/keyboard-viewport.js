const appShell = document.querySelector('#appShell');
const visualViewport = window.visualViewport;

if (appShell) {
  let restingHeight = Math.max(window.innerHeight, document.documentElement.clientHeight);
  let formFieldFocused = false;
  let blurTimeout;

  function updateKeyboardViewport() {
    const viewportHeight = visualViewport?.height ?? window.innerHeight;
    const viewportTop = visualViewport?.offsetTop ?? 0;
    const keyboardThreshold = Math.max(100, restingHeight * 0.15);
    const keyboardOpen = formFieldFocused
      && viewportHeight < restingHeight - keyboardThreshold;

    appShell.classList.toggle('keyboard-open', keyboardOpen);

    if (keyboardOpen) {
      appShell.style.setProperty('--keyboard-viewport-height', `${viewportHeight}px`);
      appShell.style.setProperty('--keyboard-viewport-top', `${viewportTop}px`);
    } else if (!formFieldFocused) {
      restingHeight = Math.max(window.innerHeight, document.documentElement.clientHeight);
      appShell.style.removeProperty('--keyboard-viewport-height');
      appShell.style.removeProperty('--keyboard-viewport-top');
    }
  }

  function isSheetField(element) {
    return element instanceof Element
      && element.matches('input:not([type="checkbox"]), textarea, select')
      && element.closest('#fuelingSheet, #maintenanceSheet');
  }

  document.addEventListener('focusin', (event) => {
    window.clearTimeout(blurTimeout);
    formFieldFocused = Boolean(isSheetField(event.target));
    updateKeyboardViewport();
  });

  document.addEventListener('focusout', (event) => {
    if (!isSheetField(event.target)) {
      return;
    }

    blurTimeout = window.setTimeout(() => {
      formFieldFocused = Boolean(isSheetField(document.activeElement));
      updateKeyboardViewport();
    }, 250);
  });

  window.addEventListener('resize', updateKeyboardViewport);
  window.addEventListener('orientationchange', updateKeyboardViewport);
  visualViewport?.addEventListener('resize', updateKeyboardViewport);
  visualViewport?.addEventListener('scroll', updateKeyboardViewport);
}
