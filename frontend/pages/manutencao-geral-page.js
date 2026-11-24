import { maintenanceApi } from '../js/api.js';

function formatDate(value) {
  if (!value) {
    return 'Data indisponível';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Data indisponível'
    : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatNumber(value, options = {}) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('pt-BR', options) : '—';
}

function formatCost(value) {
  if (typeof value === 'string' && value.includes('R$')) {
    return value;
  }

  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const cost = Number(value);
  return Number.isFinite(cost)
    ? cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\u00a0/g, ' ')
    : '—';
}

function formatKilometers(value) {
  if (typeof value === 'string' && /\skm$/i.test(value)) {
    return value;
  }

  const kilometers = formatNumber(value, { maximumFractionDigits: 0 });
  return kilometers === '—' ? kilometers : `${kilometers} km`;
}

function formatNextReview(record) {
  const details = [];

  if (record.nextKilometers !== null && record.nextKilometers !== undefined) {
    details.push(formatKilometers(record.nextKilometers));
  }

  if (record.nextDate) {
    details.push(formatDate(record.nextDate));
  }

  return details.length ? details.join(' · ') : 'Não informada';
}

function createStat(label, value) {
  const stat = document.createElement('div');
  const statLabel = document.createElement('span');
  const statValue = document.createElement('strong');

  stat.className = 'manutencao-geral-record-stat';
  statLabel.textContent = label;
  statValue.textContent = value;
  stat.append(statLabel, statValue);
  return stat;
}

function createRecordCard(record, index, actions = []) {
  const card = document.createElement('article');
  const header = document.createElement('header');
  const titleGroup = document.createElement('div');
  const recordNumber = document.createElement('span');
  const title = document.createElement('h3');
  const date = document.createElement('time');
  const stats = document.createElement('div');
  const description = record.service || record.description || 'Manutenção';
  const occurredAt = record.date || record.occurredAt;
  const odometer = record.odometer ?? record.kilometers;
  const recordId = record.id ?? index + 1;

  card.className = 'manutencao-geral-record-card';
  card.setAttribute('role', 'listitem');
  header.className = 'manutencao-geral-record-header';
  titleGroup.className = 'manutencao-geral-record-title-group';
  recordNumber.className = 'manutencao-geral-record-number';
  recordNumber.textContent = `REGISTRO #${recordId}`;
  title.className = 'manutencao-geral-record-title';
  title.textContent = description;
  date.className = 'manutencao-geral-record-date';
  date.dateTime = occurredAt || '';
  date.textContent = formatDate(occurredAt);
  titleGroup.append(recordNumber, title);
  header.append(titleGroup, date);

  stats.className = 'manutencao-geral-record-stats';
  stats.append(
    createStat('Custo', formatCost(record.cost)),
    createStat('Quilometragem', formatKilometers(odometer)),
    createStat('Próxima revisão', formatNextReview(record)),
  );
  card.append(header, stats);

  if (record.notes) {
    const notes = document.createElement('p');
    notes.className = 'manutencao-geral-record-notes';
    notes.textContent = record.notes;
    card.append(notes);
  }

  const controls = document.createElement('div');
  controls.className = 'maintenance-actions';
  actions.forEach(([label, handler]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'maintenance-action';
    button.textContent = label;
    button.setAttribute('aria-label', `${label}: ${description}`);
    button.addEventListener('click', () => handler(record, button));
    controls.append(button);
  });
  card.append(controls);

  return card;
}

function dateInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export class ManutencaoGeralPage {
  constructor(root, api = maintenanceApi) {
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
    this.root.querySelector('[data-empty-title]').textContent = deleted ? 'Nenhuma manutenção excluída' : 'Nenhuma manutenção registrada';
    this.root.querySelector('[data-empty-description]').textContent = deleted
      ? 'As manutenções excluídas poderão ser recuperadas aqui.'
      : 'Quando você registrar uma manutenção, ela aparecerá aqui.';
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
      if (!record) throw new Error('A manutenção não foi encontrada ou não está mais ativa neste veículo.');
      this.editingRecord = record;
      ['description', 'date', 'kilometers', 'cost', 'nextKilometers', 'nextDate', 'notes'].forEach((name) => {
        this.editForm.elements.namedItem(name).value = name === 'date' || name === 'nextDate'
          ? dateInputValue(record[name]) : record[name] ?? '';
      });
      this.editFields.disabled = false;
      this.saveButton.disabled = false;
    } catch (error) {
      if (requestId !== this.editRequestId) return;
      this.editError.textContent = error.message || 'Não foi possível carregar a manutenção.';
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
    ['description', 'date', 'kilometers', 'cost', 'nextKilometers', 'nextDate', 'notes'].forEach((name) => {
      const value = this.editForm.elements.namedItem(name).value.trim();
      if (['kilometers', 'cost', 'nextKilometers'].includes(name)) {
        input[name] = value === '' ? null : Number(value);
      } else if (name === 'date' || name === 'nextDate') {
        // Retain the timestamp if only other fields changed.
        input[name] = value === dateInputValue(record[name]) ? record[name] : value || null;
      } else {
        input[name] = value || null;
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
      this.showFeedback('Manutenção atualizada. O custo e a próxima revisão foram atualizados.');
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
    this.root.querySelector('[data-delete-name]').textContent = `${record.description || record.service} · ${formatDate(record.date || record.occurredAt)} · ${formatCost(record.cost)}`;
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
      if (!await this.api.delete(record.id)) throw new Error('Não foi possível excluir a manutenção.');
      this.deleteDialog.close();
      await this.load();
      this.showFeedback('Manutenção excluída. Você pode recuperá-la em Excluídas.');
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
      if (!await this.api.restore(record.id)) throw new Error('Não foi possível recuperar a manutenção.');
      await this.load();
      this.showFeedback('Manutenção recuperada. O custo e a próxima revisão voltaram ao histórico ativo.');
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
      console.error('Não foi possível carregar todas as manutenções.', error);
      if (currentRequest === this.requestId) {
        this.setState('error');
      }
    }
  }
}

const pageRoot = document.querySelector('[data-manutencao-geral-page]');
if (pageRoot) {
  new ManutencaoGeralPage(pageRoot);
}
