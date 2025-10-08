import api from './ApiClient';

const API_URL = '/vendors';

// Create a new vendor
export const createVendor = async (vendorData) => {
  const { data } = await api.post(API_URL, vendorData);
  return data;
};

// Get all vendors
export const getVendors = async () => {
  const { data } = await api.get(API_URL);
  // Normalize: ensure array and map _id to id
  const list = Array.isArray(data) ? data : (data?.vendors || data?.data || []);
  return list.map(v => ({ ...v, id: v.id ?? v._id }));
};

// Get a single vendor by ID
export const getVendorById = async (id) => {
  const { data } = await api.get(`${API_URL}/${id}`);
  return data;
};

// Update a vendor
export const updateVendor = async (id, vendorData) => {
  const { data } = await api.put(`${API_URL}/${id}`, vendorData);
  return data;
};

// Delete a vendor
export const deleteVendor = async (id) => {
  const { data } = await api.delete(`${API_URL}/${id}`);
  return data;
};
