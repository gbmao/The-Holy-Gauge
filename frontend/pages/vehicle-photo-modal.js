import { App } from '@capacitor/app';
import { isNativeApp, vehiclePhotoApi } from '../js/api.js';
import { getSelectedVehicleId } from '../js/vehicle-selection.js';

export class VehiclePhotoModal {
  constructor(root, {
    api = vehiclePhotoApi,
    selectedVehicleProvider = getSelectedVehicleId,
    closeOverlays = () => false,
  } = {}) {
    this.api = api;
    this.selectedVehicleProvider = selectedVehicleProvider;
    this.closeOverlays = closeOverlays;
    this.openButton = root.querySelector('[data-open-vehicle-photo]');
    this.heroStage = root.querySelector('#motorcycleStage');
    this.heroImage = root.querySelector('#homeMotorcycleImage');
    this.heroEmpty = root.querySelector('[data-home-vehicle-photo-empty]');
    this.dialog = root.querySelector('[data-vehicle-photo-dialog]');
    this.closeButton = root.querySelector('[data-close-vehicle-photo]');
    this.context = root.querySelector('[data-vehicle-photo-context]');
    this.loading = root.querySelector('[data-vehicle-photo-loading]');
    this.image = root.querySelector('[data-vehicle-photo-image]');
    this.empty = root.querySelector('[data-vehicle-photo-empty]');
    this.feedback = root.querySelector('[data-vehicle-photo-feedback]');
    this.captureButton = root.querySelector('[data-new-vehicle-photo]');
    this.deleteButton = root.querySelector('[data-delete-vehicle-photo]');
    this.retryButton = root.querySelector('[data-retry-vehicle-photo]');
    this.vehicleId = null;
    this.current = null;
    this.busy = false;
    this.isLoading = false;
    this.ready = false;
    this.requestId = 0;
    this.restoredListener = null;
    this.backListener = null;

    this.openButton.addEventListener('click', () => this.open());
    this.closeButton.addEventListener('click', () => this.dialog.close());
    this.captureButton.addEventListener('click', () => this.capture());
    this.deleteButton.addEventListener('click', () => this.delete());
    this.retryButton.addEventListener('click', () => this.load());
    this.dialog.addEventListener('cancel', (event) => {
      if (this.busy) {
        event.preventDefault();
      }
    });
    this.dialog.addEventListener('close', () => {
      this.openButton.setAttribute('aria-expanded', 'false');
      this.openButton.focus({ preventScroll: true });
    });
    this.dialog.addEventListener('click', (event) => {
      const bounds = this.dialog.getBoundingClientRect();
      if (!this.busy && event.target === this.dialog
        && (event.clientX < bounds.left || event.clientX > bounds.right
          || event.clientY < bounds.top || event.clientY > bounds.bottom)) {
        this.dialog.close();
      }
    });
    this.image.addEventListener('error', () => {
      this.image.hidden = true;
      this.empty.hidden = false;
      this.empty.textContent = 'A foto não está disponível. Você pode tirar uma nova.';
    });
    window.addEventListener('pagehide', () => {
      this.restoredListener?.remove();
      this.backListener?.remove();
      this.restoredListener = null;
      this.backListener = null;
    });
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        this.registerRestoredListener();
        this.load();
      }
    });
    this.registerRestoredListener();
    this.load();
  }

  async registerRestoredListener() {
    if (!isNativeApp() || this.restoredListener) {
      return;
    }
    try {
      this.restoredListener = await App.addListener('appRestoredResult', (event) => this.restoreCapture(event));
      this.backListener = await App.addListener('backButton', ({ canGoBack }) => {
        if (this.dialog.open) {
          if (!this.busy) {
            this.dialog.close();
          }
          return;
        }
        if (this.closeOverlays()) {
          return;
        }
        if (canGoBack) {
          window.history.back();
        } else {
          App.exitApp().catch((error) => console.error('Não foi possível fechar o app.', error));
        }
      });
    } catch (error) {
      console.error('Não foi possível registrar a recuperação da câmera.', error);
    }
  }

  async open() {
    if (!this.dialog.open) {
      this.dialog.showModal();
      this.openButton.setAttribute('aria-expanded', 'true');
    }
    await this.load();
  }

  updateControls() {
    const canChange = this.ready && this.vehicleId !== null && !this.isLoading && !this.busy;
    this.captureButton.disabled = !canChange;
    this.deleteButton.disabled = !canChange || this.current === null;
    this.closeButton.disabled = this.busy;
    this.retryButton.disabled = this.busy || this.isLoading;
    this.dialog.setAttribute('aria-busy', String(this.isLoading || this.busy));
  }

  showFeedback(message = '', state = 'info') {
    this.feedback.textContent = message;
    this.feedback.dataset.state = state;
    this.feedback.setAttribute('role', state === 'error' ? 'alert' : 'status');
    this.feedback.hidden = !message;
  }

  render(current) {
    this.current = current;
    const hasImage = Boolean(current?.url);
    this.heroStage.dataset.hasPhoto = String(hasImage);
    this.heroImage.hidden = !hasImage;
    this.heroEmpty.hidden = hasImage;
    this.image.hidden = !hasImage;
    this.empty.hidden = hasImage;
    if (hasImage) {
      const description = `Foto do veículo #${this.vehicleId}`;
      this.heroImage.alt = description;
      this.heroImage.src = current.url;
      this.image.alt = description;
      this.image.src = current.url;
    } else {
      this.heroImage.removeAttribute('src');
      this.heroImage.alt = 'Foto do veículo selecionado';
      this.heroEmpty.textContent = this.vehicleId === null
        ? 'Cadastre e selecione um veículo em Meus Veículos.'
        : 'Adicione uma foto pelo botão Foto.';
      this.image.removeAttribute('src');
      this.empty.textContent = this.vehicleId === null
        ? 'Cadastre e selecione um veículo em Meus Veículos para adicionar uma foto.'
        : current ? 'A foto não está disponível. Você pode tirar uma nova.' : 'Este veículo ainda não tem foto.';
    }
    this.updateControls();
  }

  async load() {
    const requestId = ++this.requestId;
    this.isLoading = true;
    this.ready = false;
    this.loading.hidden = false;
    this.image.hidden = true;
    this.empty.hidden = true;
    this.retryButton.hidden = true;
    this.showFeedback();
    this.updateControls();
    try {
      if (!isNativeApp()) {
        throw new Error('As fotos estão disponíveis no app Android.');
      }
      const vehicleId = await this.selectedVehicleProvider();
      const current = await this.api.getCurrent(vehicleId);
      if (requestId !== this.requestId) {
        return;
      }
      this.vehicleId = vehicleId;
      this.context.textContent = vehicleId === null ? 'Nenhum veículo selecionado' : `Veículo #${vehicleId}`;
      this.ready = true;
      this.render(current);
    } catch (error) {
      if (requestId === this.requestId) {
        console.error('Não foi possível carregar a foto.', error);
        this.context.textContent = 'Foto do veículo selecionado';
        this.showFeedback('Não foi possível carregar a foto. Tente novamente.', 'error');
        this.retryButton.hidden = false;
      }
    } finally {
      if (requestId === this.requestId) {
        this.isLoading = false;
        this.loading.hidden = true;
        this.updateControls();
      }
    }
  }

  async reloadPhoto() {
    this.render(await this.api.getCurrent(this.vehicleId));
  }

  async capture() {
    if (this.busy || this.isLoading || !this.ready || this.vehicleId === null) {
      return;
    }
    this.busy = true;
    this.updateControls();
    this.showFeedback('Aguardando a câmera…');
    try {
      const result = await this.api.capture(this.vehicleId);
      if (result) {
        await this.reloadPhoto();
        this.showFeedback(
          result.cleanupPending ? 'Foto salva. Não foi possível excluir uma foto anterior.' : 'Foto salva.',
          result.cleanupPending ? 'error' : 'success',
        );
      } else {
        this.showFeedback('Captura cancelada.');
      }
    } catch (error) {
      console.error('Não foi possível salvar a foto.', error);
      this.showFeedback(
        /permission|denied/i.test(error?.message || '')
          ? 'Não foi possível acessar a câmera. Confira as permissões nas configurações do Android.'
          : 'Não foi possível tirar ou salvar a foto. Tente novamente.',
        'error',
      );
    } finally {
      this.busy = false;
      this.updateControls();
    }
  }

  async delete() {
    if (this.busy || this.isLoading || !this.ready || !this.current || this.vehicleId === null) {
      return;
    }
    this.busy = true;
    this.updateControls();
    this.showFeedback('Excluindo foto…');
    try {
      await this.api.delete(this.vehicleId);
      await this.reloadPhoto();
      this.showFeedback('Foto excluída.', 'success');
    } catch (error) {
      console.error('Não foi possível excluir a foto.', error);
      await this.reloadPhoto().catch(() => {});
      this.showFeedback('Não foi possível excluir a foto. Tente novamente.', 'error');
    } finally {
      this.busy = false;
      this.updateControls();
    }
  }

  async restoreCapture(event) {
    if (event.pluginId !== 'Camera' || event.methodName !== 'getPhoto' || this.busy) {
      return;
    }
    this.busy = true;
    if (!this.dialog.open) {
      this.dialog.showModal();
      this.openButton.setAttribute('aria-expanded', 'true');
    }
    this.updateControls();
    this.showFeedback('Recuperando a foto da câmera…');
    try {
      const result = await this.api.restoreCapture(event);
      await this.load();
      if (result) {
        this.showFeedback('Foto salva.', 'success');
      }
    } catch (error) {
      console.error('Não foi possível recuperar a foto.', error);
      await this.load();
      this.showFeedback('Não foi possível salvar a foto recuperada. Tente novamente.', 'error');
    } finally {
      this.busy = false;
      this.updateControls();
    }
  }
}
