// Description: Defines shared API bridge response and payload types.

export type ApiStatus = number | string;

export type RawApiRecord = Record<string, unknown>;

export type ApiPayload = Record<string, unknown>;

export type ApiFile = {
  uri: string;
  name: string;
  type: string;
};

export type MultipartApiPayload = ApiPayload &
  Record<string, ApiFile | unknown>;

export type ApiErrorBody = {
  error_id?: number | string;
  error_text?: string;
  message?: string;
};

export type ApiEnvelope<TData = unknown> = RawApiRecord & {
  api_status?: ApiStatus;
  data?: TData;
  errors?: ApiErrorBody;
  message?: string;
};

export interface ApiSuccessResponse<TData = unknown>
  extends ApiEnvelope<TData> {
  api_status: 200 | 220 | '200' | '220';
}

export interface ApiErrorResponse {
  api_status: ApiStatus;
  errors?: ApiErrorBody;
  message?: string;
}
