// Description: Normalizes WoWonder API envelopes for the shared React Native API bridge.
import type {
  ApiEnvelope,
  ApiErrorBody,
  ApiStatus,
} from '../../domain/types/api.types';

const SUCCESS_STATUSES = new Set(['200', '220']);

export class ApiBridgeError extends Error {
  constructor(
    message: string,
    readonly apiStatus?: string,
    readonly errorId?: string,
  ) {
    super(message);
    this.name = 'ApiBridgeError';
  }
}

export function normalizeApiStatus(status: ApiStatus | undefined) {
  return status === undefined || status === null ? undefined : String(status);
}

export function isApiSuccessStatus(status: ApiStatus | undefined) {
  const normalized = normalizeApiStatus(status);
  return normalized ? SUCCESS_STATUSES.has(normalized) : true;
}

/**
 * Some WoWonder hosts print PHP warnings before the JSON envelope. Axios
 * cannot auto-parse that response, so consumers receive a string even
 * though a valid API response exists at the end of it.
 */
export function normalizeApiResponseData(data: unknown): unknown {
  if (typeof data !== 'string') {
    return data;
  }

  const trimmed = data.trim();
  const jsonStart = trimmed.indexOf('{');
  const jsonEnd = trimmed.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd < jsonStart) {
    return data;
  }

  try {
    return JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as unknown;
  } catch {
    return data;
  }
}

function getErrorId(errors: ApiErrorBody | undefined) {
  if (!errors?.error_id) {
    return undefined;
  }

  return String(errors.error_id);
}

export function getApiErrorMessage(envelope: ApiEnvelope) {
  return (
    envelope.errors?.error_text ??
    envelope.errors?.message ??
    envelope.message ??
    JSON.stringify(envelope.errors ?? envelope)
  );
}

export function assertApiSuccess<TEnvelope extends ApiEnvelope>(
  envelope: TEnvelope,
) {
  if (!isApiSuccessStatus(envelope.api_status)) {
    throw new ApiBridgeError(
      getApiErrorMessage(envelope),
      normalizeApiStatus(envelope.api_status),
      getErrorId(envelope.errors),
    );
  }

  return envelope;
}

export { ApiBridgeError as BackendApiError };
