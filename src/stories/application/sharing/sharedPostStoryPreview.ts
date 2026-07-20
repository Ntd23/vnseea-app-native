import { createFeedRepository } from '../../../feed/infrastructure/repositories/ApiFeedRepository';
import { createSharedPostStoryPreviewLoader } from './sharedPostStoryPreviewLoader';

const feedRepository = createFeedRepository();

export const sharedPostStoryPreviewLoader =
  createSharedPostStoryPreviewLoader({
    loadPost: async postId => {
      const result = await feedRepository.getPostById(postId, {
        fetchComments: false,
        addView: false,
      });
      return result.post;
    },
  });
