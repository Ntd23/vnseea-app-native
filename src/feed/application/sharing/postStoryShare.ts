// Description: Builds and submits a first-class shared-post Story draft.

import type {
  CreateSharedPostStoryDraft,
  CreateStoryResult,
} from '../../../stories/domain/types/stories.types';
import type { FeedPost } from '../../domain/types/feed.types';

const STORY_NOTE_MAX_LENGTH = 300;

export function buildSharedPostStoryDraft({
  post,
  note,
}: {
  post: FeedPost;
  note: string;
}): CreateSharedPostStoryDraft {
  const normalizedNote = note.trim().slice(0, STORY_NOTE_MAX_LENGTH).trimEnd();
  return {
    sourcePostId: String(post.id),
    ...(normalizedNote ? { note: normalizedNote } : {}),
    audience: 'followers',
  };
}

export async function createPostStoryShare({
  post,
  note,
  createSharedPostStory,
}: {
  post: FeedPost;
  note: string;
  createSharedPostStory: (
    draft: CreateSharedPostStoryDraft,
  ) => Promise<CreateStoryResult>;
}) {
  const draft = buildSharedPostStoryDraft({ post, note });
  const result = await createSharedPostStory(draft);
  return { draft, result };
}
