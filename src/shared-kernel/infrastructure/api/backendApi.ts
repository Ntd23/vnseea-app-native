// Description: Provides typed helper methods for backend GET, POST, and multipart requests.
import type { AxiosRequestConfig } from 'axios';
import apiClient from './client';
import { apiConfig } from '../config/env';
import { sessionStorage } from '../storage/sessionStorage';

export type BackendPayload = Record<string, unknown>;

export type BackendFile = {
  uri: string;
  name: string;
  type: string;
};

export type MultipartPayload = BackendPayload &
  Record<string, BackendFile | unknown>;

export const backendApi = {
  async get<TResponse>(url: string, params?: BackendPayload) {
    const response = await apiClient.get<TResponse>(url, { params });
    return response.data;
  },

  async post<TResponse>(
    url: string,
    data?: BackendPayload,
    config?: AxiosRequestConfig,
  ) {
    const response = await apiClient.post<TResponse>(url, data, config);
    return response.data;
  },

  async multipart<TResponse>(
    url: string,
    data: MultipartPayload,
    config?: AxiosRequestConfig,
  ) {
    const formData = new FormData();

    console.log('[backendApi] multipart - building FormData');
    console.log('[backendApi] Original data keys:', Object.keys(data));

    // CRITICAL: Add server_key AND access_token to FormData for WoWonder API validation
    // For some endpoints (like create-story), server_key must be in the body, not just params
    formData.append('server_key', apiConfig.serverKey);

    // Also add access_token if available (for authenticated endpoints)
    const accessToken = sessionStorage.getAccessToken();
    if (accessToken) {
      formData.append('access_token', accessToken);
    }

    Object.entries(data).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      // Arrays: handle file objects and regular values
      if (Array.isArray(value)) {
        value.forEach(item => {
          if (item === undefined || item === null) return;
          if (typeof item === 'object' && item !== null && 'uri' in item) {
            // File object { uri, name, type }
            const fileObj = item as BackendFile;
            formData.append(`${key}[]`, {
              uri: fileObj.uri,
              name: fileObj.name || `file_${Date.now()}.jpg`,
              type: fileObj.type || 'image/jpeg',
            } as unknown as Blob);
          } else {
            formData.append(`${key}[]`, String(item));
          }
        });
        return;
      }

      // Single values - check if it's a file object before appending
      if (typeof value === 'object' && value !== null && 'uri' in value) {
        // File object (not in array)
        const fileObj = value as BackendFile;
        formData.append(key, {
          uri: fileObj.uri,
          name: fileObj.name || `file_${Date.now()}.jpg`,
          type: fileObj.type || 'image/jpeg',
        } as unknown as Blob);
      } else {
        formData.append(key, value as string | Blob);
      }
    });

    console.log('[backendApi] FormData built, sending request to:', url);

    // ⚠ axios 1.x + React Native + FormData has a known compatibility issue:
    //   - axios tries to JSON.stringify or run Node's form-data lib, which
    //     fails on RN's native FormData, returning an instant Network Error.
    //   - Fix: force Content-Type to 'multipart/form-data' (no boundary —
    //     RN's XMLHttpRequest fills it in) and bypass axios's transformRequest
    //     so it does NOT touch the FormData object.
    // We also raise the timeout to 5 minutes — video uploads can take a while.
    const response = await apiClient.post<TResponse>(url, formData, {
      timeout: 5 * 60 * 1000,
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(config?.headers ?? {}),
      },
      transformRequest: (body) => body,
    });
    return response.data;
  },
};
