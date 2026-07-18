// Description: ViewModels for live streams, live room comments, and Go Live.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

function applyLiveViewerCounts(
  items: LiveStreamItem[],
  counts: Record<number, number>,
) {
  return items.map(item => {
    const nextCount = counts[item.postId];
    return nextCount === undefined ? item : { ...item, viewerCount: nextCount };
  });
}

type UseLiveViewModelOptions = {
  autoLoad?: boolean;
};

// Live List ViewModel
export function useLiveViewModel(options: UseLiveViewModelOptions = {}) {
  const { autoLoad = true } = options;
  const repository = useMemo(() => createLiveRepository(), []);
  const [liveStreams, setLiveStreams] = useState<LiveStreamItem[]>([]);
  const [friendsLive, setFriendsLive] = useState<LiveStreamItem[]>([]);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const [streams, friends] = await Promise.all([
          repository.getLiveStreams(),
          repository.getLiveFriends(),
        ]);
        setLiveStreams(streams);
        setFriendsLive(friends);
      } catch (err) {
        console.error('[Live] load error:', err);
        setError('Không tải được danh sách live.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [repository],
  );

  useEffect(() => {
    if (!autoLoad) return;
    load('initial').catch(err => {
      console.error('[Live] initial load error:', err);
    });
  }, [autoLoad, load]);

  const refreshViewerCounts = useCallback(async () => {
    const postIds = Array.from(
      new Set([...liveStreams, ...friendsLive].map(item => item.postId)),
    );
    if (postIds.length === 0) return;

    try {
      const counts = await repository.getLiveViewerCounts(postIds);
      setLiveStreams(prev => applyLiveViewerCounts(prev, counts));
      setFriendsLive(prev => applyLiveViewerCounts(prev, counts));
    } catch (err) {
      console.error('[Live] viewer count refresh error:', err);
    }
  }, [friendsLive, liveStreams, repository]);

  useEffect(() => {
    if (isLoading) return undefined;
    const hasLiveItems = liveStreams.length > 0 || friendsLive.length > 0;
    if (!hasLiveItems) return undefined;

    refreshViewerCounts().catch(err => {
      console.error('[Live] viewer count immediate refresh error:', err);
    });

    const timer = setInterval(() => {
      refreshViewerCounts().catch(err => {
        console.error('[Live] viewer count polling error:', err);
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [friendsLive.length, isLoading, liveStreams.length, refreshViewerCounts]);

  return {
    liveStreams,
    friendsLive,
    isLoading,
    isRefreshing,
    error,
    refresh: useCallback(() => {
      load('refresh').catch(err => {
        console.error('[Live] refresh error:', err);
      });
    }, [load]),
  };
}

// Live Room ViewModel (viewer or host)
export function useLiveRoomViewModel(postId: number, initialSession?: LiveSession) {
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
  const [liveSession, setLiveSession] = useState<LiveSession | null>(initialSession ?? null);
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
  }, []);

  const currentUserProfile = useMemo(() => {
    return sessionStorage.getUserProfile();
  }, []);

  const isHost = useMemo(() => {
    const userId = sessionStorage.getSession()?.userId;
    return Boolean(
      liveSession?.isHost ||
      (userId && streamInfo?.publisher.id === userId),
    );
  }, [liveSession?.isHost, streamInfo?.publisher.id]);

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
        const userId = sessionStorage.getSession()?.userId;
        const currentIsHost = Boolean(userId && stream.publisher.id === userId);
        if (
          stream.state === 'live' &&
          !liveSessionRef.current &&
          !currentIsHost
        ) {
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
        setComments(prev => mergeComments(onlyNew ? prev : [], result.comments));
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
    if (!streamInfo || state === 'offline' || state === 'stale') return undefined;
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
