// Description: Live domain types for VnseeaRn app.
export type LiveStreamState = 'live' | 'stale' | 'offline';

export type LiveStreamItem = {
  id: string;
  postId: number;
  streamName: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  startedAt: string;
  viewerCount: number;
  state: LiveStreamState;
  privacy: string;
  publisher: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string;
  };
};

export type LiveStreamComment = {
  id: string;
  author: string;
  username: string;
  avatarUrl: string;
  message: string;
  timeText: string;
  isHost: boolean;
};

export type CreateLivePayload = {
  title: string;
  description: string;
  streamName: string;
  privacy: string;
};