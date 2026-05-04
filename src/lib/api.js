import axios from 'axios';

const STORAGE_KEY = 'tombot_panel_token';

export function getToken() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(STORAGE_KEY, token);
    else       localStorage.removeItem(STORAGE_KEY);
  } catch { /* noop */ }
}

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

export const api = axios.create({
  baseURL,
  timeout: 20_000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onUnauthorizedHandler = null;
export function setOnUnauthorized(fn) { onUnauthorizedHandler = fn; }

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      setToken(null);
      if (onUnauthorizedHandler) onUnauthorizedHandler();
    }
    return Promise.reject(err);
  }
);

export function apiError(err, fallback = 'Error de red') {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
}
