// Live Repository Interface
// Port từ: client/src/live/domain/repositories/

import type { LiveStreamItem, CreateLivePayload } from '../types/live.types';

export interface LiveRepository {
  getLiveStreams(): Promise<LiveStreamItem[]>;
  getLiveFriends(): Promise<LiveStreamItem[]>;
  createLive(payload: CreateLivePayload): Promise<{ postId: number; streamName: string }>;
  endLive(postId: number): Promise<void>;
  getComments(postId: number, offset?: number, limit?: number): Promise<unknown[]>;
  uploadThumbnail(postId: number, thumbBase64: string): Promise<void>;
}
