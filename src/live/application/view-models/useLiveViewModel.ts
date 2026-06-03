// Description: ViewModel for live streams list screen with mock data.
import { useState, useCallback } from 'react';
import type { LiveStreamItem, LiveStreamComment } from '../../domain/types/live.types';

const MOCK_LIVE_STREAMS: LiveStreamItem[] = [
  {
    id: '1',
    postId: 101,
    streamName: 'user_123_live_1',
    title: 'Chào buổi sáng mọi người! ☀️',
    description: 'Hôm nay trời đẹp, cùng mình trò chuyện nhé',
    thumbnailUrl: null,
    startedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    viewerCount: 234,
    state: 'live',
    privacy: '0',
    publisher: {
      id: 'u1',
      name: 'Minh Anh',
      username: 'minhanh',
      avatarUrl: 'https://i.pravatar.cc/150?img=1',
    },
  },
  {
    id: '2',
    postId: 102,
    streamName: 'user_456_live_2',
    title: 'Nấu ăn cùng các bạn 🍜',
    description: 'Công thức mì xào giòn tuyệt vời',
    thumbnailUrl: null,
    startedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    viewerCount: 156,
    state: 'live',
    privacy: '0',
    publisher: {
      id: 'u2',
      name: 'Hoàng Nam',
      username: 'hoangnam',
      avatarUrl: 'https://i.pravatar.cc/150?img=3',
    },
  },
  {
    id: '3',
    postId: 103,
    streamName: 'user_789_live_3',
    title: 'Gym buổi sáng 💪',
    description: 'Tập cơ bụng thôi nào',
    thumbnailUrl: null,
    startedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    viewerCount: 89,
    state: 'live',
    privacy: '0',
    publisher: {
      id: 'u3',
      name: 'Thu Hà',
      username: 'thuhan',
      avatarUrl: 'https://i.pravatar.cc/150?img=5',
    },
  },
];

const MOCK_FRIENDS_LIVE: LiveStreamItem[] = [
  {
    id: '4',
    postId: 104,
    streamName: 'friend_101_live_1',
    title: 'Review sách hay 📚',
    description: 'Sách mới về tâm lý học',
    thumbnailUrl: null,
    startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    viewerCount: 42,
    state: 'live',
    privacy: '0',
    publisher: {
      id: 'f1',
      name: 'Lan Phương',
      username: 'lanphuong',
      avatarUrl: 'https://i.pravatar.cc/150?img=7',
    },
  },
];

const MOCK_COMMENTS: LiveStreamComment[] = [
  {
    id: 'c1',
    author: 'User A',
    username: 'usera',
    avatarUrl: 'https://i.pravatar.cc/150?img=10',
    message: 'Hay quá bạn ơi! 👏',
    timeText: '2 phút trước',
    isHost: false,
  },
  {
    id: 'c2',
    author: 'User B',
    username: 'userb',
    avatarUrl: 'https://i.pravatar.cc/150?img=11',
    message: 'Xin chào mọi người',
    timeText: '1 phút trước',
    isHost: false,
  },
];

// Live List ViewModel
export function useLiveViewModel() {
  const [liveStreams] = useState<LiveStreamItem[]>(MOCK_LIVE_STREAMS);
  const [friendsLive] = useState<LiveStreamItem[]>(MOCK_FRIENDS_LIVE);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  return {
    liveStreams,
    friendsLive,
    isLoading,
    error,
    refresh: useCallback(() => {
      // TODO: call repository
    }, []),
  };
}

// Live Room ViewModel (viewer)
export function useLiveRoomViewModel(postId: number) {
  const [comments] = useState<LiveStreamComment[]>(MOCK_COMMENTS);
  const [viewerCount] = useState(234);
  const [reactionsCount] = useState(56);

  const streamInfo = MOCK_LIVE_STREAMS.find(s => s.postId === postId) || MOCK_LIVE_STREAMS[0];

  return {
    streamInfo,
    comments,
    viewerCount,
    reactionsCount,
    isLoading: false,
    error: null,
    sendComment: useCallback((message: string) => {
      console.log('Sending comment:', message);
    }, []),
    react: useCallback((reaction: string) => {
      console.log('Reacting:', reaction);
    }, []),
    leave: useCallback(() => {
      console.log('Leaving live');
    }, []),
  };
}

// Go Live ViewModel (host)
export function useGoLiveViewModel() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState('0');
  const [isLoading, setIsLoading] = useState(false);

  const privacyOptions = [
    { value: '0', label: 'Công khai' },
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
      // TODO: call create live API
      console.log('Starting live:', { title, description, privacy });
      setIsLoading(false);
    }, [title, description, privacy]),
  };
}