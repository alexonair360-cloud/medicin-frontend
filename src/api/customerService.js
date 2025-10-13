import api from './ApiClient';

export const listCustomers = async (q = '') => {
  const params = q ? { q } : undefined;
  const { data } = await api.get('/customers', { params });
  return Array.isArray(data) ? data : (data?.items || []);
};

export const createCustomer = async (payload) => {
  const { data } = await api.post('/customers', payload);
  return data;
};

export const updateCustomer = async (id, payload) => {
  const { data } = await api.put(`/customers/${id}`, payload);
  return data;
};

export const deleteCustomer = async (id) => {
  const { data } = await api.delete(`/customers/${id}`);
  return data;
};
