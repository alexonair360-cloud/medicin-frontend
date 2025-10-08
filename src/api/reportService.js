import api from './ApiClient';

export const getSalesReport = async (params = {}) => {
  const { data } = await api.get('/reports/sales', { params });
  return data;
};

export const getExpiringBatches = async (params = {}) => {
  const { data } = await api.get('/reports/expiring-batches', { params });
  return data;
};

export const getMedicines = async () => {
  const { data } = await api.get('/medicines');
  return Array.isArray(data) ? data : (data?.items || []);
};

export const getStockSummary = async () => {
  const { data } = await api.get('/inventory/stock-summary');
  return Array.isArray(data) ? data : (data?.items || []);
};
