type RetryTimer = ReturnType<typeof setTimeout>;

export interface FeedLoadMoreDemandController {
  latch: (isAllLoaded: boolean) => void;
  isPending: () => boolean;
  isConsumed: () => boolean;
  isRequestInFlight: () => boolean;
  hasScheduledRetry: () => boolean;
  resetGesture: () => void;
  resetGeneration: () => void;
  beginRequest: () => number | null;
  completeRequest: (requestToken: number) => boolean;
  retryRequest: (requestToken: number, countFailure?: boolean) => boolean;
  discardRequest: (requestToken: number) => boolean;
  getRetryDelay: (baseDelayMs: number, maxDelayMs: number) => number;
  leaveTail: () => boolean;
  clearIfTerminal: (isAllLoaded: boolean) => boolean;
  scheduleRetry: (delayMs: number, retry: () => void) => boolean;
  clearRetry: () => void;
  suspend: () => void;
  dispose: () => void;
}

export function createFeedLoadMoreDemandController(): FeedLoadMoreDemandController {
  let pending = false;
  let consumed = false;
  let requestSequence = 0;
  let activeRequestToken: number | null = null;
  let retryFailureCount = 0;
  let retryTimer: RetryTimer | null = null;

  const clearRetry = () => {
    if (!retryTimer) return;
    clearTimeout(retryTimer);
    retryTimer = null;
  };

  const resetGeneration = () => {
    pending = false;
    consumed = false;
    activeRequestToken = null;
    retryFailureCount = 0;
    clearRetry();
  };

  const settleRequest = (
    requestToken: number,
    nextState: 'complete' | 'retry' | 'discard',
    countFailure = true,
  ) => {
    if (activeRequestToken !== requestToken) return false;
    activeRequestToken = null;
    pending = nextState === 'retry';
    consumed = nextState === 'complete';
    if (nextState === 'retry') {
      if (countFailure) retryFailureCount += 1;
    } else {
      retryFailureCount = 0;
    }
    clearRetry();
    return true;
  };

  return {
    latch(isAllLoaded) {
      if (!isAllLoaded && !consumed) pending = true;
    },
    isPending: () => pending,
    isConsumed: () => consumed,
    isRequestInFlight: () => activeRequestToken !== null,
    hasScheduledRetry: () => retryTimer !== null,
    resetGesture() {
      consumed = false;
      retryFailureCount = 0;
    },
    resetGeneration,
    beginRequest() {
      if (!pending || consumed || activeRequestToken !== null) return null;
      clearRetry();
      requestSequence += 1;
      activeRequestToken = requestSequence;
      return activeRequestToken;
    },
    completeRequest: requestToken => settleRequest(requestToken, 'complete'),
    retryRequest: (requestToken, countFailure = true) =>
      settleRequest(requestToken, 'retry', countFailure),
    discardRequest: requestToken => settleRequest(requestToken, 'discard'),
    getRetryDelay(baseDelayMs, maxDelayMs) {
      const normalizedBaseDelayMs = Math.max(16, baseDelayMs);
      const normalizedMaxDelayMs = Math.max(
        normalizedBaseDelayMs,
        maxDelayMs,
      );
      const exponent = Math.max(0, retryFailureCount - 1);
      return Math.min(
        normalizedMaxDelayMs,
        normalizedBaseDelayMs * 2 ** exponent,
      );
    },
    leaveTail() {
      clearRetry();
      if (activeRequestToken !== null) return false;
      pending = false;
      retryFailureCount = 0;
      return true;
    },
    clearIfTerminal(isAllLoaded) {
      if (!isAllLoaded && !consumed) return false;
      pending = false;
      if (isAllLoaded) {
        activeRequestToken = null;
        retryFailureCount = 0;
      }
      clearRetry();
      return true;
    },
    scheduleRetry(delayMs, retry) {
      if (retryTimer || !pending || activeRequestToken !== null) return false;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        if (pending) retry();
      }, Math.max(16, delayMs));
      return true;
    },
    clearRetry,
    suspend() {
      consumed = false;
      clearRetry();
    },
    dispose: resetGeneration,
  };
}
