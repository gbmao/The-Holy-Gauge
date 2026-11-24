import { fuelingApi } from '../js/api.js';

function formatDate(value) {
  if (!value) {
    return 'Data indisponível';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Data indisponível'
    : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatNumber(value, options = {}) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('pt-BR', options) : '—';
}

function formatLiters(value) {
  if (typeof value === 'string' && /\sL$/i.test(value)) {
    return value;
  }

  const liters = formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return liters === '—' ? liters : `${liters} L`;
}

function formatTotal(value) {
  if (typeof value === 'string' && value.includes('R$')) {
    return value;
  }

  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const total = Number(value);
  return Number.isFinite(total)
    ? total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\u00a0/g, ' ')
    : '—';
}

function formatOdometer(record) {
  const value = record.odometer ?? record.mileage;
  if (typeof value === 'string' && /\skm$/i.test(value)) {
    return value;
  }

  const odometer = formatNumber(value, { maximumFractionDigits: 0 });
  return odometer === '—' ? odometer : `${odometer} km`;
}

function createStat(label, value) {
  const stat = document.createElement('div');
  const statLabel = document.createElement('span');
  const statValue = document.createElement('strong');

  stat.className = 'abastecimentos-record-stat';
  statLabel.textContent = label;
  statValue.textContent = value;
  stat.append(statLabel, statValue);
  return stat;
}

function createRecordCard(record, index, actions = []) {
  const card = document.createElement('article');
  const header = document.createElement('header');
  const title = document.createElement('strong');
  const date = document.createElement('time');
  const stats = document.createElement('div');
  const recordId = record.id ?? index + 1;

  card.className = 'abastecimentos-record-card';
  card.setAttribute('role', 'listitem');
  header.className = 'abastecimentos-record-header';
  title.className = 'abastecimentos-record-title';
  title.textContent = `Abastecimento #${recordId}`;
  date.className = 'abastecimentos-record-date';
  date.dateTime = record.occurredAt || '';
  date.textContent = formatDate(record.occurredAt);
  stats.className = 'abastecimentos-record-stats';
  stats.append(
    createStat('Litros', formatLiters(record.liters)),
    createStat('Valor', formatTotal(record.total)),
    createStat('Odômetro', formatOdometer(record)),
  );
  header.append(title, date);
  card.append(header, stats);
  const controls = document.createElement('div');
  controls.className = 'refuelling-actions';
  actions.forEach(([label, handler]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'refuelling-action';
    button.textContent = label;
    button.setAttribute('aria-label', `${label} abastecimento #${recordId}`);
    button.addEventListener('click', () => handler(record, button));
    controls.append(button);
  });
  card.append(controls);
  return card;
}

function dateTimeInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export class AbastecimentosPage {
  constructor(root, api = fuelingApi) {
    this.root = root;
    this.api = api;
    this.loading = root.querySelector('[data-loading]');
    this.list = root.querySelector('[data-record-list]');
    this.empty = root.querySelector('[data-empty]');
    this.error = root.querySelector('[data-error]');
    this.count = root.querySelector('[data-record-count]');
    this.refreshButton = root.querySelector('[data-refresh]');
    this.retryButton = root.querySelector('[data-retry]');
    this.feedback = root.querySelector('[data-feedback]');
    this.activeButton = root.querySelector('[data-show-active]');
    this.deletedButton = root.querySelector('[data-show-deleted]');
    this.editDialog = root.querySelector('[data-edit-dialog]');
    this.editForm = root.querySelector('[data-edit-form]');
    this.editFields = root.querySelector('[data-edit-fields]');
    this.editLoading = root.querySelector('[data-edit-loading]');
    this.editError = root.querySelector('[data-edit-error]');
    this.retryEdit = root.querySelector('[data-retry-edit]');
    this.saveButton = root.querySelector('[data-save]');
    this.cancelEdit = root.querySelector('[data-cancel-edit]');
    this.deleteDialog = root.querySelector('[data-delete-dialog]');
    this.deleteError = root.querySelector('[data-delete-error]');
    this.confirmDelete = root.querySelector('[data-confirm-delete]');
    this.cancelDelete = root.querySelector('[data-cancel-delete]');
    this.requestId = 0;
    this.editRequestId = 0;
    this.showDeleted = false;
    this.busy = false;
    this.editingId = null;
    this.editingRecord = null;
    this.pendingDelete = null;

    this.refreshButton.addEventListener('click', () => this.load());
    this.retryButton.addEventListener('click', () => this.load());
    window.addEventListener('fueling-record-added', () => this.load());
    this.activeButton.addEventListener('click', () => this.changeFilter(false));
    this.deletedButton.addEventListener('click', () => this.changeFilter(true));
    this.editForm.addEventListener('submit', (event) => {
      event.preventDefault();
      return this.saveEdit();
    });
    this.retryEdit.addEventListener('click', () => this.loadEdit());
    this.cancelEdit.addEventListener('click', () => this.editDialog.close());
    this.cancelDelete.addEventListener('click', () => this.deleteDialog.close());
    this.confirmDelete.addEventListener('click', () => this.deleteRecord());
    [this.editDialog, this.deleteDialog].forEach((dialog) => {
      dialog.addEventListener('cancel', (event) => {
        if (this.busy) event.preventDefault();
      });
    });
    this.editDialog.addEventListener('close', () => {
      ++this.editRequestId;
      this.editingId = null;
      this.editingRecord = null;
    });
    this.deleteDialog.addEventListener('close', () => { this.pendingDelete = null; });
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        this.load();
      }
    });
    this.loadPromise = this.load();
  }

  setState(state) {
    this.loading.hidden = state !== 'loading';
    this.list.hidden = state !== 'loaded';
    this.empty.hidden = state !== 'empty';
    this.error.hidden = state !== 'error';
    this.refreshButton.disabled = state === 'loading';
  }

  render(records) {
    const actions = this.showDeleted
      ? [['Recuperar', (record, button) => this.restoreRecord(record, button)]]
      : [['Editar', (record) => this.openEdit(record)], ['Excluir', (record) => this.askDelete(record)]];
    this.list.replaceChildren(...records.map((record, index) => createRecordCard(record, index, actions)));
    this.count.textContent = `${records.length} ${records.length === 1 ? 'registro' : 'registros'}`;
    this.setState(records.length ? 'loaded' : 'empty');
  }

  showFeedback(message, state = 'success') {
    this.feedback.textContent = message;
    this.feedback.dataset.state = state;
    this.feedback.setAttribute('role', state === 'error' ? 'alert' : 'status');
    this.feedback.hidden = false;
  }

  changeFilter(deleted) {
    if (this.busy) return;
    this.showDeleted = deleted;
    this.activeButton.setAttribute('aria-pressed', String(!deleted));
    this.deletedButton.setAttribute('aria-pressed', String(deleted));
    this.root.querySelector('[data-list-title]').textContent = deleted ? 'Registros excluídos' : 'Registros ativos';
    this.root.querySelector('[data-empty-title]').textContent = deleted ? 'Nenhum abastecimento excluído' : 'Nenhum abastecimento registrado';
    this.root.querySelector('[data-empty-description]').textContent = deleted
      ? 'Os abastecimentos excluídos poderão ser recuperados aqui.'
      : 'Quando você registrar um abastecimento, ele aparecerá aqui.';
    return this.load();
  }

  openEdit(record) {
    if (this.busy) return;
    this.editingId = record.id;
    this.editingRecord = null;
    this.editForm.reset();
    this.editDialog.showModal();
    return this.loadEdit();
  }

  async loadEdit() {
    const id = this.editingId;
    if (!id || this.busy) return;
    const requestId = ++this.editRequestId;
    this.editFields.disabled = true;
    this.saveButton.disabled = true;
    this.editLoading.hidden = false;
    this.editError.hidden = true;
    this.retryEdit.hidden = true;
    try {
      const record = await this.api.getById(id);
      if (requestId !== this.editRequestId || this.editingId !== id) return;
      if (!record) throw new Error('O abastecimento não foi encontrado ou não está mais ativo neste veículo.');
      this.editingRecord = record;
      ['liters', 'gasPrice', 'mileage', 'occurredAt', 'blFullTank', 'blAdditive'].forEach((name) => {
        const field = this.editForm.elements.namedItem(name);
        if (name === 'occurredAt') field.value = dateTimeInputValue(record[name]);
        else if (name === 'blFullTank' || name === 'blAdditive') field.value = record[name] === null ? '' : String(record[name]);
        else field.value = record[name] ?? '';
      });
      this.editFields.disabled = false;
      this.saveButton.disabled = false;
    } catch (error) {
      if (requestId !== this.editRequestId) return;
      this.editError.textContent = error.message || 'Não foi possível carregar o abastecimento.';
      this.editError.hidden = false;
      this.retryEdit.hidden = false;
    } finally {
      if (requestId === this.editRequestId) this.editLoading.hidden = true;
    }
  }

  async saveEdit() {
    if (this.busy || !this.editingRecord || this.saveButton.disabled || !this.editForm.reportValidity()) return;
    const record = this.editingRecord;
    const input = {};
    ['liters', 'gasPrice', 'mileage', 'occurredAt', 'blFullTank', 'blAdditive'].forEach((name) => {
      const value = this.editForm.elements.namedItem(name).value.trim();
      if (name === 'occurredAt') {
        // Preserve seconds and milliseconds when the displayed minute did not change.
        const date = new Date(value);
        input[name] = value === dateTimeInputValue(record.occurredAt)
          ? record.occurredAt : Number.isNaN(date.getTime()) ? value : date.toISOString();
      } else if (name === 'blFullTank' || name === 'blAdditive') {
        input[name] = value === '' ? null : value === 'true';
      } else {
        input[name] = value === '' ? null : Number(value);
      }
    });
    this.busy = true;
    this.editFields.disabled = true;
    this.saveButton.disabled = true;
    this.cancelEdit.disabled = true;
    this.saveButton.textContent = 'Salvando...';
    this.editError.hidden = true;
    try {
      await this.api.update(record.id, input);
      this.editDialog.close();
      await this.load();
      this.showFeedback('Abastecimento atualizado. Os dados dos indicadores foram atualizados.');
    } catch (error) {
      this.editError.textContent = error.message || 'Não foi possível salvar. Tente novamente.';
      this.editError.hidden = false;
    } finally {
      this.busy = false;
      this.editFields.disabled = false;
      this.saveButton.disabled = false;
      this.cancelEdit.disabled = false;
      this.saveButton.textContent = 'Salvar alterações';
    }
  }

  askDelete(record) {
    if (this.busy) return;
    this.pendingDelete = record;
    this.root.querySelector('[data-delete-name]').textContent = `Abastecimento #${record.id} · ${formatDate(record.occurredAt)} · ${formatTotal(record.total)}`;
    this.deleteError.hidden = true;
    this.deleteDialog.showModal();
  }

  async deleteRecord() {
    if (this.busy || !this.pendingDelete) return;
    const record = this.pendingDelete;
    this.busy = true;
    this.confirmDelete.disabled = true;
    this.cancelDelete.disabled = true;
    this.deleteError.hidden = true;
    try {
      if (!await this.api.delete(record.id)) throw new Error('Não foi possível excluir o abastecimento.');
      this.deleteDialog.close();
      await this.load();
      this.showFeedback('Abastecimento excluído. Você pode recuperá-lo em Excluídos.');
    } catch (error) {
      this.deleteError.textContent = error.message || 'Não foi possível excluir. Tente novamente.';
      this.deleteError.hidden = false;
    } finally {
      this.busy = false;
      this.confirmDelete.disabled = false;
      this.cancelDelete.disabled = false;
    }
  }

  async restoreRecord(record, button) {
    if (this.busy) return;
    this.busy = true;
    button.disabled = true;
    try {
      if (!await this.api.restore(record.id)) throw new Error('Não foi possível recuperar o abastecimento.');
      await this.load();
      this.showFeedback('Abastecimento recuperado. O registro voltou a compor o histórico e os indicadores.');
    } catch (error) {
      this.showFeedback(error.message || 'Não foi possível recuperar. Tente novamente.', 'error');
    } finally {
      this.busy = false;
      button.disabled = false;
    }
  }

  async load() {
    const currentRequest = ++this.requestId;
    this.setState('loading');

    try {
      const records = await (this.showDeleted ? this.api.loadDeletedHistory() : this.api.loadAllHistory());
      if (currentRequest === this.requestId) {
        this.render(records);
      }
    } catch (error) {
      console.error('Não foi possível carregar todos os abastecimentos.', error);
      if (currentRequest === this.requestId) {
        this.setState('error');
      }
    }
  }
}

const pageRoot = document.querySelector('[data-abastecimentos-page]');
if (pageRoot) {
  new AbastecimentosPage(pageRoot);
}
