// Description: Provides the shared Axios API client for all bounded contexts.
import axios, { AxiosHeaders, type AxiosRequestHeaders } from 'axios';
import {
  ApiBridgeError,
  assertApiSuccess,
} from '../../application/api/apiResponse';
import { apiConfig } from '../config/env';
import { sessionStorage } from '../storage/sessionStorage';

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
  const accessToken = sessionStorage.getAccessToken();

  if (accessToken) {
    config.params = { ...config.params, access_token: accessToken };
  }

  // Always add server_key to params
  config.params = {
    ...config.params,
    server_key: apiConfig.serverKey,
  };

  // DEBUG: Log the full URL that will be sent
  const url = config.url || '';
  const fullUrl = `${config.baseURL}/${url}`.replace(/\/+/g, '/');
  const queryString = new URLSearchParams(config.params as Record<string, string>).toString();
  console.log('[apiClient] Full URL:', fullUrl + (queryString ? '?' + queryString : ''));
  console.log('[apiClient] Request method:', config.method?.toUpperCase());
  console.log('[apiClient] access_token in params:', accessToken ? 'YES (len=' + accessToken.length + ')' : 'NO');
  console.log('[apiClient] server_key in params:', apiConfig.serverKey ? 'YES (len=' + apiConfig.serverKey.length + ')' : 'NO');

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
    console.log('[apiClient] POST body after transform:', config.data);
    console.log('[apiClient] Body contains id?', config.data?.includes('id='));
    console.log('[apiClient] Body contains reaction?', config.data?.includes('reaction='));
  } else if (isFormData(config.data)) {
    console.log('[apiClient] FormData detected - preserving multipart format');
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
