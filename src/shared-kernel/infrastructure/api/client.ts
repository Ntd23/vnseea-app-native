// Description: Provides the shared Axios backend API client for all bounded contexts.
import axios from 'axios';
import { backendConfig } from '../config/env';
import { sessionStorage } from '../storage/sessionStorage';

export const BASE_URL = backendConfig.apiBaseUrl;

const API_PREFIX_PATTERN = /^\/api(?=\/|$)/;
const SUCCESS_STATUSES = new Set(['200', '220']);

export class BackendApiError extends Error {
  constructor(
    message: string,
    readonly apiStatus?: string,
    readonly errorId?: string,
  ) {
    super(message);
    this.name = 'BackendApiError';
  }
}

function normalizeEndpointUrl(url: string | undefined) {
  if (!url || /^https?:\/\//i.test(url)) {
    return url;
  }

  const normalized = url.replace(API_PREFIX_PATTERN, '');
  return normalized || '/';
}

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

function appendFormDataValue(formData: FormData, key: string, value: unknown) {
  if (value === undefined || value === null) {
    return;
  }

  if (Array.isArray(value) || typeof value === 'object') {
    formData.append(key, JSON.stringify(value));
    return;
  }

  formData.append(key, String(value));
}

function toBackendFormData(data: unknown) {
  if (isFormData(data)) {
    return data;
  }

  const formData = new FormData();

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    Object.entries(data).forEach(([key, value]) => {
      appendFormDataValue(formData, key, value);
    });
  }

  return formData;
}

function injectServerKey(data: unknown) {
  const formData = toBackendFormData(data);
  formData.append('server_key', backendConfig.serverKey);
  return formData;
}

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: backendConfig.requestTimeoutMs,
});

apiClient.interceptors.request.use(config => {
  config.url = normalizeEndpointUrl(config.url);

  const accessToken = sessionStorage.getAccessToken();

  if (accessToken) {
    config.params = { ...config.params, access_token: accessToken };
  }

  if (config.method?.toLowerCase() !== 'get') {
    config.data = injectServerKey(config.data);
  }

  return config;
});

apiClient.interceptors.response.use(response => {
  const { data } = response;

  if (data?.api_status && !SUCCESS_STATUSES.has(String(data.api_status))) {
    const message =
      data?.errors?.error_text ??
      data?.errors?.message ??
      data?.message ??
      JSON.stringify(data?.errors ?? data);

    throw new BackendApiError(
      message,
      String(data.api_status),
      data?.errors?.error_id ? String(data.errors.error_id) : undefined,
    );
  }

  return response;
});

export default apiClient;
