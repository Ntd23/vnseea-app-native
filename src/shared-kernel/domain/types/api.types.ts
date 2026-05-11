// Shared API response types

export interface ApiSuccessResponse<T = unknown> {
  api_status: 200;
  data?: T;
}

export interface ApiErrorResponse {
  api_status: '400' | 400;
  errors: { error_id: string; error_text: string };
}
