export type FeedNetworkMode = 'normal' | 'constrained';

export type FeedPaginationPolicy = {
  mode: FeedNetworkMode;
  pageSize: number;
  revealBatchSize: number;
  bufferTarget: number;
};

const NORMAL_POLICY: FeedPaginationPolicy = {
  mode: 'normal',
  pageSize: 20,
  revealBatchSize: 10,
  bufferTarget: 20,
};

const CONSTRAINED_POLICY: FeedPaginationPolicy = {
  mode: 'constrained',
  pageSize: 10,
  // Keep one network page together. Splitting it into 5+5 caused two full
  // feed-list rebuilds and made a slow connection look like a short feed.
  revealBatchSize: 10,
  bufferTarget: 10,
};

const SLOW_REQUEST_MS = 1_800;
const FAST_REQUEST_MS = 800;
const CONSTRAINED_HOLD_MS = 20_000;
const FAST_SAMPLES_TO_RECOVER = 2;

export function createFeedNetworkPolicy() {
  let mode: FeedNetworkMode = 'normal';
  let constrainedUntil = 0;
  let fastRecoverySamples = 0;

  const enterConstrainedMode = (now: number) => {
    mode = 'constrained';
    constrainedUntil = Math.max(constrainedUntil, now + CONSTRAINED_HOLD_MS);
    fastRecoverySamples = 0;
  };

  return {
    getPolicy(): FeedPaginationPolicy {
      return mode === 'constrained' ? CONSTRAINED_POLICY : NORMAL_POLICY;
    },

    recordFailure(now = Date.now()) {
      enterConstrainedMode(now);
    },

    recordSuccess(durationMs: number, now = Date.now()) {
      if (!Number.isFinite(durationMs) || durationMs < 0) return;

      if (durationMs >= SLOW_REQUEST_MS) {
        enterConstrainedMode(now);
        return;
      }

      if (mode !== 'constrained' || now < constrainedUntil) return;

      if (durationMs <= FAST_REQUEST_MS) {
        fastRecoverySamples += 1;
        if (fastRecoverySamples >= FAST_SAMPLES_TO_RECOVER) {
          mode = 'normal';
          constrainedUntil = 0;
          fastRecoverySamples = 0;
        }
        return;
      }

      fastRecoverySamples = 0;
    },
  };
}
