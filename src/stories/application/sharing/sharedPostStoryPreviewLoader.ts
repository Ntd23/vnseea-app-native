import type {
  FeedPost,
  SharedPostPreviewModel,
} from '../../../feed/domain/types/feed.types';
import { buildSharedPostPreviewModel } from '../../../feed/application/sharing/sharedPostPreview';

type Options = {
  loadPost: (postId: string) => Promise<FeedPost>;
  maxEntries?: number;
};

export function createSharedPostStoryPreviewLoader({
  loadPost,
  maxEntries = 100,
}: Options) {
  const cache = new Map<string, SharedPostPreviewModel>();
  const pending = new Map<string, Promise<SharedPostPreviewModel>>();

  const remember = (postId: string, model: SharedPostPreviewModel) => {
    cache.delete(postId);
    cache.set(postId, model);
    while (cache.size > maxEntries) {
      const oldestKey = cache.keys().next().value as string | undefined;
      if (!oldestKey) break;
      cache.delete(oldestKey);
    }
  };

  return {
    load(postId: string): Promise<SharedPostPreviewModel> {
      const cached = cache.get(postId);
      if (cached) {
        remember(postId, cached);
        return Promise.resolve(cached);
      }
      const existing = pending.get(postId);
      if (existing) return existing;

      const request = loadPost(postId)
        .then(post => {
          const model = buildSharedPostPreviewModel(post);
          remember(postId, model);
          return model;
        })
        .finally(() => {
          pending.delete(postId);
        });
      pending.set(postId, request);
      return request;
    },
  };
}
