/**
 * Configuración global de la aplicación.
 * Determina dinámicamente las URLs del backend basándose en el entorno de ejecución.
 */
const getBaseURL = () => {
  // Prioriza variables de entorno (útil en despliegues con Docker o CI/CD)
  if (process.env.REACT_APP_BASE_URL) {
    return process.env.REACT_APP_BASE_URL;
  }
  
  // NOTE: Fallback dinámico al host actual. Facilita el acceso desde red local (móviles).
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return `http://${host}/Reisaa_NexHive/backend`;
  }
  return `http://${host}/backend`;
};

const BASE = getBaseURL();

export const CONFIG = {
  BASE_URL: BASE,
  API_URL:    `${BASE}/api`,
  UPLOAD_URL: `${BASE}/upload`,
  STATIC_URL: `${BASE}`,
};