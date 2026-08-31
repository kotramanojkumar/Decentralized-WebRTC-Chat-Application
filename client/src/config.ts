// Central API config — auto-detects production vs development
// In development: uses localhost:5000
// In production: uses the same host/port the page is served from
const isProduction = import.meta.env.PROD;
export const API_BASE = isProduction ? '' : 'http://localhost:5000';
export const API_URL = `${API_BASE}/api`;
export const SOCKET_URL = isProduction ? undefined : 'http://localhost:5000';
