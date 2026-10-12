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

const MOCK_MAINTENANCE_HISTORY = [
  {
    id: 'mock-maintenance-001',
    occurredAt: '2026-07-25T09:30:00-03:00',
    date: '25 JUL 2026',
    service: 'Troca de óleo',
    workshop: 'Moto Center',
    cost: 'R$ 120,00',
    odometer: '8.350 km',
    status: 'Concluída',
  },
  {
    id: 'mock-maintenance-002',
    occurredAt: '2026-06-18T15:00:00-03:00',
    date: '18 JUN 2026',
    service: 'Revisão dos freios',
    workshop: 'Oficina Avenida',
    cost: 'R$ 85,00',
    odometer: '7.950 km',
    status: 'Concluída',
  },
  {
    id: 'mock-maintenance-003',
    occurredAt: '2026-04-09T11:20:00-03:00',
    date: '09 ABR 2026',
    service: 'Troca de relação',
    workshop: 'Garagem XRE',
    cost: 'R$ 480,00',
    odometer: '7.100 km',
    status: 'Concluída',
  },
];

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
};

// Maintenance methods still return mock data until their backend endpoints are available.
export const maintenanceApi = {
  async loadHistory() {
    await wait(650);
    return sortRecordsRecentFirst(MOCK_MAINTENANCE_HISTORY);
  },

  async addRecord(payload) {
    await wait(400);
    return {
      id: 'mock-maintenance-' + Date.now(),
      occurredAt: new Date().toISOString(),
      date: 'AGORA',
      service: 'Nova manutenção',
      workshop: 'Aguardando oficina',
      cost: '—',
      odometer: 'Pendente',
      status: 'Pendente',
      ...payload,
    };
  },
};
