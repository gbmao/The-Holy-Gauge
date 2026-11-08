import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { requirePhotoVehicleId } from '../models/photo.js';

const PENDING_CAPTURE_KEY = 'controlador-da-moto-pending-vehicle-photo';

export function isCameraCancellation(error) {
  return /cancel(?:led|ed)/i.test(error?.message || String(error || ''));
}

export class PhotoCamera {
  constructor(camera = Camera, pendingStorage = globalThis.localStorage) {
    this.camera = camera;
    this.pendingStorage = pendingStorage;
  }

  async capture(vehicleId) {
    requirePhotoVehicleId(vehicleId);
    // Persist the original vehicle before Android opens the camera Activity.
    this.pendingStorage.setItem(PENDING_CAPTURE_KEY, String(vehicleId));
    try {
      return await this.camera.getPhoto({
        source: CameraSource.Camera,
        resultType: CameraResultType.Uri,
        quality: 80,
        width: 1600,
        height: 1600,
        correctOrientation: true,
        allowEditing: false,
        saveToGallery: false,
      });
    } catch (error) {
      if (isCameraCancellation(error)) {
        return null;
      }
      throw error;
    }
  }

  getPendingVehicleId() {
    const stored = this.pendingStorage.getItem(PENDING_CAPTURE_KEY);
    const id = stored ? Number(stored) : null;
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  }

  finishCapture() {
    this.pendingStorage.removeItem(PENDING_CAPTURE_KEY);
  }
}
