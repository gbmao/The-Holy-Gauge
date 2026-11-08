import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { requirePhotoVehicleId } from '../models/photo.js';

export const VEHICLE_PHOTOS_DIRECTORY = 'vehicle-photos';
const MANAGED_PHOTO_PATH = /^vehicle-photos\/vehicle_[1-9]\d*_\d+\.jpg$/;

function isMissingFile(error) {
  return /does not exist|not found|no such file/i.test(error?.message || '');
}

export class PhotoStorage {
  constructor(filesystem = Filesystem, convertFileSrc = Capacitor.convertFileSrc, now = Date.now) {
    this.filesystem = filesystem;
    this.convertFileSrc = convertFileSrc;
    this.now = now;
  }

  assertManagedPath(path) {
    if (typeof path !== 'string' || !MANAGED_PHOTO_PATH.test(path)) {
      throw new Error('O arquivo não pertence à pasta de fotos dos veículos.');
    }
  }

  async ensureDirectory() {
    try {
      await this.filesystem.mkdir({
        path: VEHICLE_PHOTOS_DIRECTORY,
        directory: Directory.Data,
        recursive: true,
      });
    } catch (error) {
      const info = await this.filesystem.stat({ path: VEHICLE_PHOTOS_DIRECTORY, directory: Directory.Data });
      if (info.type !== 'directory') {
        throw error;
      }
    }
  }

  async saveCameraPhoto(vehicleId, capturedPhoto) {
    requirePhotoVehicleId(vehicleId);
    if (!capturedPhoto?.path || !/^file:\/\//.test(capturedPhoto.path)) {
      throw new Error('A câmera não retornou um arquivo de foto válido.');
    }
    if (!['jpeg', 'jpg'].includes(capturedPhoto.format)) {
      throw new Error('A câmera não retornou uma foto JPEG.');
    }
    await this.ensureDirectory();
    const path = `${VEHICLE_PHOTOS_DIRECTORY}/vehicle_${vehicleId}_${this.now()}.jpg`;
    // Never overwrite an existing image, even if two captures share a timestamp.
    if (await this.exists(path)) {
      throw new Error('Já existe uma foto com esse nome. Tire a foto novamente.');
    }
    try {
      await this.filesystem.copy({ from: capturedPhoto.path, to: path, toDirectory: Directory.Data });
      return path;
    } catch (error) {
      await this.delete(path).catch((cleanupError) => console.error('Falha ao limpar a cópia incompleta.', cleanupError));
      throw error;
    }
  }

  async exists(path) {
    this.assertManagedPath(path);
    try {
      const info = await this.filesystem.stat({ path, directory: Directory.Data });
      return info.type === 'file';
    } catch (error) {
      if (isMissingFile(error)) {
        return false;
      }
      throw error;
    }
  }

  async getDisplayUrl(path) {
    if (!await this.exists(path)) {
      return null;
    }
    const { uri } = await this.filesystem.getUri({ path, directory: Directory.Data });
    return this.convertFileSrc(uri);
  }

  async delete(path) {
    this.assertManagedPath(path);
    try {
      await this.filesystem.deleteFile({ path, directory: Directory.Data });
    } catch (error) {
      if (!isMissingFile(error)) {
        throw error;
      }
    }
  }

  async discardCameraPhoto(capturedPhoto) {
    if (capturedPhoto?.path) {
      await this.filesystem.deleteFile({ path: capturedPhoto.path });
    }
  }
}
