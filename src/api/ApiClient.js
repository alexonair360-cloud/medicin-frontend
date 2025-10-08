import axios from 'axios';

// Prefer environment variable, fallback to local dev backend
// Use process.env for tests/Node; in Vite builds you can set VITE_API_BASE_URL via define or adapt here later
const BASE_URL = (typeof process !== 'undefined' && process.env && process.env.VITE_API_BASE_URL) || 'http://13.202.146.173:4000/api';

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Helpers to manage auth token centrally
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('auth_token', token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  }
};

export const clearAuthToken = () => {
  localStorage.removeItem('auth_token');
  delete api.defaults.headers.common.Authorization;
};

// Initialize from storage if present
(() => {
  const existing = localStorage.getItem('auth_token');
  if (existing) {
    api.defaults.headers.common.Authorization = `Bearer ${existing}`;
  }
})();

// Request interceptor (no-op besides ensuring auth header exists)
api.interceptors.request.use(
  (config) => {
    if (!config.headers.Authorization) {
      const token = localStorage.getItem('auth_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: basic 401 handling hook
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      // Optionally clear token or redirect; keeping it conservative here
      // clearAuthToken();
    }
    return Promise.reject(error);
  }
);

export default api;

