 export const SERVER_URL = 'https://annmarie-humid-mateo.ngrok-free.dev';

const SERVER_HOST = '10.107.103.105';
const SERVER_PORT = '5000';

//export const SERVER_URL = `http://${SERVER_HOST}:${SERVER_PORT}`;
export const API_BASE_URL = `${SERVER_URL}/api`;
export const ERROR_LOG_URL = `${API_BASE_URL}/log-error`;

export const buildApiUrl = (endpoint = '') => {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${normalizedEndpoint}`;
};
