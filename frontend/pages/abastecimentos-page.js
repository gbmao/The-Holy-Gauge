import { fuelingApi } from '../js/api.js';

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

function createRecordCard(record, index) {
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
  return card;
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
    this.requestId = 0;

    this.refreshButton.addEventListener('click', () => this.load());
    this.retryButton.addEventListener('click', () => this.load());
    window.addEventListener('fueling-record-added', () => this.load());
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
