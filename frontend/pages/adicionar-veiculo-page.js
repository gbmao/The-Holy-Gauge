import { vehicleApi } from '../js/api.js';

export class AdicionarVeiculoPage {
  constructor(root, api = vehicleApi) {
    this.root = root;
    this.api = api;
    this.form = root.querySelector('[data-form]');
    this.submitButton = root.querySelector('[data-submit]');
    this.submitLabel = root.querySelector('[data-submit-label]');
    this.feedback = root.querySelector('[data-feedback]');

    this.form.addEventListener('submit', (event) => this.handleSubmit(event));
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
      this.form.reset();
      this.showFeedback(`${savedVehicle.name} foi adicionado à sua garagem.`, 'success');
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
