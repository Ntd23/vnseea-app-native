// Description: Provides typed helper methods for backend GET, POST, and multipart requests.
import type { AxiosRequestConfig } from 'axios';
import apiClient from './client';

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

    Object.entries(data).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      // Array values → append each item under `key[]` so PHP receives
      // them as `$_FILES[key]['name'][i]` (multi-file uploads like
      // WoWonder's `postPhotos[]` album endpoint). Existing callers that
      // pass single files/strings are untouched.
      if (Array.isArray(value)) {
        value.forEach(item => {
          if (item === undefined || item === null) return;
          formData.append(`${key}[]`, item as string | Blob);
        });
        return;
      }

      formData.append(key, value as string | Blob);
    });

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
