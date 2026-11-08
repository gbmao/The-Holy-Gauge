import { vehicleApi } from '../js/api.js';

function createVehicleCard(vehicle) {
  const card = document.createElement('article');
  const header = document.createElement('header');
  const titleGroup = document.createElement('div');
  const recordId = document.createElement('span');
  const title = document.createElement('h3');
  const fields = document.createElement('dl');

  card.className = 'meus-veiculos-card';
  card.setAttribute('role', 'listitem');
  header.className = 'meus-veiculos-card-header';
  titleGroup.className = 'meus-veiculos-card-title-group';
  recordId.className = 'meus-veiculos-card-id';
  recordId.textContent = `VEÍCULO #${vehicle.id}`;
  title.className = 'meus-veiculos-card-title';
  title.textContent = vehicle.name;
  titleGroup.append(recordId, title);
  header.append(titleGroup);

  fields.className = 'meus-veiculos-card-fields';
  [
    ['Marca', vehicle.brand || 'Não informada'],
    ['Modelo', vehicle.model || 'Não informado'],
    ['Ano', vehicle.year ?? 'Não informado'],
  ].forEach(([label, value]) => {
    const field = document.createElement('div');
    const fieldLabel = document.createElement('dt');
    const fieldValue = document.createElement('dd');

    fieldLabel.textContent = label;
    fieldValue.textContent = String(value);
    field.append(fieldLabel, fieldValue);
    fields.append(field);
  });

  card.append(header, fields);
  return card;
}

export class MeusVeiculosPage {
  constructor(root, api = vehicleApi) {
    this.root = root;
    this.api = api;
    this.loading = root.querySelector('[data-loading]');
    this.list = root.querySelector('[data-vehicle-list]');
    this.empty = root.querySelector('[data-empty]');
    this.error = root.querySelector('[data-error]');
    this.count = root.querySelector('[data-vehicle-count]');
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

  render(vehicles) {
    this.list.replaceChildren(...vehicles.map(createVehicleCard));
    this.count.textContent = `${vehicles.length} ${vehicles.length === 1 ? 'veículo' : 'veículos'}`;
    this.setState(vehicles.length ? 'loaded' : 'empty');
  }

  async load() {
    const currentRequest = ++this.requestId;
    this.setState('loading');

    try {
      const vehicles = await this.api.loadAll();
      if (currentRequest === this.requestId) {
        this.render(vehicles);
      }
    } catch (error) {
      console.error('Não foi possível carregar os veículos.', error);
      if (currentRequest === this.requestId) {
        this.setState('error');
      }
    }
  }
}

const pageRoot = document.querySelector('[data-meus-veiculos-page]');
if (pageRoot) {
  new MeusVeiculosPage(pageRoot);
}
