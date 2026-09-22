// Keep the API URL and endpoint names in one place for the future C# integration.
export const API_CONFIG = {
  baseUrl: 'http://localhost:5199',
  endpoints: {
    fuelingHistory: '/fuelings',
    maintenanceHistory: '/maintenance',
  },
};

const MOCK_FUELING_HISTORY = [
  {
    id: 'mock-fueling-001',
    occurredAt: '2026-07-28T16:30:00-03:00',
    date: '28 JUL 2026',
    station: 'Posto Central',
    liters: '11,4 L',
    total: 'R$ 69,45',
    odometer: '8.420 km',
  },
  {
    id: 'mock-fueling-002',
    occurredAt: '2026-07-12T10:15:00-03:00',
    date: '12 JUL 2026',
    station: 'Auto Posto Avenida',
    liters: '10,8 L',
    total: 'R$ 65,75',
    odometer: '8.155 km',
  },
  {
    id: 'mock-fueling-003',
    occurredAt: '2026-06-27T14:45:00-03:00',
    date: '27 JUN 2026',
    station: 'Posto da Serra',
    liters: '12,1 L',
    total: 'R$ 72,80',
    odometer: '7.890 km',
  },
];

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

// Maintenance methods still return mock data until their backend endpoints are available.
export const fuelingApi = {
  async loadHistory() {
    // return requestApi(API_CONFIG.endpoints.fuelingHistory);
    // await wait(650);
    // return sortRecordsRecentFirst(MOCK_FUELING_HISTORY);
    return requestApi('/api');
  },

  async addRecord(payload) {
    return requestApi('/api/refuelling', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getMonthlyExpense(month, year) {
    return requestApi(`/api/monthly-expense?month=${month}&year=${year}`);
  },

  async getAverageConsumption() {
    return requestApi('/api/average-consumption');
  },
};

export const maintenanceApi = {
  async loadHistory() {
    // return requestApi(API_CONFIG.endpoints.maintenanceHistory);
    await wait(650);
    return sortRecordsRecentFirst(MOCK_MAINTENANCE_HISTORY);
  },

  async addRecord(payload) {
    // return requestApi(API_CONFIG.endpoints.maintenanceHistory, {
    //   method: 'POST',
    //   body: JSON.stringify(payload),
    // });
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
