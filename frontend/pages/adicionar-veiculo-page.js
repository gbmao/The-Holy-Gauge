import { vehicleApi } from '../js/api.js';

export class AdicionarVeiculoPage {
  constructor(root, api = vehicleApi) {
    this.root = root;
    this.api = api;
    this.form = root.querySelector('[data-form]');
    this.submitButton = root.querySelector('[data-submit]');
    this.submitLabel = root.querySelector('[data-submit-label]');
    this.feedback = root.querySelector('[data-feedback]');
    this.successDialog = root.querySelector('[data-success-dialog]');
    this.dialogOkButton = root.querySelector('[data-dialog-ok]');

    this.form.addEventListener('submit', (event) => this.handleSubmit(event));
    this.dialogOkButton.addEventListener('click', () => this.closePage());
    this.successDialog.addEventListener('cancel', (event) => event.preventDefault());
  }

  setSaving(isSaving) {
    this.submitButton.disabled = isSaving;
    this.submitLabel.textContent = isSaving ? 'Salvando…' : 'Salvar veículo';
  }

  showFeedback(message, state) {
    this.feedback.textContent = message;
    this.feedback.dataset.state = state;
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
    window.location.replace('./meus-veiculos.html');
  }

  async handleSubmit(event) {
    event.preventDefault();

    if (!this.form.reportValidity()) {
      return;
    }

    const formData = new FormData(this.form);
    const yearValue = String(formData.get('year') || '').trim();
    const vehicle = {
      name: String(formData.get('name') || '').trim(),
      brand: String(formData.get('brand') || '').trim() || null,
      model: String(formData.get('model') || '').trim() || null,
      year: yearValue ? Number(yearValue) : null,
    };

    this.setSaving(true);
    this.feedback.hidden = true;

    try {
      const savedVehicle = await this.api.create(vehicle);
      this.showSavedVehicle(savedVehicle);
    } catch (error) {
      console.error('Não foi possível adicionar o veículo.', error);
      this.showFeedback('Não foi possível salvar o veículo. Confira os dados e tente novamente.', 'error');
    } finally {
      this.setSaving(false);
    }
  }
}

const pageRoot = document.querySelector('[data-adicionar-veiculo-page]');
if (pageRoot) {
  new AdicionarVeiculoPage(pageRoot);
}
