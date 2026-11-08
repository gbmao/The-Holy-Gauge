import { Photo, VEHICLE_PHOTO_TYPE, requirePhotoVehicleId } from '../models/photo.js';

export class PhotoService {
  constructor(repository, storage, camera) {
    this.repository = repository;
    this.storage = storage;
    this.camera = camera;
  }

  async getCurrent(vehicleId) {
    if (vehicleId === null) {
      return null;
    }
    requirePhotoVehicleId(vehicleId);
    if (!await this.repository.isVehicleActive(vehicleId)) {
      return null;
    }
    const [photo] = await this.repository.getForVehicle(vehicleId, VEHICLE_PHOTO_TYPE);
    return photo ? { photo, url: await this.storage.getDisplayUrl(photo.filePath) } : null;
  }

  async captureAndSave(vehicleId) {
    requirePhotoVehicleId(vehicleId);
    if (!await this.repository.isVehicleActive(vehicleId)) {
      throw new Error('O veículo não está mais ativo.');
    }
    try {
      const captured = await this.camera.capture(vehicleId);
      return captured ? await this.saveCapture(vehicleId, captured) : null;
    } finally {
      this.camera.finishCapture();
    }
  }

  async restoreCapture(event) {
    if (event.pluginId !== 'Camera' || event.methodName !== 'getPhoto') {
      return null;
    }
    const vehicleId = this.camera.getPendingVehicleId();
    if (vehicleId === null) {
      return null;
    }
    try {
      if (!event.success) {
        // Cancellation after process restoration should also leave the old photo intact.
        if (/cancel(?:led|ed)/i.test(event.error?.message || '')) {
          return null;
        }
        throw new Error('Não foi possível recuperar a foto da câmera.');
      }
      return await this.saveCapture(vehicleId, event.data);
    } finally {
      this.camera.finishCapture();
    }
  }

  async saveCapture(vehicleId, captured) {
    try {
      if (!await this.repository.isVehicleActive(vehicleId)) {
        throw new Error('O veículo não está mais ativo.');
      }
      const previousPhotos = await this.repository.getForVehicle(vehicleId, VEHICLE_PHOTO_TYPE);
      const filePath = await this.storage.saveCameraPhoto(vehicleId, captured);
      let photo;
      try {
        photo = await this.repository.create(new Photo({ vehicleId, filePath }));
      } catch (error) {
        // A database failure must not leave a new image taking up space.
        await this.storage.delete(filePath).catch((cleanupError) => console.error('Falha ao remover a foto não salva.', cleanupError));
        throw error;
      }
      const cleanupPending = await this.removePhotos(previousPhotos, true);
      return { photo, cleanupPending };
    } finally {
      await this.storage.discardCameraPhoto(captured).catch((error) => console.error('Falha ao limpar o arquivo temporário da câmera.', error));
    }
  }

  async removePhotos(photos, bestEffort = false) {
    let cleanupPending = false;
    for (const photo of photos) {
      try {
        // Keep the database reference until the actual file has been removed.
        await this.storage.delete(photo.filePath);
        await this.repository.delete(photo.id, photo.vehicleId);
      } catch (error) {
        if (!bestEffort) {
          throw error;
        }
        cleanupPending = true;
        console.error('Não foi possível remover uma foto anterior.', error);
      }
    }
    return cleanupPending;
  }

  async deleteCurrent(vehicleId) {
    requirePhotoVehicleId(vehicleId);
    const photos = await this.repository.getForVehicle(vehicleId, VEHICLE_PHOTO_TYPE);
    await this.removePhotos(photos);
  }

  async deleteAllForVehicle(vehicleId) {
    requirePhotoVehicleId(vehicleId);
    await this.removePhotos(await this.repository.getForVehicle(vehicleId));
  }
}
