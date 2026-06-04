// Live Repository Interface
// Port từ: client/src/live/domain/repositories/

import type {
  CreateLivePayload,
  LiveCommentsResult,
  LiveStreamComment,
  LiveStreamItem,
} from '../types/live.types';

export interface LiveRepository {
  getLiveStreams(): Promise<LiveStreamItem[]>;
  getLiveFriends(): Promise<LiveStreamItem[]>;
  getLivePost(postId: number): Promise<LiveStreamItem | null>;
  createLive(payload: CreateLivePayload): Promise<{ postId: number; streamName: string }>;
  endLive(postId: number): Promise<void>;
  getComments(
    postId: number,
    options?: { offset?: number; limit?: number; page?: 'live' | 'story' },
  ): Promise<LiveCommentsResult>;
  addComment(postId: number, text: string): Promise<LiveStreamComment>;
  heartbeat(postId: number, page?: 'live' | 'story'): Promise<void>;
  uploadThumbnail(postId: number, thumbBase64: string): Promise<void>;
}
