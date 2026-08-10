export interface VideoPlaybackPlayerDescriptor {
  playerId: string;
  surface: string;
  role: string;
}

export interface VideoPlaybackMetricGroupSnapshot {
  surface: string;
  role: string;
  mountedPlayers: number;
  peakMountedPlayers: number;
  loadStartCount: number;
  firstFrameCount: number;
  ttffCount: number;
  ttffTotalMs: number;
  ttffAverageMs: number;
  ttffMaxMs: number;
  ttffLastMs: number | null;
  bufferCount: number;
  bufferDurationMs: number;
  bufferMaxDurationMs: number;
  errorCount: number;
}

export interface VideoPlaybackPlayerSnapshot
  extends VideoPlaybackPlayerDescriptor {
  mounted: boolean;
  hasFirstFrame: boolean;
  isBuffering: boolean;
  errorCount: number;
}

export interface VideoPlaybackMetricsSnapshot {
  enabled: boolean;
  loggingEnabled: boolean;
  maxTrackedPlayers: number;
  trackedPlayerCount: number;
  evictedPlayerCount: number;
  groups: VideoPlaybackMetricGroupSnapshot[];
  players: VideoPlaybackPlayerSnapshot[];
}

export interface VideoPlaybackMetricsConfiguration {
  enabled?: boolean;
  loggingEnabled?: boolean;
  maxTrackedPlayers?: number;
}

interface GroupMetrics {
  surface: string;
  role: string;
  mountedPlayers: number;
  peakMountedPlayers: number;
  loadStartCount: number;
  firstFrameCount: number;
  ttffCount: number;
  ttffTotalMs: number;
  ttffMaxMs: number;
  ttffLastMs: number | null;
  bufferCount: number;
  bufferDurationMs: number;
  bufferMaxDurationMs: number;
  errorCount: number;
}

interface PlayerMetrics extends VideoPlaybackPlayerDescriptor {
  mounted: boolean;
  loadStartedAtMs: number | null;
  loadGroupKey: string | null;
  hasFirstFrame: boolean;
  isBuffering: boolean;
  bufferStartedAtMs: number | null;
  bufferGroupKey: string | null;
  errorCount: number;
}

const DEFAULT_MAX_TRACKED_PLAYERS = 64;

let enabled = typeof __DEV__ !== 'undefined' && __DEV__;
let loggingEnabled = false;
let maxTrackedPlayers = DEFAULT_MAX_TRACKED_PLAYERS;
let evictedPlayerCount = 0;

const groups = new Map<string, GroupMetrics>();
const players = new Map<string, PlayerMetrics>();

function nowMs(): number {
  return Date.now();
}

function normalizeTimestamp(timestampMs?: number): number {
  return typeof timestampMs === 'number' && Number.isFinite(timestampMs)
    ? timestampMs
    : nowMs();
}

function groupKey(surface: string, role: string): string {
  return `${surface}\u0000${role}`;
}

function getGroupByKey(key: string): GroupMetrics | undefined {
  return groups.get(key);
}

function getOrCreateGroup(surface: string, role: string): GroupMetrics {
  const key = groupKey(surface, role);
  const existing = groups.get(key);
  if (existing) return existing;

  const created: GroupMetrics = {
    surface,
    role,
    mountedPlayers: 0,
    peakMountedPlayers: 0,
    loadStartCount: 0,
    firstFrameCount: 0,
    ttffCount: 0,
    ttffTotalMs: 0,
    ttffMaxMs: 0,
    ttffLastMs: null,
    bufferCount: 0,
    bufferDurationMs: 0,
    bufferMaxDurationMs: 0,
    errorCount: 0,
  };
  groups.set(key, created);
  return created;
}

function logEvent(
  event: string,
  player: PlayerMetrics,
  details: Record<string, unknown> = {},
): void {
  if (
    !loggingEnabled ||
    typeof __DEV__ === 'undefined' ||
    !__DEV__
  ) {
    return;
  }

  console.debug('[video-playback-metrics]', event, {
    playerId: player.playerId,
    surface: player.surface,
    role: player.role,
    ...details,
  });
}

function incrementMounted(group: GroupMetrics): void {
  group.mountedPlayers += 1;
  group.peakMountedPlayers = Math.max(
    group.peakMountedPlayers,
    group.mountedPlayers,
  );
}

function decrementMounted(group: GroupMetrics | undefined): void {
  if (!group) return;
  group.mountedPlayers = Math.max(0, group.mountedPlayers - 1);
}

function closeOpenBuffer(player: PlayerMetrics, timestampMs: number): void {
  if (player.bufferStartedAtMs === null || player.bufferGroupKey === null) {
    player.isBuffering = false;
    return;
  }

  const durationMs = Math.max(0, timestampMs - player.bufferStartedAtMs);
  const group = getGroupByKey(player.bufferGroupKey);
  if (group) {
    group.bufferDurationMs += durationMs;
    group.bufferMaxDurationMs = Math.max(
      group.bufferMaxDurationMs,
      durationMs,
    );
  }

  player.isBuffering = false;
  player.bufferStartedAtMs = null;
  player.bufferGroupKey = null;
  logEvent('buffer-end', player, { durationMs, timestampMs });
}

function evictOldestPlayer(timestampMs: number): void {
  const oldestPlayerId = players.keys().next().value as string | undefined;
  if (!oldestPlayerId) return;

  const player = players.get(oldestPlayerId);
  if (!player) return;

  closeOpenBuffer(player, timestampMs);
  if (player.mounted) {
    decrementMounted(getOrCreateGroup(player.surface, player.role));
  }
  players.delete(oldestPlayerId);
  evictedPlayerCount += 1;
}

function ensureCapacity(timestampMs: number): void {
  while (players.size >= maxTrackedPlayers) {
    evictOldestPlayer(timestampMs);
  }
}

function resetPlayerLoadState(player: PlayerMetrics): void {
  player.loadStartedAtMs = null;
  player.loadGroupKey = null;
  player.hasFirstFrame = false;
  player.isBuffering = false;
  player.bufferStartedAtMs = null;
  player.bufferGroupKey = null;
}

export function configureVideoPlaybackMetrics(
  configuration: VideoPlaybackMetricsConfiguration,
): void {
  if (typeof configuration.enabled === 'boolean') {
    enabled = configuration.enabled;
  }
  if (typeof configuration.loggingEnabled === 'boolean') {
    loggingEnabled = configuration.loggingEnabled;
  }
  if (
    typeof configuration.maxTrackedPlayers === 'number' &&
    Number.isFinite(configuration.maxTrackedPlayers)
  ) {
    maxTrackedPlayers = Math.max(
      1,
      Math.floor(configuration.maxTrackedPlayers),
    );
    while (players.size > maxTrackedPlayers) {
      evictOldestPlayer(nowMs());
    }
  }
}

export function isVideoPlaybackMetricsEnabled(): boolean {
  return enabled;
}

export function recordVideoPlayerMounted(
  descriptor: VideoPlaybackPlayerDescriptor,
  timestampMs?: number,
): void {
  if (!enabled) return;
  const timestamp = normalizeTimestamp(timestampMs);
  const existing = players.get(descriptor.playerId);

  if (existing) {
    if (existing.mounted) {
      if (
        existing.surface !== descriptor.surface ||
        existing.role !== descriptor.role
      ) {
        decrementMounted(getOrCreateGroup(existing.surface, existing.role));
        existing.surface = descriptor.surface;
        existing.role = descriptor.role;
        incrementMounted(getOrCreateGroup(existing.surface, existing.role));
      }
      return;
    }

    existing.surface = descriptor.surface;
    existing.role = descriptor.role;
    existing.mounted = true;
    existing.errorCount = 0;
    resetPlayerLoadState(existing);
    incrementMounted(getOrCreateGroup(existing.surface, existing.role));
    logEvent('mounted', existing, { timestampMs: timestamp });
    return;
  }

  ensureCapacity(timestamp);
  const player: PlayerMetrics = {
    ...descriptor,
    mounted: true,
    loadStartedAtMs: null,
    loadGroupKey: null,
    hasFirstFrame: false,
    isBuffering: false,
    bufferStartedAtMs: null,
    bufferGroupKey: null,
    errorCount: 0,
  };
  players.set(player.playerId, player);
  incrementMounted(getOrCreateGroup(player.surface, player.role));
  logEvent('mounted', player, { timestampMs: timestamp });
}

export function updateVideoPlayerRole(
  playerId: string,
  role: string,
  surface?: string,
): void {
  if (!enabled) return;
  const player = players.get(playerId);
  if (!player) return;

  const nextSurface = surface ?? player.surface;
  if (player.role === role && player.surface === nextSurface) return;

  if (player.mounted) {
    decrementMounted(getOrCreateGroup(player.surface, player.role));
  }
  player.role = role;
  player.surface = nextSurface;
  if (player.mounted) {
    incrementMounted(getOrCreateGroup(player.surface, player.role));
  }
  logEvent('role-change', player);
}

export function recordVideoPlayerUnmounted(
  playerId: string,
  timestampMs?: number,
): void {
  if (!enabled) return;
  const player = players.get(playerId);
  if (!player || !player.mounted) return;

  const timestamp = normalizeTimestamp(timestampMs);
  closeOpenBuffer(player, timestamp);
  player.mounted = false;
  decrementMounted(getOrCreateGroup(player.surface, player.role));
  logEvent('unmounted', player, { timestampMs: timestamp });
}

export function recordVideoLoadStart(
  playerId: string,
  timestampMs?: number,
): void {
  if (!enabled) return;
  const player = players.get(playerId);
  if (!player) return;

  const timestamp = normalizeTimestamp(timestampMs);
  closeOpenBuffer(player, timestamp);
  resetPlayerLoadState(player);
  player.loadStartedAtMs = timestamp;
  player.loadGroupKey = groupKey(player.surface, player.role);
  getOrCreateGroup(player.surface, player.role).loadStartCount += 1;
  logEvent('load-start', player, { timestampMs: timestamp });
}

export function recordVideoFirstFrame(
  playerId: string,
  timestampMs?: number,
): void {
  if (!enabled) return;
  const player = players.get(playerId);
  if (
    !player ||
    player.loadStartedAtMs === null ||
    player.loadGroupKey === null ||
    player.hasFirstFrame
  ) {
    return;
  }

  const timestamp = normalizeTimestamp(timestampMs);
  const ttffMs = Math.max(0, timestamp - player.loadStartedAtMs);
  const group = getGroupByKey(player.loadGroupKey);
  if (group) {
    group.firstFrameCount += 1;
    group.ttffCount += 1;
    group.ttffTotalMs += ttffMs;
    group.ttffMaxMs = Math.max(group.ttffMaxMs, ttffMs);
    group.ttffLastMs = ttffMs;
  }

  player.hasFirstFrame = true;
  player.isBuffering = false;
  player.bufferStartedAtMs = null;
  player.bufferGroupKey = null;
  logEvent('first-frame', player, { timestampMs: timestamp, ttffMs });
}

export function recordVideoBufferState(
  playerId: string,
  isBuffering: boolean,
  timestampMs?: number,
): void {
  if (!enabled) return;
  const player = players.get(playerId);
  if (!player) return;

  const timestamp = normalizeTimestamp(timestampMs);
  if (!player.hasFirstFrame) {
    player.isBuffering = isBuffering;
    return;
  }

  if (isBuffering) {
    if (player.bufferStartedAtMs !== null) return;
    player.isBuffering = true;
    player.bufferStartedAtMs = timestamp;
    player.bufferGroupKey = groupKey(player.surface, player.role);
    getOrCreateGroup(player.surface, player.role).bufferCount += 1;
    logEvent('buffer-start', player, { timestampMs: timestamp });
    return;
  }

  closeOpenBuffer(player, timestamp);
}

export function recordVideoError(
  playerId: string,
  timestampMs?: number,
): void {
  if (!enabled) return;
  const player = players.get(playerId);
  if (!player) return;

  const timestamp = normalizeTimestamp(timestampMs);
  closeOpenBuffer(player, timestamp);
  player.errorCount += 1;
  getOrCreateGroup(player.surface, player.role).errorCount += 1;
  logEvent('error', player, { timestampMs: timestamp });
}

export function getVideoPlaybackMetricsSnapshot(): VideoPlaybackMetricsSnapshot {
  return {
    enabled,
    loggingEnabled,
    maxTrackedPlayers,
    trackedPlayerCount: players.size,
    evictedPlayerCount,
    groups: Array.from(groups.values())
      .map(group => ({
        ...group,
        ttffAverageMs:
          group.ttffCount === 0 ? 0 : group.ttffTotalMs / group.ttffCount,
      }))
      .sort(
        (left, right) =>
          left.surface.localeCompare(right.surface) ||
          left.role.localeCompare(right.role),
      ),
    players: Array.from(players.values()).map(player => ({
      playerId: player.playerId,
      surface: player.surface,
      role: player.role,
      mounted: player.mounted,
      hasFirstFrame: player.hasFirstFrame,
      isBuffering: player.isBuffering,
      errorCount: player.errorCount,
    })),
  };
}

export function resetVideoPlaybackMetrics(): void {
  groups.clear();
  players.clear();
  evictedPlayerCount = 0;
}
