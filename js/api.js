// Keep the fueling interface stable while selecting HTTP or local SQLite by platform.
import { Capacitor } from '@capacitor/core';

export const API_CONFIG = {
  baseUrl: (import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5199').replace(/\/+$/, ''),
  endpoints: {
    fuelingHistory: '/api',
    fuelingRecord: '/api/refuelling',
    monthlyExpense: '/api/monthly-expense',
    averageConsumption: '/api/average-consumption',
  },
};

let nativeFuelingComponentsPromise = null;
let nativeMaintenanceComponentsPromise = null;

async function getNativeFuelingComponents() {
  if (!nativeFuelingComponentsPromise) {
    nativeFuelingComponentsPromise = Promise.all([
      import('./repositories/sqlite-refuelling-repository.js'),
      import('./services/refuelling-service.js'),
    ])
      .then(([repositoryModule, serviceModule]) => {
        const repository = new repositoryModule.SqliteRefuellingRepository();
        const service = new serviceModule.RefuellingService(repository);
        return { repository, service };
      })
      .catch((error) => {
        nativeFuelingComponentsPromise = null;
        throw error;
      });
  }

  return nativeFuelingComponentsPromise;
}

async function getNativeMaintenanceComponents() {
  if (!nativeMaintenanceComponentsPromise) {
    nativeMaintenanceComponentsPromise = Promise.all([
      import('./repositories/sqlite-maintenance-repository.js'),
      import('./services/maintenance-service.js'),
    ])
      .then(([repositoryModule, serviceModule]) => {
        const repository = new repositoryModule.SqliteMaintenanceRepository();
        const service = new serviceModule.MaintenanceService(repository);
        return { repository, service };
      })
      .catch((error) => {
        nativeMaintenanceComponentsPromise = null;
        throw error;
      });
  }

  return nativeMaintenanceComponentsPromise;
}

function isNativeApp() {
  return Capacitor.isNativePlatform();
}

function formatLiters(value) {
  return `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L`;
}

function formatOdometer(value) {
  return value === null || value === undefined
    ? '—'
    : `${Number(value).toLocaleString('pt-BR')} km`;
}

function formatCurrency(value) {
  return value === null || value === undefined
    ? '—'
    : Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\u00a0/g, ' ');
}

function mapNativeFuelingRecord(record) {
  return {
    ...record,
    station: 'Abastecimento',
    liters: formatLiters(record.liters),
    total: formatCurrency(record.total),
    odometer: formatOdometer(record.mileage),
  };
}


const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function sortRecordsRecentFirst(records) {
  return [...records].sort((first, second) => (
    new Date(second.occurredAt || 0).getTime() - new Date(first.occurredAt || 0).getTime()
  ));
}

export async function requestApi(endpoint, options = {}) {
  const response = await fetch(API_CONFIG.baseUrl + endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error('API request failed with status ' + response.status);
  }

  const responseBody = await response.text();
  return responseBody.trim() ? JSON.parse(responseBody) : null;
}

export const fuelingApi = {
  async loadHistory() {
    if (isNativeApp()) {
      const { repository } = await getNativeFuelingComponents();
      const records = await repository.getAll();
      return records.map(mapNativeFuelingRecord);
    }

    return requestApi(API_CONFIG.endpoints.fuelingHistory);
  },

  async addRecord(payload) {
    if (isNativeApp()) {
      const { service } = await getNativeFuelingComponents();
      const record = await service.create(payload);
      return mapNativeFuelingRecord(record);
    }

    return requestApi(API_CONFIG.endpoints.fuelingRecord, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getMonthlyExpense(month, year) {
    if (isNativeApp()) {
      const { repository } = await getNativeFuelingComponents();
      return repository.getMonthlyExpense(month, year);
    }

    const query = new URLSearchParams({ month: String(month), year: String(year) });
    return requestApi(API_CONFIG.endpoints.monthlyExpense + '?' + query);
  },

  async getAverageConsumption() {
    if (isNativeApp()) {
      const { repository } = await getNativeFuelingComponents();
      return repository.getAverageConsumption();
    }

    return requestApi(API_CONFIG.endpoints.averageConsumption);
  },

  async getTotalKm() {
    if (isNativeApp()) {
      const {repository} = await getNativeFuelingComponents();
      return repository.getTotalKm();
    }
    return requestApi(API_CONFIG.endpoints.totalKm);
  },
};

export const maintenanceApi = {
  async loadHistory() {
    if (isNativeApp()) {
      const { repository } = await getNativeMaintenanceComponents();
      const records = await repository.getAllMaintenances();
      return records.map(mapNativeMaintenanceRecord);
    }

    return requestApi('/api/maintenance');
  },

  async addRecord(payload) {
    return requestApi('/api/maintenance', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
