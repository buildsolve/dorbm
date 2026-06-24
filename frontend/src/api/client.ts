import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// --- Auth ---
export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  profile: () => api.get('/auth/profile'),
  users: () => api.get('/auth/users'),
  updateUser: (id: string, data: any) => api.patch(`/auth/users/${id}`, data),
};

// --- Inventory ---
export const inventoryApi = {
  ingredients: {
    list: (includeInactive = false) => api.get('/inventory/ingredients', { params: { includeInactive } }),
    get: (id: string) => api.get(`/inventory/ingredients/${id}`),
    create: (data: any) => api.post('/inventory/ingredients', data),
    update: (id: string, data: any) => api.patch(`/inventory/ingredients/${id}`, data),
    delete: (id: string) => api.delete(`/inventory/ingredients/${id}`),
    valuation: () => api.get('/inventory/ingredients/valuation'),
  },
  suppliers: {
    list: (includeInactive = false) => api.get('/inventory/suppliers', { params: { includeInactive } }),
    get: (id: string) => api.get(`/inventory/suppliers/${id}`),
    create: (data: any) => api.post('/inventory/suppliers', data),
    update: (id: string, data: any) => api.patch(`/inventory/suppliers/${id}`, data),
    delete: (id: string) => api.delete(`/inventory/suppliers/${id}`),
  },
  stock: {
    transactions: (params?: any) => api.get('/inventory/stock/transactions', { params }),
    lowStock: () => api.get('/inventory/stock/alerts/low-stock'),
    stockIn: (data: any) => api.post('/inventory/stock/stock-in', data),
    stockOut: (data: any) => api.post('/inventory/stock/stock-out', data),
    wastage: (data: any) => api.post('/inventory/stock/wastage', data),
  },
};

// --- Recipes ---
export const recipesApi = {
  list: (includeInactive = false) => api.get('/recipes', { params: { includeInactive } }),
  get: (id: string) => api.get(`/recipes/${id}`),
  create: (data: any) => api.post('/recipes', data),
  update: (id: string, data: any) => api.patch(`/recipes/${id}`, data),
  delete: (id: string) => api.delete(`/recipes/${id}`),
  versions: (id: string) => api.get(`/recipes/${id}/versions`),
  cost: (id: string) => api.get(`/recipes/${id}/cost`),
};

// --- Products ---
export const productsApi = {
  list: (params?: any) => api.get('/products', { params }),
  get: (id: string) => api.get(`/products/${id}`),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.patch(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
  topMargin: () => api.get('/products/top-margin'),
  categories: {
    list: () => api.get('/categories'),
    create: (data: any) => api.post('/categories', data),
    update: (id: string, data: any) => api.patch(`/categories/${id}`, data),
    delete: (id: string) => api.delete(`/categories/${id}`),
  },
};

// --- Production ---
export const productionApi = {
  plans: {
    list: (params?: any) => api.get('/production/plans', { params }),
    get: (id: string) => api.get(`/production/plans/${id}`),
    create: (data: any) => api.post('/production/plans', data),
    update: (id: string, data: any) => api.patch(`/production/plans/${id}`, data),
    confirm: (id: string) => api.post(`/production/plans/${id}/confirm`),
    pickList: (id: string) => api.get(`/production/plans/${id}/pick-list`),
    delete: (id: string) => api.delete(`/production/plans/${id}`),
  },
  batches: {
    list: (planId?: string) => api.get('/production/batches', { params: { planId } }),
    get: (id: string) => api.get(`/production/batches/${id}`),
    create: (data: any) => api.post('/production/batches', data),
    start: (id: string) => api.post(`/production/batches/${id}/start`),
    complete: (id: string, data: any) => api.post(`/production/batches/${id}/complete`, data),
    update: (id: string, data: any) => api.patch(`/production/batches/${id}`, data),
    delete: (id: string) => api.delete(`/production/batches/${id}`),
  },
};

// --- Storage ---
export const storageApi = {
  records: {
    list: (params?: any) => api.get('/storage', { params }),
    get: (id: string) => api.get(`/storage/${id}`),
    create: (data: any) => api.post('/storage', data),
    update: (id: string, data: any) => api.patch(`/storage/${id}`, data),
    move: (id: string, data: any) => api.post(`/storage/${id}/movement`, data),
    delete: (id: string) => api.delete(`/storage/${id}`),
  },
  summary: () => api.get('/storage/summary'),
  expiring: (days?: number) => api.get('/storage/expiring', { params: { days } }),
  fifo: (productId: string) => api.get(`/storage/fifo/${productId}`),
  locations: {
    list: () => api.get('/storage/locations'),
    create: (data: any) => api.post('/storage/locations', data),
    update: (id: string, data: any) => api.patch(`/storage/locations/${id}`, data),
    delete: (id: string) => api.delete(`/storage/locations/${id}`),
  },
};

// --- ESSO ---
export const essoApi = {
  products: () => api.get('/esso/products'),
  simulate: (dto: any) => api.post('/esso/simulate', dto),
  costModels: {
    list: () => api.get('/esso/cost-models'),
    get: (id: string) => api.get(`/esso/cost-models/${id}`),
    upsert: (productId: string, data: any) => api.put(`/esso/cost-models/${productId}`, data),
    delete: (id: string) => api.delete(`/esso/cost-models/${id}`),
  },
  capacities: {
    list: () => api.get('/esso/capacities'),
    upsert: (data: any) => api.post('/esso/capacities', data),
    delete: (id: string) => api.delete(`/esso/capacities/${id}`),
  },
  scenarios: {
    list: () => api.get('/esso/scenarios'),
    create: (data: any) => api.post('/esso/scenarios', data),
    update: (id: string, data: any) => api.put(`/esso/scenarios/${id}`, data),
    delete: (id: string) => api.delete(`/esso/scenarios/${id}`),
    run: (id: string) => api.post(`/esso/scenarios/${id}/run`),
  },
};

// --- Weekly Planning ---
export const weeklyApi = {
  stages: {
    get: (recipeId: string) => api.get(`/weekly/stages/${recipeId}`),
    upsert: (recipeId: string, stages: any[]) => api.put(`/weekly/stages/${recipeId}`, { stages }),
  },
  plans: {
    list: () => api.get('/weekly/plans'),
    get: (id: string) => api.get(`/weekly/plans/${id}`),
    create: (data: any) => api.post('/weekly/plans', data),
    update: (id: string, data: any) => api.patch(`/weekly/plans/${id}`, data),
    delete: (id: string) => api.delete(`/weekly/plans/${id}`),
    generate: (id: string, entries: any[]) => api.post(`/weekly/plans/${id}/generate`, { entries }),
    complete: (id: string) => api.patch(`/weekly/plans/${id}/complete`),
    clearTasks: (id: string) => api.delete(`/weekly/plans/${id}/tasks`),
    addTask: (id: string, data: any) => api.post(`/weekly/plans/${id}/tasks`, data),
  },
  tasks: {
    update: (taskId: string, data: any) => api.patch(`/weekly/tasks/${taskId}`, data),
    delete: (taskId: string) => api.delete(`/weekly/tasks/${taskId}`),
  },
};

// --- Team / Employees ---
export const employeeApi = {
  list: (includeInactive = false) => api.get('/employees', { params: { includeInactive } }),
  create: (data: any) => api.post('/employees', data),
  update: (id: string, data: any) => api.patch(`/employees/${id}`, data),
  delete: (id: string) => api.delete(`/employees/${id}`),
};

// --- Dashboard ---
export const dashboardApi = {
  overview: () => api.get('/dashboard/overview'),
  productionEfficiency: () => api.get('/dashboard/production-efficiency'),
  topProducts: () => api.get('/dashboard/top-products'),
  stockTrend: (days?: number) => api.get('/dashboard/stock-trend', { params: { days } }),
  cogs: (from?: string, to?: string) => api.get('/dashboard/cogs', { params: { from, to } }),
  forecast: () => api.get('/dashboard/forecast'),
  labourEfficiency: (weeks?: number) => api.get('/dashboard/labour-efficiency', { params: { weeks } }),
  inventoryImpact: (window?: string) => api.get('/dashboard/inventory-impact', { params: { window } }),
  salesPipeline: () => api.get('/dashboard/sales-pipeline'),
  strategicKpis: () => api.get('/dashboard/strategic-kpis'),
  businessOutlook: (window?: string, from?: string, to?: string) => api.get('/dashboard/business-outlook', { params: { window, from, to } }),
  operationsKpis: (window?: string) => api.get('/dashboard/operations-kpis', { params: { window } }),
  annualPlan: (year?: number) => api.get('/dashboard/annual-plan', { params: { year } }),
  salesHistory: (window?: string) => api.get('/dashboard/sales-history', { params: { window } }),
};

// --- Trace ---
export const traceApi = {
  getBatch: (storageRecordId: string) => api.get(`/trace/batch/${storageRecordId}`),
  getProductBatches: (productId: string) => api.get(`/trace/product/${productId}/batches`),
};

// --- Business Journal ---
export const journalApi = {
  list: (params?: { status?: string; productId?: string; from?: string; to?: string; limit?: number }) =>
    api.get('/journal', { params }),
};

// --- Equipment ---
export const equipmentClientApi = {
  list: () => api.get('/equipment').then(r => r.data),
};

// --- Building Cost ---
export const buildingCostClientApi = {
  list: () => api.get('/building-cost').then(r => r.data),
};
