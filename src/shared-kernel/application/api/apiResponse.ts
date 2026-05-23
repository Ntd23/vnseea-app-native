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
