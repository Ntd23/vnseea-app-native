// Description: Provides the shared Axios backend API client for all bounded contexts.
import axios, { AxiosHeaders, type AxiosRequestHeaders } from 'axios';
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

function serializeBackendValue(value: unknown) {
  if (Array.isArray(value) || typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function appendFormDataValue(formData: FormData, key: string, value: unknown) {
  if (value === undefined || value === null) {
    return;
  }

  formData.append(key, serializeBackendValue(value));
}

function toUrlEncodedBackendPayload(data: unknown) {
  const params = new URLSearchParams();

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, serializeBackendValue(value));
      }
    });
  }

  params.append('server_key', backendConfig.serverKey);

  return params.toString();
}

function injectServerKey(data: unknown, headers: AxiosRequestHeaders) {
  if (isFormData(data)) {
    data.append('server_key', backendConfig.serverKey);
    return data;
  }

  const requestHeaders = AxiosHeaders.from(headers);
  requestHeaders.set('Content-Type', 'application/x-www-form-urlencoded');

  return {
    data: toUrlEncodedBackendPayload(data),
    headers: requestHeaders,
  };
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
    const payload = injectServerKey(config.data, config.headers);

    if (
      payload &&
      typeof payload === 'object' &&
      'data' in payload &&
      'headers' in payload
    ) {
      config.data = payload.data;
      config.headers = payload.headers;
    } else {
      config.data = payload;
    }
  }

  return config;
});

apiClient.interceptors.response.use(
  response => {
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
  },
  error => {
    if (axios.isAxiosError(error) && !error.response) {
      const url = [error.config?.baseURL, error.config?.url]
        .filter(Boolean)
        .join('');
      throw new BackendApiError(`${error.message}: ${url}`, error.code);
    }

    throw error;
  },
);

export default apiClient;
