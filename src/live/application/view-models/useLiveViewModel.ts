// Description: ViewModels for live streams, live room comments, and Go Live.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import { createLiveRepository } from '../../infrastructure/repositories/ApiLiveRepository';
import type {
  LiveReactionEvent,
  LiveStreamComment,
  LiveStreamItem,
  LiveStreamState,
  LiveSession,
} from '../../domain/types/live.types';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { createFeedRepository } from '../../../feed';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import {
  endedLivePostsStorage,
  LOCAL_LIVE_ENDED_EVENT,
} from '../../infrastructure/storage/endedLivePostsStorage';
import {
  invalidateLiveDiscoverySnapshot,
  invalidateLivePostSnapshot,
  loadLiveDiscoverySnapshot,
  loadLivePostSnapshot,
} from '../state/liveRequestResource';

const LIVE_DEBUG_PREFIX = '[VNSEEA_CALL_DEBUG]';

function logLiveLifecycleDebug(
  event: string,
  data: Record<string, unknown> = {},
) {
  const payload = { event, at: new Date().toISOString(), ...data };
  try {
    console.log(LIVE_DEBUG_PREFIX, JSON.stringify(payload));
  } catch {
    console.log(LIVE_DEBUG_PREFIX, event, data);
  }
}

function isMissingLivePostError(error: unknown) {
  return error instanceof Error && error.message.includes('post not found');
}

function mergeComments(
  current: LiveStreamComment[],
  incoming: LiveStreamComment[],
) {
  const byId = new Map<string, LiveStreamComment>();
  [...current, ...incoming].forEach(comment => {
    byId.set(comment.id, comment);
  });

  return Array.from(byId.values()).sort((a, b) => {
    const aNum = Number(a.id);
    const bNum = Number(b.id);
    if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;
    return 0;
  });
}

function areLiveStreamSnapshotsEqual(
  current: LiveStreamItem,
  next: LiveStreamItem,
) {
  return (
    current.id === next.id &&
    current.state === next.state &&
    current.viewerCount === next.viewerCount &&
    current.streamName === next.streamName &&
    current.title === next.title &&
    current.description === next.description &&
    current.thumbnailUrl === next.thumbnailUrl &&
    current.startedAt === next.startedAt &&
    current.privacy === next.privacy &&
    current.publisher.id === next.publisher.id &&
    current.publisher.name === next.publisher.name &&
    current.publisher.username === next.publisher.username &&
    current.publisher.avatarUrl === next.publisher.avatarUrl
  );
}

function applyLiveStreamSnapshots(
  items: LiveStreamItem[],
  snapshots: ReadonlyMap<number, LiveStreamItem | null | undefined>,
) {
  let changed = false;
  const nextItems: LiveStreamItem[] = [];

  items.forEach(item => {
    const snapshot = snapshots.get(item.postId);
    if (snapshot === null || snapshot?.state === 'offline') {
      changed = true;
      return;
    }
    if (!snapshot) {
      nextItems.push(item);
      return;
    }

    if (areLiveStreamSnapshotsEqual(item, snapshot)) {
      nextItems.push(item);
      return;
    }

    changed = true;
    nextItems.push(snapshot);
  });

  return changed ? nextItems : items;
}

type UseLiveViewModelOptions = {
  autoLoad?: boolean;
  enabled?: boolean;
  userId?: string;
  refreshIntervalMs?: number;
};

// Live List ViewModel
export function useLiveViewModel(options: UseLiveViewModelOptions = {}) {
  const {
    autoLoad = true,
    enabled = true,
    userId,
    refreshIntervalMs = 0,
  } = options;
  const repository = useMemo(() => createLiveRepository(), []);
  const [liveStreams, setLiveStreams] = useState<LiveStreamItem[]>([]);
  const [friendsLive, setFriendsLive] = useState<LiveStreamItem[]>([]);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const activeProbeGenerationRef = useRef(0);
  const activeProbeInFlightGenerationRef = useRef<number | null>(null);
  const enabledRef = useRef(enabled);
  const foregroundLoadGenerationRef = useRef(0);
  const loadGenerationRef = useRef(0);
  const loadInFlightGenerationRef = useRef<number | null>(null);
  const localOwnerId = sessionStorage.getSession()?.userId;
  const localOwnerIdRef = useRef(localOwnerId);
  const discoveryResourceKey = `${localOwnerId || 'guest'}:${
    userId ? `user:${userId}` : 'global'
  }`;
  enabledRef.current = enabled;
  localOwnerIdRef.current = localOwnerId;

  const load = useCallback(
    async (mode: 'initial' | 'refresh' | 'background' = 'initial') => {
      if (!mountedRef.current || !enabledRef.current) return;
      const requestSession = sessionStorage.getSession();
      if (!requestSession?.accessToken) {
        if (mode !== 'background') {
          setIsLoading(false);
          setIsRefreshing(false);
          setError(null);
        }
        return;
      }
      if (loadInFlightGenerationRef.current !== null) return;
      const requestAccessToken = requestSession?.accessToken ?? null;
      const requestOwnerId = requestSession?.userId;
      const hasSessionChanged = () => {
        const currentSession = sessionStorage.getSession();
        return (
          (currentSession?.accessToken ?? null) !== requestAccessToken ||
          currentSession?.userId !== requestOwnerId
        );
      };
      const loadGeneration = loadGenerationRef.current + 1;
      loadGenerationRef.current = loadGeneration;
      loadInFlightGenerationRef.current = loadGeneration;
      const foregroundLoadGeneration =
        mode === 'background' ? null : foregroundLoadGenerationRef.current + 1;
      if (foregroundLoadGeneration !== null) {
        foregroundLoadGenerationRef.current = foregroundLoadGeneration;
      }
      if (mode === 'refresh') {
        setIsRefreshing(true);
      } else if (mode === 'initial') {
        setIsLoading(true);
      }
      if (mode !== 'background') {
        setError(null);
      }

      try {
        const snapshot = await loadLiveDiscoverySnapshot(
          discoveryResourceKey,
          async () => {
            if (userId) {
              return {
                liveStreams: await repository.getUserLiveStreams(userId),
                friendsLive: [],
              };
            }

            const [streamsResult, friendsResult] = await Promise.allSettled([
              repository.getLiveStreams(),
              repository.getLiveFriends(),
            ]);
            if (
              streamsResult.status === 'rejected' &&
              friendsResult.status === 'rejected'
            ) {
              throw streamsResult.reason;
            }

            return {
              liveStreams:
                streamsResult.status === 'fulfilled'
                  ? streamsResult.value
                  : undefined,
              friendsLive:
                friendsResult.status === 'fulfilled'
                  ? friendsResult.value
                  : undefined,
            };
          },
          { force: mode === 'refresh' },
        );
        if (
          !mountedRef.current ||
          !enabledRef.current ||
          hasSessionChanged() ||
          localOwnerIdRef.current !== localOwnerId ||
          loadGenerationRef.current !== loadGeneration
        ) {
          return;
        }

        if (snapshot.liveStreams) {
          setLiveStreams(
            endedLivePostsStorage.filterActiveStreams(
              snapshot.liveStreams,
              localOwnerId,
            ),
          );
        }
        if (snapshot.friendsLive) {
          setFriendsLive(
            endedLivePostsStorage.filterActiveStreams(
              snapshot.friendsLive,
              localOwnerId,
            ),
          );
        }
      } catch (err) {
        if (
          !mountedRef.current ||
          !enabledRef.current ||
          hasSessionChanged() ||
          localOwnerIdRef.current !== localOwnerId ||
          loadGenerationRef.current !== loadGeneration
        ) {
          return;
        }
        console.warn('[Live] load error:', err);
        if (mode !== 'background') {
          setError('Không tải được danh sách live.');
        }
      } finally {
        if (loadInFlightGenerationRef.current === loadGeneration) {
          loadInFlightGenerationRef.current = null;
        }
        if (
          mountedRef.current &&
          foregroundLoadGeneration !== null &&
          foregroundLoadGenerationRef.current === foregroundLoadGeneration
        ) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [discoveryResourceKey, localOwnerId, repository, userId],
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      enabledRef.current = false;
      activeProbeGenerationRef.current += 1;
      activeProbeInFlightGenerationRef.current = null;
      foregroundLoadGenerationRef.current += 1;
      loadGenerationRef.current += 1;
      loadInFlightGenerationRef.current = null;
    };
  }, []);

  useEffect(() => {
    activeProbeGenerationRef.current += 1;
    activeProbeInFlightGenerationRef.current = null;
    foregroundLoadGenerationRef.current += 1;
    loadGenerationRef.current += 1;
    loadInFlightGenerationRef.current = null;
    setIsLoading(false);
    setIsRefreshing(false);
    setLiveStreams([]);
    setFriendsLive([]);
  }, [localOwnerId, userId]);

  useEffect(() => {
    if (!enabled) {
      activeProbeGenerationRef.current += 1;
      activeProbeInFlightGenerationRef.current = null;
      foregroundLoadGenerationRef.current += 1;
      loadGenerationRef.current += 1;
      loadInFlightGenerationRef.current = null;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [enabled]);

  useEffect(() => {
    const ownerKey = localOwnerId || 'guest';
    const subscription = DeviceEventEmitter.addListener(
      LOCAL_LIVE_ENDED_EVENT,
      (event: { postId?: string; userId?: string }) => {
        const endedPostId = String(event?.postId ?? '').trim();
        if (!endedPostId) return;
        if (event?.userId && event.userId !== ownerKey) return;

        activeProbeGenerationRef.current += 1;
        activeProbeInFlightGenerationRef.current = null;
        loadGenerationRef.current += 1;
        loadInFlightGenerationRef.current = null;
        invalidateLivePostSnapshot(Number(endedPostId));
        invalidateLiveDiscoverySnapshot(discoveryResourceKey);

        setLiveStreams(current =>
          current.filter(item => String(item.postId) !== endedPostId),
        );
        setFriendsLive(current =>
          current.filter(item => String(item.postId) !== endedPostId),
        );
      },
    );

    return () => subscription.remove();
  }, [discoveryResourceKey, localOwnerId]);

  useEffect(() => {
    if (!autoLoad || !enabled) return;
    load('initial').catch(err => {
      console.error('[Live] initial load error:', err);
    });
  }, [autoLoad, enabled, load]);

  useEffect(() => {
    if (!enabled || refreshIntervalMs <= 0) return undefined;

    const refreshInBackground = () => {
      if (AppState.currentState !== 'active') return;
      load('background').catch(err => {
        console.error('[Live] background refresh error:', err);
      });
    };
    const timer = setInterval(refreshInBackground, refreshIntervalMs);
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') refreshInBackground();
    });

    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [enabled, load, refreshIntervalMs]);

  const refreshActiveStreams = useCallback(
    async (postIds: number[]) => {
      if (!mountedRef.current || !enabledRef.current) return;
      if (postIds.length === 0) return;
      const requestSession = sessionStorage.getSession();
      if (!requestSession?.accessToken) return;
      const requestAccessToken = requestSession.accessToken;
      const requestOwnerId = requestSession.userId;
      const hasSessionChanged = () => {
        const currentSession = sessionStorage.getSession();
        return (
          currentSession?.accessToken !== requestAccessToken ||
          currentSession?.userId !== requestOwnerId
        );
      };
      if (activeProbeInFlightGenerationRef.current !== null) return;
      const probeGeneration = activeProbeGenerationRef.current + 1;
      activeProbeGenerationRef.current = probeGeneration;
      activeProbeInFlightGenerationRef.current = probeGeneration;

      try {
        const probeResults = await Promise.all(
          postIds.map(async postId => {
            try {
              const snapshot = await loadLivePostSnapshot(postId, () =>
                repository.getLivePost(postId),
              );
              return [postId, snapshot] as const;
            } catch (err) {
              if (
                mountedRef.current &&
                enabledRef.current &&
                !hasSessionChanged()
              ) {
                console.log('[Live] active stream probe skipped:', {
                  postId,
                  err,
                });
              }
              return [postId, undefined] as const;
            }
          }),
        );
        if (
          !mountedRef.current ||
          !enabledRef.current ||
          hasSessionChanged() ||
          localOwnerIdRef.current !== localOwnerId ||
          activeProbeGenerationRef.current !== probeGeneration
        ) {
          return;
        }
        const snapshots = new Map<number, LiveStreamItem | null | undefined>(
          probeResults,
        );

        probeResults.forEach(([postId, snapshot]) => {
          if (snapshot === null) {
            endedLivePostsStorage.markEnded(postId, localOwnerId);
          } else if (snapshot?.state === 'offline') {
            endedLivePostsStorage.notifyInactive(postId, localOwnerId);
          }
        });

        setLiveStreams(previous =>
          applyLiveStreamSnapshots(previous, snapshots),
        );
        setFriendsLive(previous =>
          applyLiveStreamSnapshots(previous, snapshots),
        );
      } finally {
        if (activeProbeInFlightGenerationRef.current === probeGeneration) {
          activeProbeInFlightGenerationRef.current = null;
        }
      }
    },
    [localOwnerId, repository],
  );

  const trackedLivePostIdsKey = useMemo(
    () =>
      Array.from(
        new Set([...liveStreams, ...friendsLive].map(item => item.postId)),
      )
        .sort((left, right) => left - right)
        .join(','),
    [friendsLive, liveStreams],
  );

  useEffect(() => {
    if (!enabled || isLoading || !trackedLivePostIdsKey) return undefined;
    const postIds = trackedLivePostIdsKey
      .split(',')
      .map(value => Number(value))
      .filter(postId => Number.isFinite(postId) && postId > 0);

    refreshActiveStreams(postIds).catch(err => {
      console.error('[Live] active stream immediate probe error:', err);
    });

    const timer = setInterval(() => {
      refreshActiveStreams(postIds).catch(err => {
        console.error('[Live] active stream polling error:', err);
      });
    }, 5000);

    return () => {
      activeProbeGenerationRef.current += 1;
      activeProbeInFlightGenerationRef.current = null;
      clearInterval(timer);
    };
  }, [enabled, isLoading, refreshActiveStreams, trackedLivePostIdsKey]);

  return {
    liveStreams,
    friendsLive,
    isLoading,
    isRefreshing,
    error,
    refresh: useCallback(() => {
      return load('refresh').catch(err => {
        console.error('[Live] refresh error:', err);
      });
    }, [load]),
  };
}

// Live Room ViewModel (viewer or host)
export function useLiveRoomViewModel(
  postId: number,
  initialSession?: LiveSession,
) {
  const repository = useMemo(() => createLiveRepository(), []);
  const [streamInfo, setStreamInfo] = useState<LiveStreamItem | null>(null);
  const [comments, setComments] = useState<LiveStreamComment[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [reactionsCount, setReactionsCount] = useState(0);
  const [reactionEvents, setReactionEvents] = useState<LiveReactionEvent[]>([]);
  const [state, setState] = useState<LiveStreamState>('stale');
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedComments, setHasLoadedComments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveSession, setLiveSession] = useState<LiveSession | null>(
    initialSession ?? null,
  );
  const liveSessionRef = useRef<LiveSession | null>(initialSession ?? null);
  const stateRef = useRef<LiveStreamState>('stale');
  const activePostIdRef = useRef(postId);
  const pendingLiveStateCheckRef = useRef<{
    postId: number;
    promise: Promise<LiveStreamState>;
  } | null>(null);
  const seenReactionEventsRef = useRef(new Set<string>());

  const updateLiveState = useCallback((nextState: LiveStreamState) => {
    stateRef.current = nextState;
    setState(nextState);

    if (nextState === 'offline' && activePostIdRef.current > 0) {
      endedLivePostsStorage.markEnded(
        activePostIdRef.current,
        sessionStorage.getSession()?.userId,
      );
    }
  }, []);

  const currentUserProfile = useMemo(() => {
    return sessionStorage.getUserProfile();
  }, []);

  const isHost = liveSession?.isHost === true;

  useEffect(() => {
    liveSessionRef.current = liveSession;
  }, [liveSession]);

  useEffect(() => {
    if (initialSession?.postId === postId) {
      liveSessionRef.current = initialSession;
      setLiveSession(initialSession);
      return;
    }

    if (liveSessionRef.current?.postId !== postId) {
      liveSessionRef.current = null;
      setLiveSession(null);
    }
  }, [initialSession, postId]);

  useEffect(() => {
    activePostIdRef.current = postId;
    pendingLiveStateCheckRef.current = null;
    setStreamInfo(null);
    setComments([]);
    seenReactionEventsRef.current.clear();
    setReactionEvents([]);
    setHasLoadedComments(false);
    updateLiveState('stale');
  }, [postId, updateLiveState]);

  const collectReactionEvents = useCallback(
    (events: LiveReactionEvent[] | undefined, shouldEmit: boolean) => {
      if (!events?.length) return;

      const nextEvents: LiveReactionEvent[] = [];
      events.forEach(event => {
        if (seenReactionEventsRef.current.has(event.id)) return;
        seenReactionEventsRef.current.add(event.id);
        if (shouldEmit) {
          nextEvents.push(event);
        }
      });

      if (nextEvents.length > 0) {
        setReactionEvents(prev => [...prev, ...nextEvents].slice(-50));
      }
    },
    [],
  );

  const loadStream = useCallback(async () => {
    if (!postId || postId <= 0) {
      setError('ID live không hợp lệ.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const stream = await repository.getLivePost(postId);
      if (activePostIdRef.current !== postId) return;
      setStreamInfo(stream);
      if (stream) {
        updateLiveState(stream.state);
        if (stream.state === 'live' && !liveSessionRef.current) {
          const session = await repository.joinLive(postId, stream.streamName);
          if (activePostIdRef.current !== postId) return;
          liveSessionRef.current = session;
          setLiveSession(session);
        }
      } else {
        setError('Live này không còn hoạt động.');
        updateLiveState('offline');
      }
    } catch (err: any) {
      if (activePostIdRef.current !== postId) return;
      console.warn('[LiveRoom] load stream error:', err);
      if (err?.message?.includes('post not found')) {
        setError('Live này không còn hoạt động.');
        updateLiveState('offline');
      } else {
        setError('Không tải được live.');
      }
    } finally {
      if (activePostIdRef.current === postId) {
        setIsLoading(false);
      }
    }
  }, [postId, repository, updateLiveState]);

  const refreshLiveState = useCallback(async (): Promise<LiveStreamState> => {
    if (!postId || postId <= 0) return stateRef.current;
    if (stateRef.current === 'offline') return 'offline';
    if (pendingLiveStateCheckRef.current?.postId === postId) {
      return pendingLiveStateCheckRef.current.promise;
    }

    logLiveLifecycleDebug('live_status_check_start', {
      postId,
      role: isHost ? 'host' : 'viewer',
    });

    const request = (async () => {
      try {
        const result = await repository.getComments(postId, {
          limit: 1,
          page: isHost ? 'live' : 'story',
        });
        if (activePostIdRef.current !== postId) return 'stale';
        updateLiveState(result.state);
        setViewerCount(result.viewerCount);
        logLiveLifecycleDebug('live_status_check_result', {
          postId,
          role: isHost ? 'host' : 'viewer',
          state: result.state,
        });
        return result.state;
      } catch (err) {
        if (activePostIdRef.current !== postId) return 'stale';
        if (isMissingLivePostError(err)) {
          updateLiveState('offline');
          logLiveLifecycleDebug('live_status_check_result', {
            postId,
            role: isHost ? 'host' : 'viewer',
            state: 'offline',
            reason: 'post_not_found',
          });
          return 'offline';
        }

        logLiveLifecycleDebug('live_status_check_error', {
          postId,
          role: isHost ? 'host' : 'viewer',
          message: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    })();

    pendingLiveStateCheckRef.current = { postId, promise: request };
    try {
      return await request;
    } finally {
      if (pendingLiveStateCheckRef.current?.promise === request) {
        pendingLiveStateCheckRef.current = null;
      }
    }
  }, [isHost, postId, repository, updateLiveState]);

  const refreshComments = useCallback(
    async (onlyNew = false) => {
      if (!postId || postId <= 0) return;
      try {
        const latestId = onlyNew
          ? Math.max(0, ...comments.map(comment => Number(comment.id) || 0))
          : 0;
        const result = await repository.getComments(postId, {
          offset: latestId || undefined,
          limit: 20,
          page: isHost ? 'live' : 'story',
        });
        if (activePostIdRef.current !== postId) return;
        setComments(prev =>
          mergeComments(onlyNew ? prev : [], result.comments),
        );
        setViewerCount(result.viewerCount);
        updateLiveState(result.state);
        setHasLoadedComments(true);
        if (result.reactionsCount !== undefined) {
          setReactionsCount(result.reactionsCount);
        }
        collectReactionEvents(result.reactionEvents, onlyNew && isHost);
      } catch (err: any) {
        if (activePostIdRef.current !== postId) return;
        console.warn('[LiveRoom] comments error:', err);
        if (err?.message?.includes('post not found')) {
          updateLiveState('offline');
        }
      }
    },
    [
      collectReactionEvents,
      comments,
      isHost,
      postId,
      repository,
      updateLiveState,
    ],
  );

  useEffect(() => {
    loadStream().catch(err => {
      console.warn('[LiveRoom] initial stream load error:', err);
    });
  }, [loadStream]);

  useEffect(() => {
    if (!streamInfo || state === 'offline' || state === 'stale')
      return undefined;
    refreshComments(false).catch(err => {
      console.warn('[LiveRoom] initial comments load error:', err);
    });
    const timer = setInterval(() => {
      refreshComments(true).catch(err => {
        console.warn('[LiveRoom] comments polling error:', err);
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [refreshComments, streamInfo, state]);

  const leave = useCallback(async () => {
    if (!isHost) return;

    try {
      await repository.endLive(postId);
      updateLiveState('offline');
      logLiveLifecycleDebug('live_host_end_request_success', { postId });
    } catch (err) {
      logLiveLifecycleDebug('live_host_end_request_error', {
        postId,
        message: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }, [isHost, postId, repository, updateLiveState]);

  return {
    streamInfo,
    liveSession,
    comments,
    viewerCount,
    reactionsCount,
    reactionEvents,
    state,
    isHost,
    isLoading,
    hasLoadedComments,
    error,
    currentUserProfile,
    refreshLiveState,
    sendComment: useCallback(
      async (message: string) => {
        const trimmed = message.trim();
        if (!trimmed) return;
        const comment = await repository.addComment(postId, trimmed);
        setComments(prev => mergeComments(prev, [comment]));
      },
      [postId, repository],
    ),
    react: useCallback(
      async (reaction: ReactionType) => {
        try {
          const feedRepo = createFeedRepository();
          await feedRepo.setReaction(String(postId), reaction);
          setReactionsCount(prev => prev + 1);
        } catch (err) {
          console.error('[LiveRoom] react error:', err);
        }
      },
      [postId],
    ),
    leave,
  };
}

// Go Live ViewModel (host)
export function useGoLiveViewModel() {
  const repository = useMemo(() => createLiveRepository(), []);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState('0');
  const [isLoading, setIsLoading] = useState(false);

  const privacyOptions = [
    { value: '0', label: 'Công khai' },
    { value: '1', label: 'Bạn bè' },
    { value: '2', label: 'Người theo dõi' },
    { value: '3', label: 'Chỉ mình tôi' },
  ];

  return {
    title,
    description,
    privacy,
    privacyOptions,
    isLoading,
    setTitle,
    setDescription,
    setPrivacy,
    startLive: useCallback(async () => {
      setIsLoading(true);
      try {
        return await repository.createLive({
          title: title.trim() || 'Trực tiếp',
          description: description.trim(),
          privacy,
        });
      } finally {
        setIsLoading(false);
      }
    }, [description, privacy, repository, title]),
  };
}
