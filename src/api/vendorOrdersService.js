import api from './ApiClient';

const base = '/vendors';

export const listVendorOrders = async (vendorId, status) => {
  const params = {};
  if (status && (status === 'paid' || status === 'unpaid')) params.status = status;
  const { data } = await api.get(`${base}/${vendorId}/orders`, { params });
  const list = Array.isArray(data) ? data : (data?.orders || data?.data || []);
  return list.map(o => ({ ...o, id: o.id ?? o._id }));
};

export const createVendorOrder = async (vendorId, payload) => {
  const { data } = await api.post(`${base}/${vendorId}/orders`, payload);
  return { ...data, id: data.id ?? data._id };
};

export const updateVendorOrder = async (vendorId, id, payload) => {
  const { data } = await api.put(`${base}/${vendorId}/orders/${id}`, payload);
  return { ...data, id: data.id ?? data._id };
};

export const deleteVendorOrder = async (vendorId, id) => {
  const { data } = await api.delete(`${base}/${vendorId}/orders/${id}`);
  return data;
};

export const getOutstandingSummary = async () => {
  const { data } = await api.get(`${base}/outstanding-summary`);
  return data; // { totalOutstanding }
};

export const getOutstandingForVendor = async (vendorId) => {
  const { data } = await api.get(`${base}/${vendorId}/outstanding`);
  return data; // { totalOutstanding }
};
