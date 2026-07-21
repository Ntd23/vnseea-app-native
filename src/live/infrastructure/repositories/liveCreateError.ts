export type LiveCreateErrorCode =
  | 'live_video_disabled'
  | 'live_permission_disabled'
  | 'livekit_not_ready'
  | 'live_already_running'
  | 'live_post_insert_failed'
  | 'live_post_finalize_failed';

type LiveCreateResponseRecord = Record<string, unknown>;

const LIVE_CREATE_ERROR_CODES = new Set<LiveCreateErrorCode>([
  'live_video_disabled',
  'live_permission_disabled',
  'livekit_not_ready',
  'live_already_running',
  'live_post_insert_failed',
  'live_post_finalize_failed',
]);

function readStatus(value: unknown) {
  const status = Number(value);
  return Number.isFinite(status) ? status : 0;
}

function readErrorCode(value: unknown): LiveCreateErrorCode | undefined {
  return typeof value === 'string' &&
    LIVE_CREATE_ERROR_CODES.has(value as LiveCreateErrorCode)
    ? (value as LiveCreateErrorCode)
    : undefined;
}

export class LiveCreateError extends Error {
  readonly status: number;
  readonly code?: LiveCreateErrorCode;
  readonly blockedReason?: string;
  readonly retryable: boolean;

  constructor(response: LiveCreateResponseRecord) {
    const code = readErrorCode(response.error_code);
    const backendMessage =
      typeof response.message === 'string' ? response.message : '';
    super(backendMessage || code || 'live_create_failed');
    this.name = 'LiveCreateError';
    this.status = readStatus(response.status);
    this.code = code;
    this.blockedReason =
      typeof response.blocked_reason === 'string'
        ? response.blocked_reason
        : undefined;
    this.retryable =
      response.retryable === true ||
      response.retryable === 1 ||
      response.retryable === '1';
  }
}

export function assertLiveCreateSucceeded(response: LiveCreateResponseRecord) {
  const status = readStatus(response.status);
  const errorCode = readErrorCode(response.error_code);
  if (errorCode || (status > 0 && (status < 200 || status >= 300))) {
    throw new LiveCreateError(response);
  }
}

export function getLiveCreateErrorMessage(error: unknown) {
  if (!(error instanceof LiveCreateError)) {
    return 'Không thể bắt đầu live. Vui lòng thử lại.';
  }

  switch (error.code) {
    case 'live_video_disabled':
    case 'live_permission_disabled':
      return 'Tính năng phát trực tiếp hiện chưa khả dụng.';
    case 'livekit_not_ready':
      return 'Máy chủ phát trực tiếp chưa sẵn sàng. Vui lòng thử lại sau.';
    case 'live_already_running':
      return 'Bạn đang có một phiên live đang hoạt động.';
    case 'live_post_insert_failed':
    case 'live_post_finalize_failed':
    default:
      return 'Không thể tạo phiên live. Vui lòng thử lại.';
  }
}
