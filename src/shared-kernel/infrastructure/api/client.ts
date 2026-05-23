// Description: Provides the shared Axios API client for all bounded contexts.
import axios, { AxiosHeaders, type AxiosRequestHeaders } from 'axios';
import {
  ApiBridgeError,
  assertApiSuccess,
} from '../../application/api/apiResponse';
import { apiConfig } from '../config/env';
import { sessionStorage } from '../storage/sessionStorage';

export const BASE_URL = apiConfig.apiBaseUrl;

const API_PREFIX_PATTERN = /^\/api(?=\/|$)/;

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

function serializeApiValue(value: unknown) {
  if (Array.isArray(value) || typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function appendFormDataValue(formData: FormData, key: string, value: unknown) {
  if (value === undefined || value === null) {
    return;
  }

  formData.append(key, serializeApiValue(value));
}

function toUrlEncodedApiPayload(data: unknown) {
  const params = new URLSearchParams();

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, serializeApiValue(value));
      }
    });
  }

  params.append('server_key', apiConfig.serverKey);

  return params.toString();
}

function injectServerKey(data: unknown, headers: AxiosRequestHeaders) {
  if (isFormData(data)) {
    data.append('server_key', apiConfig.serverKey);
    return data;
  }

  const requestHeaders = AxiosHeaders.from(headers);
  requestHeaders.set('Content-Type', 'application/x-www-form-urlencoded');

  return {
    data: toUrlEncodedApiPayload(data),
    headers: requestHeaders,
  };
}

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: apiConfig.requestTimeoutMs,
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

    if (data && typeof data === 'object') {
      assertApiSuccess(data);
    }

    return response;
  },
  error => {
    if (axios.isAxiosError(error) && !error.response) {
      const url = [error.config?.baseURL, error.config?.url]
        .filter(Boolean)
        .join('');
      throw new ApiBridgeError(`${error.message}: ${url}`, error.code);
    }

    throw error;
  },
);

export default apiClient;
export {
  ApiBridgeError,
  BackendApiError,
} from '../../application/api/apiResponse';
