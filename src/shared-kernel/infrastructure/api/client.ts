// Shared Kernel — Axios API Client
// Đây là single source of truth cho mọi HTTP call

import axios from 'axios';

export const BASE_URL = 'https://demo.vnseea.com';
const SERVER_KEY = process.env.VNSEEA_SERVER_KEY ?? '';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Auto-inject access_token (GET) + server_key (POST)
apiClient.interceptors.request.use(config => {
  // TODO: lấy token từ MMKV
  // const token = mmkvStorage.getString('access_token');
  // if (token) config.params = { ...config.params, access_token: token };
  if (config.data) {
    config.data = { ...config.data, server_key: SERVER_KEY };
  }
  return config;
});

// Handle WoWonder api_status error pattern
apiClient.interceptors.response.use(response => {
  const { data } = response;
  if (String(data?.api_status) === '400') {
    const msg = data?.errors?.error_text ?? 'Unknown API error';
    throw new Error(msg);
  }
  return response;
});

export default apiClient;
