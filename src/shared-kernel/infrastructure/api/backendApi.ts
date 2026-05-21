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

      formData.append(key, value as string | Blob);
    });

    const response = await apiClient.post<TResponse>(url, formData, config);
    return response.data;
  },
};
