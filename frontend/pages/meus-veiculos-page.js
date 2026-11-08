import { vehicleApi } from '../js/api.js';
import { loadSelectedVehicleId, veiculoselecionado } from '../js/vehicle-selection.js';

function createVehicleCard(vehicle, isSelected, onDelete, onSelect) {
  const card = document.createElement('article');
  const selectButton = document.createElement('div');
  const header = document.createElement('header');
  const titleGroup = document.createElement('div');
  const recordId = document.createElement('span');
  const title = document.createElement('h3');
  const deleteButton = document.createElement('button');
  const fields = document.createElement('dl');

  card.className = 'meus-veiculos-card';
  card.setAttribute('role', 'listitem');
  card.dataset.selected = String(isSelected);
  selectButton.className = 'meus-veiculos-card-select';
  selectButton.setAttribute('role', 'button');
  selectButton.tabIndex = 0;
  selectButton.dataset.selectVehicle = '';
  selectButton.dataset.vehicleId = String(vehicle.id);
  selectButton.setAttribute('aria-pressed', String(isSelected));
  selectButton.setAttribute('aria-label', `Selecionar veículo ${vehicle.name}, marca ${vehicle.brand || 'não informada'}, modelo ${vehicle.model || 'não informado'}, ano ${vehicle.year ?? 'não informado'}`);
  selectButton.addEventListener('click', () => onSelect(vehicle, selectButton));
  selectButton.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(vehicle, selectButton);
    }
  });
  header.className = 'meus-veiculos-card-header';
  titleGroup.className = 'meus-veiculos-card-title-group';
  recordId.className = 'meus-veiculos-card-id';
  recordId.textContent = `VEÍCULO #${vehicle.id}`;
  title.className = 'meus-veiculos-card-title';
  title.textContent = vehicle.name;
  deleteButton.className = 'meus-veiculos-delete';
  deleteButton.type = 'button';
  deleteButton.textContent = 'Excluir veículo';
  deleteButton.setAttribute('aria-label', `Excluir veículo ${vehicle.name}`);
  deleteButton.addEventListener('click', () => onDelete(vehicle));
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

  selectButton.append(header, fields);
  card.append(selectButton, deleteButton);
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
    this.feedback = root.querySelector('[data-feedback]');
    this.refreshButton = root.querySelector('[data-refresh]');
    this.retryButton = root.querySelector('[data-retry]');
    this.deleteDialog = root.querySelector('[data-delete-dialog]');
    this.deleteName = root.querySelector('[data-delete-name]');
    this.deleteError = root.querySelector('[data-delete-error]');
    this.cancelDeleteButton = root.querySelector('[data-cancel-delete]');
    this.confirmDeleteButton = root.querySelector('[data-confirm-delete]');
    this.confirmDeleteLabel = root.querySelector('[data-confirm-delete-label]');
    this.requestId = 0;
    this.pendingDelete = null;
    this.isDeleting = false;
    this.isSelectingVehicle = false;

    this.refreshButton.addEventListener('click', () => this.load());
    this.retryButton.addEventListener('click', () => this.load());
    this.cancelDeleteButton.addEventListener('click', () => this.deleteDialog.close());
    this.confirmDeleteButton.addEventListener('click', () => this.confirmDeleteVehicle());
    this.deleteDialog.addEventListener('cancel', (event) => {
      if (this.isDeleting) {
        event.preventDefault();
      }
    });
    this.deleteDialog.addEventListener('close', () => this.clearPendingDelete());
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
    this.list.replaceChildren(...vehicles.map((vehicle) => (
      createVehicleCard(
        vehicle,
        Number(vehicle.id) === veiculoselecionado,
        (selectedVehicle) => this.askDeleteVehicle(selectedVehicle),
        (selectedVehicle, button) => this.selectVehicle(selectedVehicle, button),
      )
    )));
    this.count.textContent = `${vehicles.length} ${vehicles.length === 1 ? 'veículo' : 'veículos'}`;
    this.setState(vehicles.length ? 'loaded' : 'empty');
  }

  updateSelectionStyles() {
    this.list.querySelectorAll('[data-select-vehicle]').forEach((button) => {
      const isSelected = Number(button.dataset.vehicleId) === veiculoselecionado;
      button.setAttribute('aria-pressed', String(isSelected));
      button.closest('.meus-veiculos-card').dataset.selected = String(isSelected);
    });
  }

  async selectVehicle(vehicle, button) {
    if (this.isSelectingVehicle || Number(vehicle.id) === veiculoselecionado) {
      return;
    }

    this.isSelectingVehicle = true;
    this.list.querySelectorAll('[data-select-vehicle]').forEach((item) => {
      item.setAttribute('aria-disabled', 'true');
    });
    this.feedback.hidden = true;

    try {
      const wasSelected = await this.api.select(Number(vehicle.id));
      if (!wasSelected) {
        throw new Error('O veículo não está mais ativo.');
      }

      const selectedId = await loadSelectedVehicleId();
      if (selectedId !== Number(vehicle.id)) {
        throw new Error('Não foi possível confirmar a seleção do veículo.');
      }

      this.updateSelectionStyles();
      this.showFeedback(`${vehicle.name} selecionado.`, 'success');
    } catch (error) {
      console.error('Não foi possível selecionar o veículo.', error);
      this.showFeedback('Não foi possível selecionar este veículo. Tente novamente.', 'error');
    } finally {
      this.isSelectingVehicle = false;
      this.list.querySelectorAll('[data-select-vehicle]').forEach((item) => {
        item.removeAttribute('aria-disabled');
      });
      if (button.isConnected) {
        button.focus();
      }
    }
  }

  showFeedback(message, state) {
    this.feedback.textContent = message;
    this.feedback.dataset.state = state;
    this.feedback.setAttribute('role', state === 'error' ? 'alert' : 'status');
    this.feedback.hidden = false;
  }

  askDeleteVehicle(vehicle) {
    this.pendingDelete = vehicle;
    this.deleteName.textContent = vehicle.name;
    this.deleteError.hidden = true;
    this.confirmDeleteButton.disabled = false;
    this.cancelDeleteButton.disabled = false;
    this.confirmDeleteLabel.textContent = 'Excluir veículo';
    this.feedback.hidden = true;
    this.deleteDialog.showModal();
  }

  clearPendingDelete() {
    this.pendingDelete = null;
    this.isDeleting = false;
    this.confirmDeleteButton.disabled = false;
    this.cancelDeleteButton.disabled = false;
    this.confirmDeleteLabel.textContent = 'Excluir veículo';
  }

  async confirmDeleteVehicle() {
    const vehicle = this.pendingDelete;
    if (!vehicle || this.isDeleting) {
      return;
    }

    this.isDeleting = true;
    this.confirmDeleteButton.disabled = true;
    this.cancelDeleteButton.disabled = true;
    this.confirmDeleteLabel.textContent = 'Excluindo…';
    this.deleteError.hidden = true;

    try {
      const wasDeleted = await this.api.delete(vehicle.id);
      if (!wasDeleted) {
        throw new Error('O veículo não está mais ativo.');
      }

      this.deleteDialog.close();
      await this.load();
      this.showFeedback(`${vehicle.name} e seus registros associados foram inativados.`, 'success');
    } catch (error) {
      console.error('Não foi possível excluir o veículo.', error);
      this.isDeleting = false;
      this.confirmDeleteButton.disabled = false;
      this.cancelDeleteButton.disabled = false;
      this.confirmDeleteLabel.textContent = 'Excluir veículo';
      this.deleteError.hidden = false;
    }
  }

  async load() {
    const currentRequest = ++this.requestId;
    this.setState('loading');

    try {
      const vehicles = await this.api.loadAll();
      await loadSelectedVehicleId();
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
