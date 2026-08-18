export type ClientUiPerformanceSurface = 'feed' | 'profile';
export type ClientUiMediaKind = 'image' | 'video';

export type ClientUiPerformanceConfiguration = {
  enabled?: boolean;
  frameBudgetMs?: number;
  optimizationMode?: 'baseline' | 'optimized';
};

type SurfaceMetrics = {
  renderCounts: Map<string, number>;
  visiblePostIds: Set<string>;
  frameSampleCount: number;
  frameDurationTotalMs: number;
  droppedFrameCount: number;
  longFrameOver50MsCount: number;
  longTaskOver50MsCount: number;
  longTaskDurationTotalMs: number;
  longTaskMaxDurationMs: number;
  longTaskDurationsMs: number[];
  maxFrameIntervalMs: number;
  imageLoadCount: number;
  videoLoadCount: number;
  offscreenImageLoadCount: number;
  offscreenVideoLoadCount: number;
};

type ActiveScrollMeasurement = {
  active: boolean;
  lastFrameAtMs: number | null;
};

export type ClientUiSurfacePerformanceSnapshot = {
  uniqueVisiblePostCount: number;
  postItemRenderCount: number;
  postItemRerenderCount: number;
  averageRendersPerPost: number;
  maxRendersPerPost: number;
  renderCounts: Record<string, number>;
  frameSampleCount: number;
  estimatedFps: number;
  droppedFrameCount: number;
  longFrameOver50MsCount: number;
  longTaskOver50MsCount: number;
  longTaskDurationTotalMs: number;
  longTaskAverageDurationMs: number;
  longTaskMaxDurationMs: number;
  longTaskP95DurationMs: number;
  maxFrameIntervalMs: number;
  imageLoadCount: number;
  videoLoadCount: number;
  offscreenImageLoadCount: number;
  offscreenVideoLoadCount: number;
};

export type ClientUiPerformanceSnapshot = {
  enabled: boolean;
  optimizationMode: 'baseline' | 'optimized';
  frameBudgetMs: number;
  surfaces: Record<
    ClientUiPerformanceSurface,
    ClientUiSurfacePerformanceSnapshot
  >;
  profileOpen: {
    sampleCount: number;
    lastMs: number | null;
    averageMs: number;
    maxMs: number;
    samplesMs: number[];
  };
};

type ClientUiPerformanceDebugApi = {
  configure: typeof configureClientUiPerformanceMetrics;
  reset: typeof resetClientUiPerformanceMetrics;
  snapshot: typeof getClientUiPerformanceSnapshot;
};

declare global {
  // Exposed only in development so repeatable device measurements can be
  // collected through the React Native inspector without changing the UI.
  var __VNSEEA_PERF__: ClientUiPerformanceDebugApi | undefined;
}

const SURFACES: ClientUiPerformanceSurface[] = ['feed', 'profile'];
const DEFAULT_FRAME_BUDGET_MS = 1000 / 60;
const LONG_TASK_THRESHOLD_MS = 50;
const MAX_TRACKED_RENDER_ROWS = 500;
const MAX_TRACKED_VISIBLE_ROWS = 1_000;
const MAX_PROFILE_OPEN_SAMPLES = 20;
const MAX_LONG_TASK_SAMPLES = 200;

let enabled = typeof __DEV__ !== 'undefined' && __DEV__;
let optimizationMode: 'baseline' | 'optimized' = 'optimized';
let frameBudgetMs = DEFAULT_FRAME_BUDGET_MS;
let animationFrameHandle: number | null = null;
let activeSurface: ClientUiPerformanceSurface | null = null;
let metricsResetAtMs = 0;

const profileOpenStartedAtByUserId = new Map<string, number>();
const profileOpenSamplesMs: number[] = [];

function createSurfaceMetrics(): SurfaceMetrics {
  return {
    renderCounts: new Map(),
    visiblePostIds: new Set(),
    frameSampleCount: 0,
    frameDurationTotalMs: 0,
    droppedFrameCount: 0,
    longFrameOver50MsCount: 0,
    longTaskOver50MsCount: 0,
    longTaskDurationTotalMs: 0,
    longTaskMaxDurationMs: 0,
    longTaskDurationsMs: [],
    maxFrameIntervalMs: 0,
    imageLoadCount: 0,
    videoLoadCount: 0,
    offscreenImageLoadCount: 0,
    offscreenVideoLoadCount: 0,
  };
}

const metricsBySurface: Record<ClientUiPerformanceSurface, SurfaceMetrics> = {
  feed: createSurfaceMetrics(),
  profile: createSurfaceMetrics(),
};

const activeScrollBySurface: Record<
  ClientUiPerformanceSurface,
  ActiveScrollMeasurement
> = {
  feed: { active: false, lastFrameAtMs: null },
  profile: { active: false, lastFrameAtMs: null },
};

function nowMs() {
  const performanceApi = (
    globalThis as typeof globalThis & {
      performance?: { now?: () => number };
    }
  ).performance;
  return typeof performanceApi?.now === 'function'
    ? performanceApi.now()
    : Date.now();
}

function rememberBoundedMapValue(
  values: Map<string, number>,
  key: string,
  nextValue: number,
) {
  if (!values.has(key) && values.size >= MAX_TRACKED_RENDER_ROWS) {
    const oldestKey = values.keys().next().value as string | undefined;
    if (oldestKey) values.delete(oldestKey);
  }
  values.set(key, nextValue);
}

function rememberVisiblePostId(values: Set<string>, postId: string) {
  if (values.has(postId)) return;
  if (values.size >= MAX_TRACKED_VISIBLE_ROWS) {
    const oldestId = values.values().next().value as string | undefined;
    if (oldestId) values.delete(oldestId);
  }
  values.add(postId);
}

function hasActiveScrollMeasurement() {
  return SURFACES.some(surface => activeScrollBySurface[surface].active);
}

function scheduleAnimationFrameMeasurement() {
  if (
    animationFrameHandle !== null ||
    !enabled ||
    !hasActiveScrollMeasurement() ||
    typeof requestAnimationFrame !== 'function'
  ) {
    return;
  }

  animationFrameHandle = requestAnimationFrame(timestampMs => {
    animationFrameHandle = null;

    for (const surface of SURFACES) {
      const scroll = activeScrollBySurface[surface];
      if (!scroll.active) continue;

      if (scroll.lastFrameAtMs !== null) {
        recordClientFrameInterval(
          surface,
          Math.max(0, timestampMs - scroll.lastFrameAtMs),
        );
      }
      scroll.lastFrameAtMs = timestampMs;
    }

    scheduleAnimationFrameMeasurement();
  });
}

function snapshotSurface(
  metrics: SurfaceMetrics,
): ClientUiSurfacePerformanceSnapshot {
  const renderCounts = Object.fromEntries(metrics.renderCounts.entries());
  const renderValues = Array.from(metrics.renderCounts.values());
  const postItemRenderCount = renderValues.reduce(
    (total, count) => total + count,
    0,
  );
  const trackedPostCount = renderValues.length;
  const sortedLongTaskDurations = [...metrics.longTaskDurationsMs].sort(
    (left, right) => left - right,
  );
  const longTaskP95Index = Math.max(
    0,
    Math.ceil(sortedLongTaskDurations.length * 0.95) - 1,
  );

  return {
    uniqueVisiblePostCount: metrics.visiblePostIds.size,
    postItemRenderCount,
    postItemRerenderCount: Math.max(0, postItemRenderCount - trackedPostCount),
    averageRendersPerPost:
      trackedPostCount === 0 ? 0 : postItemRenderCount / trackedPostCount,
    maxRendersPerPost:
      renderValues.length === 0 ? 0 : Math.max(...renderValues),
    renderCounts,
    frameSampleCount: metrics.frameSampleCount,
    estimatedFps:
      metrics.frameDurationTotalMs <= 0
        ? 0
        : (metrics.frameSampleCount * 1000) / metrics.frameDurationTotalMs,
    droppedFrameCount: metrics.droppedFrameCount,
    longFrameOver50MsCount: metrics.longFrameOver50MsCount,
    longTaskOver50MsCount: metrics.longTaskOver50MsCount,
    longTaskDurationTotalMs: metrics.longTaskDurationTotalMs,
    longTaskAverageDurationMs:
      metrics.longTaskOver50MsCount === 0
        ? 0
        : metrics.longTaskDurationTotalMs / metrics.longTaskOver50MsCount,
    longTaskMaxDurationMs: metrics.longTaskMaxDurationMs,
    longTaskP95DurationMs:
      sortedLongTaskDurations.length === 0
        ? 0
        : sortedLongTaskDurations[longTaskP95Index],
    maxFrameIntervalMs: metrics.maxFrameIntervalMs,
    imageLoadCount: metrics.imageLoadCount,
    videoLoadCount: metrics.videoLoadCount,
    offscreenImageLoadCount: metrics.offscreenImageLoadCount,
    offscreenVideoLoadCount: metrics.offscreenVideoLoadCount,
  };
}

export function configureClientUiPerformanceMetrics(
  configuration: ClientUiPerformanceConfiguration,
) {
  if (typeof configuration.enabled === 'boolean') {
    enabled = configuration.enabled;
  }
  if (
    typeof configuration.frameBudgetMs === 'number' &&
    Number.isFinite(configuration.frameBudgetMs) &&
    configuration.frameBudgetMs > 0
  ) {
    frameBudgetMs = configuration.frameBudgetMs;
  }
  if (
    (configuration.optimizationMode === 'baseline' ||
      configuration.optimizationMode === 'optimized') &&
    typeof __DEV__ !== 'undefined' &&
    __DEV__
  ) {
    optimizationMode = configuration.optimizationMode;
  }

  if (!enabled && animationFrameHandle !== null) {
    cancelAnimationFrame(animationFrameHandle);
    animationFrameHandle = null;
  }
}

export function isClientUiOptimizationEnabled() {
  return typeof __DEV__ === 'undefined' || !__DEV__
    ? true
    : optimizationMode === 'optimized';
}

export function recordPostItemRender(
  surface: ClientUiPerformanceSurface,
  postId: string | number,
) {
  if (!enabled) return;
  const normalizedPostId = String(postId).trim();
  if (!normalizedPostId) return;

  const renderCounts = metricsBySurface[surface].renderCounts;
  rememberBoundedMapValue(
    renderCounts,
    normalizedPostId,
    (renderCounts.get(normalizedPostId) ?? 0) + 1,
  );
}

export function recordVisiblePostIds(
  surface: ClientUiPerformanceSurface,
  postIds: Iterable<string | number>,
) {
  if (!enabled) return;
  const visiblePostIds = metricsBySurface[surface].visiblePostIds;
  for (const postId of postIds) {
    const normalizedPostId = String(postId).trim();
    if (normalizedPostId) {
      rememberVisiblePostId(visiblePostIds, normalizedPostId);
    }
  }
}

export function recordClientFrameInterval(
  surface: ClientUiPerformanceSurface,
  intervalMs: number,
) {
  if (!enabled || !Number.isFinite(intervalMs) || intervalMs <= 0) return;

  const metrics = metricsBySurface[surface];
  metrics.frameSampleCount += 1;
  metrics.frameDurationTotalMs += intervalMs;
  metrics.maxFrameIntervalMs = Math.max(
    metrics.maxFrameIntervalMs,
    intervalMs,
  );
  metrics.droppedFrameCount += Math.max(
    0,
    Math.round(intervalMs / frameBudgetMs) - 1,
  );
  if (intervalMs > LONG_TASK_THRESHOLD_MS) {
    metrics.longFrameOver50MsCount += 1;
  }
}

export function recordClientLongTask(
  surface: ClientUiPerformanceSurface,
  durationMs: number,
) {
  if (
    !enabled ||
    !Number.isFinite(durationMs) ||
    durationMs < LONG_TASK_THRESHOLD_MS
  ) {
    return;
  }

  const metrics = metricsBySurface[surface];
  metrics.longTaskOver50MsCount += 1;
  metrics.longTaskDurationTotalMs += durationMs;
  metrics.longTaskMaxDurationMs = Math.max(
    metrics.longTaskMaxDurationMs,
    durationMs,
  );
  metrics.longTaskDurationsMs.push(durationMs);
  if (metrics.longTaskDurationsMs.length > MAX_LONG_TASK_SAMPLES) {
    metrics.longTaskDurationsMs.shift();
  }
}

export function beginClientScrollMeasurement(
  surface: ClientUiPerformanceSurface,
) {
  if (!enabled) return;
  const scroll = activeScrollBySurface[surface];
  if (scroll.active) return;

  scroll.active = true;
  scroll.lastFrameAtMs = null;
  scheduleAnimationFrameMeasurement();
}

export function endClientScrollMeasurement(
  surface: ClientUiPerformanceSurface,
) {
  const scroll = activeScrollBySurface[surface];
  scroll.active = false;
  scroll.lastFrameAtMs = null;

  if (
    !hasActiveScrollMeasurement() &&
    animationFrameHandle !== null &&
    typeof cancelAnimationFrame === 'function'
  ) {
    cancelAnimationFrame(animationFrameHandle);
    animationFrameHandle = null;
  }
}

export function recordClientMediaLoad(
  surface: ClientUiPerformanceSurface,
  kind: ClientUiMediaKind,
  isInViewport: boolean,
) {
  if (!enabled) return;
  const metrics = metricsBySurface[surface];

  if (kind === 'image') {
    metrics.imageLoadCount += 1;
    if (!isInViewport) metrics.offscreenImageLoadCount += 1;
    return;
  }

  metrics.videoLoadCount += 1;
  if (!isInViewport) metrics.offscreenVideoLoadCount += 1;
}

export function setClientUiPerformanceActiveSurface(
  surface: ClientUiPerformanceSurface | null,
) {
  activeSurface = surface;
}

export function clearClientUiPerformanceActiveSurface(
  surface: ClientUiPerformanceSurface,
) {
  if (activeSurface === surface) activeSurface = null;
}

export function getClientUiPerformanceActiveSurface() {
  return activeSurface;
}

export function recordActiveSurfaceMediaLoad(
  kind: ClientUiMediaKind,
  isInViewport: boolean,
) {
  if (!activeSurface) return;
  recordClientMediaLoad(activeSurface, kind, isInViewport);
}

export function startProfileOpenMeasurement(
  userId: string | number,
  timestampMs = nowMs(),
) {
  if (!enabled) return;
  const normalizedUserId = String(userId).trim();
  if (!normalizedUserId) return;
  profileOpenStartedAtByUserId.set(normalizedUserId, timestampMs);
}

export function finishProfileOpenMeasurement(
  userId: string | number,
  timestampMs = nowMs(),
) {
  if (!enabled) return;
  const normalizedUserId = String(userId).trim();
  const startedAtMs = profileOpenStartedAtByUserId.get(normalizedUserId);
  if (startedAtMs === undefined) return;

  profileOpenStartedAtByUserId.delete(normalizedUserId);
  profileOpenSamplesMs.push(Math.max(0, timestampMs - startedAtMs));
  if (profileOpenSamplesMs.length > MAX_PROFILE_OPEN_SAMPLES) {
    profileOpenSamplesMs.shift();
  }
}

export function getClientUiPerformanceSnapshot(): ClientUiPerformanceSnapshot {
  const profileOpenTotalMs = profileOpenSamplesMs.reduce(
    (total, sample) => total + sample,
    0,
  );

  return {
    enabled,
    optimizationMode,
    frameBudgetMs,
    surfaces: {
      feed: snapshotSurface(metricsBySurface.feed),
      profile: snapshotSurface(metricsBySurface.profile),
    },
    profileOpen: {
      sampleCount: profileOpenSamplesMs.length,
      lastMs: profileOpenSamplesMs.at(-1) ?? null,
      averageMs:
        profileOpenSamplesMs.length === 0
          ? 0
          : profileOpenTotalMs / profileOpenSamplesMs.length,
      maxMs:
        profileOpenSamplesMs.length === 0
          ? 0
          : Math.max(...profileOpenSamplesMs),
      samplesMs: [...profileOpenSamplesMs],
    },
  };
}

export function resetClientUiPerformanceMetrics() {
  for (const surface of SURFACES) {
    metricsBySurface[surface] = createSurfaceMetrics();
    activeScrollBySurface[surface].active = false;
    activeScrollBySurface[surface].lastFrameAtMs = null;
  }
  profileOpenStartedAtByUserId.clear();
  profileOpenSamplesMs.length = 0;
  metricsResetAtMs = nowMs();

  if (
    animationFrameHandle !== null &&
    typeof cancelAnimationFrame === 'function'
  ) {
    cancelAnimationFrame(animationFrameHandle);
    animationFrameHandle = null;
  }
}

type LongTaskPerformanceEntry = {
  duration: number;
  startTime: number;
};

type LongTaskPerformanceEntryList = {
  getEntries: () => LongTaskPerformanceEntry[];
};

type LongTaskPerformanceObserver = {
  observe: (options: { type: string; buffered?: boolean }) => void;
};

type LongTaskPerformanceObserverConstructor = new (
  callback: (entries: LongTaskPerformanceEntryList) => void,
) => LongTaskPerformanceObserver;

function installLongTaskObserver() {
  const PerformanceObserverConstructor = (
    globalThis as typeof globalThis & {
      PerformanceObserver?: LongTaskPerformanceObserverConstructor;
    }
  ).PerformanceObserver;
  if (!PerformanceObserverConstructor) return;

  try {
    const observer = new PerformanceObserverConstructor(entries => {
      for (const entry of entries.getEntries()) {
        const surface = activeSurface;
        if (
          surface &&
          entry.startTime >= metricsResetAtMs &&
          activeScrollBySurface[surface].active
        ) {
          recordClientLongTask(surface, entry.duration);
        }
      }
    });
    observer.observe({ type: 'longtask', buffered: true });
  } catch {
    // Older runtimes may expose PerformanceObserver without long-task support.
  }
}

if (typeof __DEV__ !== 'undefined' && __DEV__) {
  globalThis.__VNSEEA_PERF__ = {
    configure: configureClientUiPerformanceMetrics,
    reset: resetClientUiPerformanceMetrics,
    snapshot: getClientUiPerformanceSnapshot,
  };
  metricsResetAtMs = nowMs();
  installLongTaskObserver();
}
