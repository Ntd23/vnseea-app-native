// Stories Repository Interface
//
// All four methods map 1:1 to WoWonder API endpoints:
//
//   getStories  → POST /api/get-stories   (type=get_stories)
//   createStory → POST /api/create-story  (type=create_story, multipart)
//   deleteStory → POST /api/delete-story  (type=delete_story)
//   reactStory  → POST /api/react_story   (type=react_story, toggle)
//
// Auth (`user_id` + `s`) is injected by the axios interceptor in
// `client.ts`, so callers don't need to pass it explicitly here.

import type { ReactionType } from '../../../reels/domain/types/reels.types';
import type {
  CreateStoryDraft,
  CreateStoryResult,
  CreateSharedPostStoryDraft,
  StoryItem,
} from '../types/stories.types';

export interface StoriesRepository {
  /**
   * Fetch the friends-stories rail. Returns one `StoryItem` per author
   * the viewer follows (plus their own latest story at the head), each
   * containing its full media list.
   *
   * The WoWonder backend caps at 20 per call and doesn't truly paginate
   * (the `offset` param is accepted but unused in `Wo_GetFriendsStatus`).
   * For Phase 1 we therefore expose no cursor — just refetch on pull-to-refresh.
   */
  getStories(): Promise<StoryItem[]>;

  /**
   * Fetch stories grouped by user, which includes the user's own stories.
   */
  getUserStories(): Promise<StoryItem[]>;

  /** Fetch one Story after the backend has rechecked visibility and expiry. */
  getStoryById(storyId: string): Promise<StoryItem | null>;

  /**
   * Upload a new story. WoWonder's create endpoint requires a SINGLE
   * media file per call (image OR video) + an explicit `file_type`
   * discriminator. Title/description are optional but have hard length
   * limits (see `CreateStoryDraft`).
   */
  createStory(draft: CreateStoryDraft): Promise<CreateStoryResult>;

  /** Create a virtual Story segment that references a canonical source post. */
  createSharedPostStory(
    draft: CreateSharedPostStoryDraft,
  ): Promise<CreateStoryResult>;

  /**
   * Delete a story the viewer owns. The PHP endpoint enforces ownership
   * server-side, so a non-owner call returns api_status=400 and the
   * caller should surface the error.
   */
  deleteStory(storyId: string): Promise<void>;

  /**
   * Toggle a reaction on a story. WoWonder's `react_story` endpoint is
   * pure TOGGLE — calling it with the same reaction twice removes it.
   * To swap reactions (e.g. like → love) the caller must:
   *
   *   1. reactStory(id, 'like')  → adds 'like'
   *   2. reactStory(id, 'like')  → removes 'like'
   *   3. reactStory(id, 'love')  → adds 'love'
   *
   * The response `added` field reports whether the call resulted in an
   * add (true) or a removal (false) so the view-model can sync state.
   */
  reactStory(
    storyId: string,
    reaction: ReactionType,
  ): Promise<{ added: boolean }>;
}
