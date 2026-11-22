import { vehicleApi } from '../js/api.js';

export class AdicionarVeiculoPage {
  constructor(root, api = vehicleApi, { location = window.location } = {}) {
    this.root = root;
    this.api = api;
    this.location = location;
    this.form = root.querySelector('[data-form]');
    this.submitButton = root.querySelector('[data-submit]');
    this.submitLabel = root.querySelector('[data-submit-label]');
    this.feedback = root.querySelector('[data-feedback]');
    this.successDialog = root.querySelector('[data-success-dialog]');
    this.dialogOkButton = root.querySelector('[data-dialog-ok]');
    this.retryButton = root.querySelector('[data-retry-load]');
    this.fields = Object.fromEntries(['name', 'brand', 'model', 'year'].map((name) => (
      [name, this.form.elements.namedItem(name)]
    )));
    const parameters = new URLSearchParams(location.search);
    this.isEditing = parameters.has('id');
    const requestedId = parameters.get('id');
    this.vehicleId = /^\d+$/.test(requestedId ?? '') ? Number(requestedId) : null;
    this.isReady = !this.isEditing;
    this.isLoading = false;
    this.isSaving = false;
    this.hasSaved = false;

    if (this.isEditing) {
      document.title = 'Editar veículo | Controlador da Moto';
      root.querySelector('[data-page-title]').textContent = 'Editar veículo';
      root.querySelector('[data-page-description]').textContent = 'Atualize os dados deste veículo.';
      root.querySelector('[data-success-title]').textContent = 'Veículo atualizado';
      root.querySelector('[data-success-eyebrow]').textContent = 'EDIÇÃO CONCLUÍDA';
      root.querySelector('[data-submit-icon]').textContent = '✓';
    }

    this.form.addEventListener('submit', (event) => this.handleSubmit(event));
    this.dialogOkButton.addEventListener('click', () => this.closePage());
    this.successDialog.addEventListener('cancel', (event) => event.preventDefault());
    this.retryButton.addEventListener('click', () => this.loadVehicle());
    this.updateControls();
    this.loadPromise = this.isEditing ? this.loadVehicle() : Promise.resolve();
  }

  updateControls() {
    const disabled = !this.isReady || this.isLoading || this.isSaving || this.hasSaved;
    this.submitButton.disabled = disabled;
    this.submitLabel.textContent = this.isLoading ? 'Carregando…'
      : this.isSaving ? 'Salvando…'
        : this.isEditing ? 'Salvar alterações' : 'Salvar veículo';
    Object.values(this.fields).forEach((input) => { input.disabled = disabled; });
    this.retryButton.disabled = this.isLoading || this.isSaving;
    this.form.setAttribute('aria-busy', String(this.isLoading || this.isSaving));
  }

  async loadVehicle() {
    if (this.isLoading || !this.isEditing) {
      return;
    }
    this.isReady = false;
    this.retryButton.hidden = true;
    if (!Number.isSafeInteger(this.vehicleId) || this.vehicleId <= 0) {
      this.showFeedback('O veículo informado é inválido. Volte para Meus Veículos e escolha um veículo para editar.', 'error');
      this.updateControls();
      return;
    }

    this.isLoading = true;
    this.showFeedback('Carregando os dados do veículo…', 'info');
    this.updateControls();
    try {
      const vehicle = await this.api.getById(this.vehicleId);
      if (!vehicle) {
        this.showFeedback('O veículo não foi encontrado ou não está mais ativo. Volte para Meus Veículos.', 'error');
        return;
      }
      Object.entries(this.fields).forEach(([name, input]) => {
        input.value = vehicle[name] ?? '';
      });
      this.isReady = true;
      this.feedback.hidden = true;
    } catch (error) {
      console.error('Não foi possível carregar o veículo para edição.', error);
      this.showFeedback('Não foi possível carregar o veículo. Tente novamente.', 'error');
      this.retryButton.hidden = false;
    } finally {
      this.isLoading = false;
      this.updateControls();
    }
  }

  showFeedback(message, state) {
    this.feedback.textContent = message;
    this.feedback.dataset.state = state;
    this.feedback.setAttribute('role', state === 'error' ? 'alert' : 'status');
    this.feedback.hidden = false;
  }

  showSavedVehicle(vehicle) {
    const details = {
      name: vehicle.name,
      brand: vehicle.brand || 'Não informada',
      model: vehicle.model || 'Não informado',
      year: vehicle.year ?? 'Não informado',
      id: vehicle.id ? `#${vehicle.id}` : '—',
    };

    Object.entries(details).forEach(([key, value]) => {
      const field = this.successDialog.querySelector(`[data-vehicle-detail="${key}"]`);
      field.textContent = String(value);
    });

    this.successDialog.showModal();
  }

  closePage() {
    this.successDialog.close();
    this.location.replace('./meus-veiculos.html');
  }

  async handleSubmit(event) {
    event.preventDefault();

    if (!this.isReady || this.isLoading || this.isSaving || this.hasSaved || !this.form.reportValidity()) {
      return;
    }

    const yearValue = this.fields.year.value.trim();
    const vehicle = {
      name: this.fields.name.value.trim(),
      brand: this.fields.brand.value.trim() || null,
      model: this.fields.model.value.trim() || null,
      year: yearValue ? Number(yearValue) : null,
    };

    this.isSaving = true;
    this.updateControls();
    this.feedback.hidden = true;

    try {
      const savedVehicle = this.isEditing
        ? await this.api.update(this.vehicleId, vehicle)
        : await this.api.create(vehicle);
      this.showSavedVehicle(savedVehicle);
      this.hasSaved = true;
    } catch (error) {
      console.error('Não foi possível salvar o veículo.', error);
      this.showFeedback(
        error instanceof TypeError || error instanceof RangeError
          ? error.message
          : 'Não foi possível salvar o veículo. Confira os dados e tente novamente.',
        'error',
      );
    } finally {
      this.isSaving = false;
      this.updateControls();
    }
  }
}

const pageRoot = document.querySelector('[data-adicionar-veiculo-page]');
if (pageRoot) {
  new AdicionarVeiculoPage(pageRoot);
}
