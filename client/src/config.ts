// Central API config
const isProduction = import.meta.env.PROD;
const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');

// If VITE_API_URL is provided, use it. Otherwise fallback to relative in production, localhost in development.
export const API_BASE = rawApiUrl || (isProduction ? '' : 'http://localhost:5000');
export const API_URL = `${API_BASE}/api`;
export const SOCKET_URL = rawApiUrl || (isProduction ? undefined : 'http://localhost:5000');
