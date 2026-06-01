// Description: Provides typed API bridge helpers for GET, POST, and multipart requests.
import type { AxiosRequestConfig } from 'axios';
import type {
  ApiFile,
  ApiPayload,
  MultipartApiPayload,
} from '../../domain/types/api.types';
import apiClient from './client';
import { apiConfig } from '../config/env';
import { sessionStorage } from '../storage/sessionStorage';

export type { ApiFile, ApiPayload, MultipartApiPayload };

export const apiBridge = {
  async get<TResponse>(url: string, params?: ApiPayload) {
    const response = await apiClient.get<TResponse>(url, { params });
    return response.data;
  },

  async post<TResponse>(
    url: string,
    data?: ApiPayload,
    config?: AxiosRequestConfig,
  ) {
    const response = await apiClient.post<TResponse>(url, data, config);
    return response.data;
  },

  async multipart<TResponse>(
    url: string,
    data: MultipartApiPayload,
    config?: AxiosRequestConfig,
  ) {
    const formData = new FormData();

    // Add server_key to FormData for WoWonder API validation
    formData.append('server_key', apiConfig.serverKey);

    // access_token will be added as URL param below

    Object.entries(data).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      // Arrays: append each item under `key[]` for PHP's $_FILES handling
      if (Array.isArray(value)) {
        value.forEach(item => {
          if (item === undefined || item === null) return;

          if (typeof item === 'object' && item !== null && 'uri' in item) {
            // File objects from react-native-image-picker: { uri, name, type }
            // Pass directly to FormData - RN's XMLHttpRequest handles native files
            const fileObj = item as { uri: string; name?: string; type?: string };
            formData.append(`${key}[]`, {
              uri: fileObj.uri,
              name: fileObj.name || `file_${Date.now()}.jpg`,
              type: fileObj.type || 'image/jpeg',
            } as unknown as Blob);
          } else {
            formData.append(`${key}[]`, String(item));
          }
        });
      } else if (typeof value === 'object' && value !== null && 'uri' in value) {
        // Single file object
        const fileObj = value as { uri: string; name?: string; type?: string };
        formData.append(key, {
          uri: fileObj.uri,
          name: fileObj.name || `file_${Date.now()}.jpg`,
          type: fileObj.type || 'image/jpeg',
        } as unknown as Blob);
      } else {
        formData.append(key, value as string | Blob);
      }
    });

    // ⚠ axios 1.x + React Native + FormData compatibility fix:
    //   axios tries to JSON.stringify or run Node's form-data lib, which
    //     fails on RN's native FormData, returning an instant Network Error.
    //   Fix: bypass transformRequest so it does NOT touch the FormData object.

    // Build params: access_token and server_key go as URL params for WoWonder API
    const accessToken = sessionStorage.getAccessToken();
    const params: Record<string, string> = {
      server_key: apiConfig.serverKey,
    };
    if (accessToken) {
      params.access_token = accessToken;
    }

    const response = await apiClient.post<TResponse>(url, formData, {
      timeout: 5 * 60 * 1000, // 5 minutes for video/image uploads
      ...config,
      params: { ...params, ...config?.params },
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(config?.headers ?? {}),
      },
      transformRequest: (body) => body,
    });
    return response.data;
  },
};
