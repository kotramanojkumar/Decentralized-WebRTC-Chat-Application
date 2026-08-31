// Central API config
const isProduction = import.meta.env.PROD;

// If VITE_API_URL is provided by Vercel, use it. Otherwise fallback to localhost.
export const API_BASE = import.meta.env.VITE_API_URL || (isProduction ? '' : 'http://localhost:5000');
export const API_URL = `${API_BASE}/api`;
export const SOCKET_URL = import.meta.env.VITE_API_URL || (isProduction ? undefined : 'http://localhost:5000');
