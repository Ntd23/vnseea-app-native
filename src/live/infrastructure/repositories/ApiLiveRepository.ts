// Live API Repository (Infrastructure)
// Connects to backend: api/v2/endpoints/live.php

import type { LiveRepository } from '../../domain/repositories/LiveRepository';
import type { LiveStreamItem, CreateLivePayload } from '../../domain/types/live.types';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';

// TODO: add live routes to route-registry.ts
// Currently using direct path for UI-only phase

export function createLiveRepository(): LiveRepository {
  return {
    async getLiveStreams(): Promise<LiveStreamItem[]> {
      // TODO: call GET /api/v2/endpoints/get_live_friends.php for friends live
      // Or create new endpoint for all live streams
      return [];
    },

    async getLiveFriends(): Promise<LiveStreamItem[]> {
      // TODO: call GET /api/v2/endpoints/get_live_friends.php
      return [];
    },

    async createLive(payload: CreateLivePayload): Promise<{ postId: number; streamName: string }> {
      // TODO: call POST /api/v2/endpoints/live.php with type=create
      const response = await apiBridge.post<{ api_status: number; post_data: { post_id: number; stream_name: string } }>(
        '/api/v2/endpoints/live',
        { type: 'create', stream_name: payload.streamName, post_privacy: payload.privacy }
      );
      return {
        postId: response.post_data?.post_id ?? 0,
        streamName: response.post_data?.stream_name ?? '',
      };
    },

    async endLive(postId: number): Promise<void> {
      // TODO: call POST /api/v2/endpoints/live.php with type=delete
      await apiBridge.post('/api/v2/endpoints/live', { type: 'delete', post_id: postId });
    },

    async getComments(postId: number, offset?: number, limit?: number): Promise<unknown[]> {
      // TODO: call POST /api/v2/endpoints/live.php with type=check_comments
      const response = await apiBridge.post<{ api_status: number; comments?: unknown[] }>(
        '/api/v2/endpoints/live',
        { type: 'check_comments', post_id: postId, offset, limit }
      );
      return response.comments ?? [];
    },

    async uploadThumbnail(postId: number, thumbBase64: string): Promise<void> {
      // TODO: implement multipart upload for type=create_thumb
      console.log('Upload thumbnail for post:', postId);
    },
  };
}
