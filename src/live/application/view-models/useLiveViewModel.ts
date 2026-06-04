// Description: ViewModels for live streams, live room comments, and Go Live.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createLiveRepository } from '../../infrastructure/repositories/ApiLiveRepository';
import type {
  LiveStreamComment,
  LiveStreamItem,
  LiveStreamState,
} from '../../domain/types/live.types';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';

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

// Live List ViewModel
export function useLiveViewModel() {
  const repository = useMemo(() => createLiveRepository(), []);
  const [liveStreams, setLiveStreams] = useState<LiveStreamItem[]>([]);
  const [friendsLive, setFriendsLive] = useState<LiveStreamItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
    load('initial').catch(err => {
      console.error('[Live] initial load error:', err);
    });
  }, [load]);

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
export function useLiveRoomViewModel(postId: number) {
  const repository = useMemo(() => createLiveRepository(), []);
  const [streamInfo, setStreamInfo] = useState<LiveStreamItem | null>(null);
  const [comments, setComments] = useState<LiveStreamComment[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [reactionsCount] = useState(0);
  const [state, setState] = useState<LiveStreamState>('stale');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isHost = useMemo(() => {
    const userId = sessionStorage.getSession()?.userId;
    return Boolean(userId && streamInfo?.publisher.id === userId);
  }, [streamInfo?.publisher.id]);

  const loadStream = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const stream = await repository.getLivePost(postId);
      setStreamInfo(stream);
      if (stream) {
        setState(stream.state);
      } else {
        setError('Live này không còn hoạt động.');
      }
    } catch (err) {
      console.error('[LiveRoom] load stream error:', err);
      setError('Không tải được live.');
    } finally {
      setIsLoading(false);
    }
  }, [postId, repository]);

  const refreshComments = useCallback(
    async (onlyNew = false) => {
      try {
        const latestId = onlyNew
          ? Math.max(0, ...comments.map(comment => Number(comment.id) || 0))
          : 0;
        const result = await repository.getComments(postId, {
          offset: latestId || undefined,
          limit: 20,
          page: isHost ? 'live' : 'story',
        });
        setComments(prev => mergeComments(onlyNew ? prev : [], result.comments));
        setViewerCount(result.viewerCount);
        setState(result.state);
      } catch (err) {
        console.error('[LiveRoom] comments error:', err);
      }
    },
    [comments, isHost, postId, repository],
  );

  useEffect(() => {
    loadStream().catch(err => {
      console.error('[LiveRoom] initial stream load error:', err);
    });
  }, [loadStream]);

  useEffect(() => {
    if (!streamInfo) return undefined;
    refreshComments(false).catch(err => {
      console.error('[LiveRoom] initial comments load error:', err);
    });
    const timer = setInterval(() => {
      refreshComments(true).catch(err => {
        console.error('[LiveRoom] comments polling error:', err);
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [refreshComments, streamInfo]);

  return {
    streamInfo,
    comments,
    viewerCount,
    reactionsCount,
    state,
    isHost,
    isLoading,
    error,
    sendComment: useCallback(
      async (message: string) => {
        const trimmed = message.trim();
        if (!trimmed) return;
        const comment = await repository.addComment(postId, trimmed);
        setComments(prev => mergeComments(prev, [comment]));
      },
      [postId, repository],
    ),
    react: useCallback((reaction: string) => {
      console.log('[LiveRoom] reaction:', reaction);
    }, []),
    leave: useCallback(() => {
      if (isHost) {
        repository.endLive(postId).catch(err => {
          console.error('[LiveRoom] end live error:', err);
        });
      }
    }, [isHost, postId, repository]),
  };
}

// Go Live ViewModel (host)
export function useGoLiveViewModel() {
  const repository = useMemo(() => createLiveRepository(), []);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState('1');
  const [isLoading, setIsLoading] = useState(false);

  const privacyOptions = [
    { value: '1', label: 'Bạn bè' },
    { value: '2', label: 'Bạn bè của bạn' },
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
          title: title.trim(),
          description: description.trim(),
          privacy,
        });
      } finally {
        setIsLoading(false);
      }
    }, [description, privacy, repository, title]),
  };
}
