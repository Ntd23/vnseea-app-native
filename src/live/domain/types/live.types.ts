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

export type LiveReactionType =
  | 'like'
  | 'love'
  | 'haha'
  | 'wow'
  | 'sad'
  | 'angry';

export type LiveReactionEvent = {
  id: string;
  userId: string;
  name: string;
  username: string;
  avatarUrl: string;
  reaction: LiveReactionType;
  emoji: string;
};

export type LiveCommentsResult = {
  comments: LiveStreamComment[];
  viewerCount: number;
  state: LiveStreamState;
  reactionsCount?: number;
  reactionEvents?: LiveReactionEvent[];
};

export type CreateLivePayload = {
  title: string;
  description: string;
  streamName?: string;
  privacy: string;
};

export type LiveSession = {
  postId: number;
  streamName: string;
  provider: string;
  roomName: string;
  wsUrl: string;
  token: string;
  isHost: boolean;
  state: LiveStreamState;
};
