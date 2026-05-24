// Description: Provides typed API bridge helpers for GET, POST, and multipart requests.
import type { AxiosRequestConfig } from 'axios';
import type {
  ApiFile,
  ApiPayload,
  MultipartApiPayload,
} from '../../domain/types/api.types';
import apiClient from './client';

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
