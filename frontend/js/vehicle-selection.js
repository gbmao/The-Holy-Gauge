import { isNativeApp, vehicleApi } from './api.js';

export let veiculoselecionado = null;
let selectedVehicleRequest = null;

export function loadSelectedVehicleId() {
  if (!isNativeApp()) {
    veiculoselecionado = null;
    return Promise.resolve(null);
  }

  if (!selectedVehicleRequest) {
    selectedVehicleRequest = vehicleApi.getSelectedId()
      .then((selectedId) => {
        veiculoselecionado = selectedId;
        return selectedId;
      })
      .catch((error) => {
        veiculoselecionado = null;
        console.error('Não foi possível carregar o veículo selecionado.', error);
        return null;
      })
      .finally(() => {
        selectedVehicleRequest = null;
      });
  }

  return selectedVehicleRequest;
}

export function getSelectedVehicleId() {
  return loadSelectedVehicleId();
}
