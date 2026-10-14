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

function renderHistoryCard(record, config) {
  const card = document.createElement('article');
  card.className = config.cardClassName;
  card.setAttribute('role', 'listitem');

  const main = document.createElement('div');
  main.className = 'fueling-card-main';

  const date = document.createElement('span');
  date.className = 'fueling-card-date';
  date.textContent = record.occurredAt ? new Date(record.occurredAt).toLocaleDateString('pt-BR'): 'SEM DATA';

  const title = document.createElement('strong');
  title.className = 'fueling-card-location';
  title.textContent = record[config.titleField] || config.titleFallback;
  main.append(date, title);

  if (config.subtitleField) {
    const subtitle = document.createElement('span');
    subtitle.className = 'record-subtitle';
    subtitle.textContent = record[config.subtitleField] || config.subtitleFallback;
    main.append(subtitle);
  }

  const stats = document.createElement('div');
  stats.className = 'fueling-card-stats';
  config.stats.forEach(([label, field]) => {
    stats.append(makeHistoryStat(label, record[field]));
  });

  card.append(main, stats);
  return card;
}

export function createBottomSheet({
  appShell,
  sheet,
  openButton,
  closeButton,
  loading,
  historyElement,
  emptyState,
  errorState,
  retryButton,
  addButton,
  formOpenButton,
  formCancelButton,
  addLabel,
  feedback,
  form,
  api,
  openClass,
  recordType,
  defaultAddLabel,
  successMessage,
  errorMessage,
  recordConfig,
  buildPayload = () => ({ motorcycleId: 'current-motorcycle' }),
  onOpen = () => {},
  onStateChange = () => {},
}) {
  let history = null;
  let isAdding = false;

  function setState(state) {
    loading.hidden = state !== 'loading';
    historyElement.hidden = state !== 'loaded';
    emptyState.hidden = state !== 'empty';
    errorState.hidden = state !== 'error';
    addButton.disabled = state === 'loading' || state === 'error';
    if (formOpenButton) {
      formOpenButton.disabled = state === 'loading' || state === 'error';
    }
  }

  function showEntryForm() {
    if (!form || !formOpenButton || isAdding) {
      return;
    }

    form.hidden = false;
    formOpenButton.hidden = true;
    loading.hidden = true;
    historyElement.hidden = true;
    emptyState.hidden = true;
    errorState.hidden = true;
    feedback.textContent = '';
    feedback.classList.remove('error');
    form.querySelector('input, textarea')?.focus({ preventScroll: true });
  }

  function hideEntryForm({ clear = true } = {}) {
    if (!form || !formOpenButton) {
      return;
    }

    form.hidden = true;
    formOpenButton.hidden = false;
    if (clear) {
      form.reset();
      feedback.textContent = '';
      feedback.classList.remove('error');
    }

    if (history !== null) {
      renderHistory(history);
    } else {
      setState('loading');
    }
  }

  function renderHistory(records) {
    historyElement.replaceChildren();

    records.forEach((record) => {
      historyElement.append(renderHistoryCard(record, recordConfig));
    });

    setState(records.length ? 'loaded' : 'empty');
  }

  async function loadHistory() {
    setState('loading');
    feedback.textContent = '';

    try {
      history = await api.loadHistory();
      renderHistory(history);
    } catch (error) {
      console.error('Unable to load ' + recordType + ' history', error);
      setState('error');
    }
  }

  async function handleAdd(event) {
    event?.preventDefault();

    if (isAdding || history === null) {
      return;
    }

    let payload;

    try {
      payload = buildPayload();
    } catch (error) {
      feedback.textContent = error.message;
      feedback.classList.add('error');
      return;
    }

    isAdding = true;
    addButton.disabled = true;
    addLabel.textContent = 'Salvando...';
    feedback.textContent = '';
    feedback.classList.remove('error');

    try {
      const newRecord = await api.addRecord(payload);

      if (recordType === 'fueling') {
        await loadHistory();
        window.dispatchEvent(new Event('fueling-record-added'));
      } else {
        const recordForHistory = newRecord || {
          ...payload,
          odometer: payload.mileage,
        };

        history = [recordForHistory, ...history];
        if (formOpenButton) {
          form.hidden = true;
          formOpenButton.hidden = false;
          form.reset();
        }
        renderHistory(history);
      }

      feedback.textContent = successMessage;
      feedback.classList.remove('error');
    } catch (error) {
      console.error('Unable to add ' + recordType + ' record', error);
      const isMaintenanceValidationError = recordType === 'maintenance'
        && (error instanceof TypeError || error instanceof RangeError);
      feedback.textContent = isMaintenanceValidationError ? error.message : errorMessage;
      feedback.classList.add('error');
    } finally {
      isAdding = false;
      addLabel.textContent = defaultAddLabel;

      if (history !== null) {
        addButton.disabled = false;
      }
    }
  }

  function open() {
    onOpen();
    appShell.classList.add(openClass);
    sheet.setAttribute('aria-hidden', 'false');
    openButton.setAttribute('aria-expanded', 'true');
    onStateChange();
    closeButton.focus({ preventScroll: true });
  }

  function close() {
    appShell.classList.remove(openClass);
    sheet.setAttribute('aria-hidden', 'true');
    openButton.setAttribute('aria-expanded', 'false');
    onStateChange();
  }

  openButton.addEventListener('click', () => {
    open();

    if (history === null) {
      loadHistory();
    } else {
      renderHistory(history);
    }
  });

  closeButton.addEventListener('click', close);
  retryButton.addEventListener('click', loadHistory);

  if (form) {
    form.addEventListener('submit', handleAdd);
  }

  if (formOpenButton) {
    formOpenButton.addEventListener('click', showEntryForm);
  }

  if (formCancelButton) {
    formCancelButton.addEventListener('click', () => hideEntryForm());
  }

  if (!form) {
    addButton.addEventListener('click', handleAdd);
  }

  return {
    close,
    loadHistory,
    open,
    renderHistory,
  };
}

export function createBottomSheets({
  appShell,
  fueling,
  maintenance,
  closeSidebar = () => {},
  onStateChange = () => {},
}) {
  let fuelingSheet;
  let maintenanceSheet;

  fuelingSheet = createBottomSheet({
    ...fueling,
    appShell,
    onOpen: () => {
      closeSidebar();
      maintenanceSheet?.close();
    },
    onStateChange,
  });

  maintenanceSheet = createBottomSheet({
    ...maintenance,
    appShell,
    onOpen: () => {
      closeSidebar();
      fuelingSheet?.close();
    },
    onStateChange,
  });

  return {
    fueling: fuelingSheet,
    maintenance: maintenanceSheet,
    closeAll() {
      fuelingSheet.close();
      maintenanceSheet.close();
    },
  };
}
