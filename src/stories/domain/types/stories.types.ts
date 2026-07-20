// Stories domain types
//
// Modelled after WoWonder's `T_USER_STORY` + `T_USER_STORY_MEDIA` tables
// (see phtml/api/phone/get_stories.php, create_story.php, delete_story.php
// and phtml/api/v2/endpoints/react_story.php).
//
// One STORY = one row in T_USER_STORY belonging to a user. Each story has
// 1+ media items in T_USER_STORY_MEDIA (image OR video). The API returns
// the user's most recent story as the "entry point" for the bubble in the
// stories row; the full media list is fetched by opening the bubble.
//
// Stories auto-expire 24h after `posted` (server-managed — client just
// renders what comes back).

import type { ReactionType } from '../../../reels/domain/types/reels.types';
import type { ContentAudience } from '../../../shared-kernel/domain/types/contentAudience';

/**
 * Publisher (author) of a story. Shape mirrors `ReelPublisher` so any
 * shared UI components can render either without branching.
 */
export interface StoryPublisher {
  userId: string;
  username: string;
  name: string;
  avatarUrl?: string;
  isVerified?: boolean;
  isOnline?: boolean;
}

/**
 * A single image OR video segment inside a story. WoWonder stores each
 * segment as its own row in `T_USER_STORY_MEDIA`. The `filename` field
 * is pre-normalised to a full URL by `Wo_GetMedia()` before it reaches
 * the API response — so this is ready to drop into <Image source> or
 * <Video source>.
 */
export type StoryMediaType = 'image' | 'video' | 'shared_post';

export interface StoryMedia {
  /** Row id from T_USER_STORY_MEDIA — used only for keying lists. */
  id: string;
  /** Media renderer discriminator. Shared posts do not have an uploaded file. */
  type: StoryMediaType;
  /** Full URL for image/video. Empty for a virtual shared-post segment. */
  url: string;
  /** ID of the parent story this segment belongs to. */
  storyId?: string;
  /** Unix seconds — when this specific segment was posted. */
  postedAt?: number;
  /** Canonical source post for a shared-post Story. */
  sourcePostId?: string;
  /** Per-segment copy. Required because one publisher bubble merges many Stories. */
  title?: string;
  description?: string;
}

/**
 * A complete story bubble — one user's worth of segments. Returned by
 * `getStories()` and consumed by both the `StoriesRow` thumbnail rail
 * and the full-screen viewer.
 */
export interface StoryItem {
  /** Primary key of the story row (T_USER_STORY.id). */
  id: string;
  /** Author of this story. */
  publisher: StoryPublisher;
  /** Optional caption shown above the media (max 100 chars server-side). */
  title?: string;
  /** Optional longer description (10–300 chars server-side). */
  description?: string;
  /** Unix seconds — when the user posted the story. */
  postedAt: number;
  /** Unix seconds — when the story auto-deletes (typically posted + 24h). */
  expiresAt: number;
  /** Square 100×100 cover, pre-cropped server-side. */
  thumbnailUrl?: string;
  /** Ordered list of media segments — images come first, then videos. */
  media: StoryMedia[];
  /** Viewer is the story's author — drives the delete affordance. */
  isOwner: boolean;
  /** Viewer has already seen this story (dims the bubble). */
  isViewed: boolean;
  /** Viewer has at least one unseen segment (used by friends-rail). */
  hasUnseen: boolean;
  /** Viewer's current reaction, or null if they haven't reacted. */
  myReaction: ReactionType | null;
  /** Total reaction count across all types. */
  reactionCount: number;
  audience?: ContentAudience;
}

/**
 * Local-only draft used by the create-story composer. Mirrors the
 * `PostPhotoAttachment` shape so the picker → repository path is
 * consistent across modules — the only extra field is `fileType` which
 * tells `create_story.php` whether the uploaded media is an image or a
 * video (required by the PHP endpoint).
 */
export interface StoryMediaUpload {
  uri: string;
  name: string;
  /** MIME type, e.g. 'image/jpeg' or 'video/mp4'. */
  type: string;
  /** Wire-level discriminator that goes into the `file_type` POST field. */
  fileType: 'image' | 'video';
  width?: number;
  height?: number;
  /** Video duration in seconds — used for the client-side 60s cap check. */
  durationSeconds?: number;
}

/**
 * What the composer screen owns while the user picks media + types a
 * caption. Submitted to `repository.createStory()`.
 */
export interface CreateStoryDraft {
  media: StoryMediaUpload;
  audience?: ContentAudience;
  title?: string;
  description?: string;
}

export interface CreateSharedPostStoryDraft {
  sourcePostId: string;
  note?: string;
  audience?: ContentAudience;
}

/**
 * What the repository returns after a successful create. We don't get
 * the freshly-built `StoryItem` back from this endpoint — the PHP
 * response only carries an `api_status` + message — so callers that
 * want the new story to appear in the list should re-fetch via
 * `getStories()` (or optimistically prepend a stub).
 */
export interface CreateStoryResult {
  /** Server-generated story id (T_USER_STORY.id) when the PHP echoes one. */
  storyId?: string;
  message: string;
}
