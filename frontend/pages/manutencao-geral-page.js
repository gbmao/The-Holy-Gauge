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

function createRecordCard(record, index) {
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

  return card;
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
    this.requestId = 0;

    this.refreshButton.addEventListener('click', () => this.load());
    this.retryButton.addEventListener('click', () => this.load());
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        this.load();
      }
    });
    this.load();
  }

  setState(state) {
    this.loading.hidden = state !== 'loading';
    this.list.hidden = state !== 'loaded';
    this.empty.hidden = state !== 'empty';
    this.error.hidden = state !== 'error';
    this.refreshButton.disabled = state === 'loading';
  }

  render(records) {
    this.list.replaceChildren(...records.map(createRecordCard));
    this.count.textContent = `${records.length} ${records.length === 1 ? 'registro' : 'registros'}`;
    this.setState(records.length ? 'loaded' : 'empty');
  }

  async load() {
    const currentRequest = ++this.requestId;
    this.setState('loading');

    try {
      const records = await this.api.loadAllHistory();
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
