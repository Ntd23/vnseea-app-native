// Description: Provides the shared Axios API client for all bounded contexts.
import axios, { AxiosHeaders, type AxiosRequestHeaders } from 'axios';
import type { ApiEnvelope } from '../../domain/types/api.types';
import {
  ApiBridgeError,
  assertApiSuccess,
  normalizeApiResponseData,
} from '../../application/api/apiResponse';
import { apiConfig } from '../config/env';
import { sessionStorage } from '../storage/sessionStorage';
import { getClientEndpointIdentity } from '../livekit/clientEndpointIdentity';

export const BASE_URL = apiConfig.apiBaseUrl;

// NOTE: The WoWonder backend routes everything through api-v2.php using .htaccess RewriteRule.
// The axios baseURL already includes /api, so we do NOT strip it here.
// Previously normalizeEndpointUrl stripped /api prefix, which broke WoWonder routing.

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

function serializeApiValue(value: unknown) {
  if (Array.isArray(value) || typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
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
  const accessToken = sessionStorage.getAccessToken();
  const clientEndpointId = getClientEndpointIdentity();
  const requestHeaders = AxiosHeaders.from(config.headers);
  requestHeaders.set('X-VNSEEA-Endpoint-ID', clientEndpointId);
  config.headers = requestHeaders;

  if (accessToken) {
    config.params = { ...config.params, access_token: accessToken };
  }

  // Always add server_key to params
  config.params = {
    ...config.params,
    server_key: apiConfig.serverKey,
    client_endpoint_id: clientEndpointId,
  };

  return config;
});

// Separate interceptor for request body formatting (runs after the first one)
apiClient.interceptors.request.use(config => {
  // For non-GET requests, format body with URL-encoded data
  // BUT: Skip for FormData (multipart) - those need to stay as FormData
  if (config.method?.toLowerCase() !== 'get' && !isFormData(config.data)) {
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
    const data = normalizeApiResponseData(response.data);
    response.data = data;

    if (data && typeof data === 'object') {
      assertApiSuccess(data as ApiEnvelope);
    }

    return response;
  },
  error => {
    if (axios.isAxiosError(error) && !error.response) {
      const baseUrl = String(error.config?.baseURL ?? '').replace(/\/+$/, '');
      const endpoint = String(error.config?.url ?? '').replace(/^\/+/, '');
      const url = [baseUrl, endpoint].filter(Boolean).join('/');
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
