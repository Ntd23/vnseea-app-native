// Description: Domain types for the reels bounded context.

import type { AudioAttachment } from '../../../shared-kernel/domain/types/audio.types';
import type {
  ContentAudience,
  ContentAudienceWireContract,
} from '../../../shared-kernel/domain/types/contentAudience';
import type { ReactionType } from '../../../shared-kernel/domain/reactions/reactionCatalog';

export { ALL_REACTION_TYPES } from '../../../shared-kernel/domain/reactions/reactionCatalog';
export type { ReactionType } from '../../../shared-kernel/domain/reactions/reactionCatalog';

/** Publisher info attached to each reel — derived from the post's user_data. */
export interface ReelPublisher {
  userId: string;
  username: string;
  name: string;
  avatarUrl?: string;
  isVerified: boolean;
  isFollowing?: boolean;
  isAdmin?: boolean;
}

export interface ReelsItem {
  /** Backend post id (numeric string) */
  id: string;
  /** Direct URL to the video file (already resolved via Wo_GetMedia) */
  videoUrl?: string;
  /** Optional thumbnail / poster image */
  thumbnailUrl?: string;
  /** Caption / post text (server-side hashtag markup stripped client-side) */
  caption?: string;
  /** Normalized audience; wire values are decoded in the repository. */
  privacy: ContentAudience;
  privacyContract: ContentAudienceWireContract;
  isAnonymous: boolean;
  canShare: boolean;
  /** Unix timestamp (seconds) when posted */
  postedAt?: number;
  /** Publisher (account that posted the reel) */
  publisher: ReelPublisher;
  /** Engagement counts */
  likeCount: number;
  commentCount: number;
  viewCount: number;
  /** Viewer-state flags */
  isLiked: boolean;
  isSaved: boolean;
  /**
   * The current viewer's reaction on this reel, or `null` if they haven't
   * reacted. Drives the colored heart + which emoji is highlighted in the
   * long-press picker.
   *
   * NOTE: This is derived from the post's `reaction.type` field which the
   * backend only populates when the site is configured for rich reactions.
   * On a "simple-like" install this will be `null` even after the user
   * likes, and the heart UI falls back to using `isLiked` as a boolean.
   */
  myReaction: ReactionType | null;
  raw?: any;
}

/** Page of reels returned by the API — `nextCursor` is the id of the last item, used for `after_post_id`. */
export interface ReelsPage {
  items: ReelsItem[];
  /** Pass back as `cursor` to load the next page. `null` means no more pages. */
  nextCursor: string | null;
}

/**
 * A single reel comment.
 *
 * The same shape is used for top-level comments AND for replies — the
 * backend (`Wo_GetPostComment` vs `Wo_GetCommentReply`) returns nearly
 * identical fields. Whether an item is a reply is implied by where it
 * lives (replies are kept in a separate `repliesById` map keyed by
 * parent comment id, not in the top-level `comments` list).
 *
 *   • For top-level comments: `replyCount` is how many replies it has.
 *   • For replies: `replyCount` is always 0 (no nested replies in WoWonder).
 */
export interface ReelComment {
  id: string;
  text: string;
  postedAt?: number;
  publisher: ReelPublisher;
  /** Total reactions on the comment (or simple-likes on legacy installs). */
  likeCount: number;
  /** Only meaningful on top-level comments. Replies always report 0. */
  replyCount: number;
  /** True when the viewer has ANY reaction (or simple-like) on this comment. */
  isLiked: boolean;
  /**
   * The viewer's current reaction on the comment, or `null` if none.
   * Drives the Facebook-style action row (👍 Thích / ❤ Yêu thích / …).
   * Sourced from the backend's `reaction.type` when available, falling
   * back to the per-user MMKV cache for installs that don't expose it.
   */
  myReaction: ReactionType | null;
  /** Viewer is the comment's author — drives edit/delete affordances. */
  owner: boolean;
  /** Viewer owns the parent post — also allowed to delete others' comments. */
  postOwner: boolean;
  /** Optional inline image (`c_file` in WoWonder) — full URL ready to render. */
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  /** Optional audio recording (`record` in WoWonder) ready to play. */
  audioUrl?: string;
  /**
   * Local-only preview URI used while an optimistic comment is uploading.
   * Lets the bubble show the picked image instantly before the server
   * round-trip returns the canonical `imageUrl`. Cleared once the server
   * response replaces the temp comment with the real one.
   */
  pendingImageUri?: string;
  /** Local-only preview URI while an audio comment is uploading. */
  pendingAudioUri?: string;
  /**
   * People explicitly mentioned in the comment text. The composer keeps the
   * friendly display name while the API receives `@username`; this metadata
   * lets the rendered comment restore Facebook-style highlighted, tappable
   * names after the server round-trip.
   */
  mentions?: CommentMention[];
  /**
   * Local reply mention display name. When the reply text starts with this
   * name, the UI renders that leading name in the app brand color.
   */
  replyMentionName?: string;
  /** Local target id used to make a leading reply mention open its profile. */
  replyMentionUserId?: string;
  /** Optimistic update state: true if comment/reply is currently sending */
  isSending?: boolean;
  /** Optimistic update state: true if sending failed */
  isFailed?: boolean;
}

/**
 * A single image attached to a comment or reply draft. The `uri` is a
 * local `file://...` path coming from the image picker — uploaded via
 * multipart FormData (field name `image`) by the comment endpoint
 * (`/api/comments`, action `create` / `create_reply`). On success the
 * server returns the post-CDN URL in `c_file`, surfaced to the UI as
 * `ReelComment.imageUrl`.
 *
 * `name` + `type` are required by React Native's FormData — omitting
 * either causes the file to be sent as an inert string blob.
 */
export interface CommentImageAttachment {
  uri: string;
  name: string;
  type: string; // MIME, e.g. 'image/jpeg'
  width?: number;
  height?: number;
}

export type CommentAudioAttachment = AudioAttachment;

/** Privacy level matching WoWonder postPrivacy values */
export type ReelPrivacy = ContentAudience;

/** Data collected from the user before upload */
export interface ReelDraft {
  /** Local URI of the video file (from image picker) */
  videoUri: string;
  /** MIME type, e.g. "video/mp4" */
  videoType: string;
  /** Original filename */
  videoName: string;
  /** Local URI of thumbnail image (optional) */
  thumbnailUri?: string;
  /** Caption / post text */
  caption?: string;
  /** Audience, defaults to public. */
  privacy: ReelPrivacy;
}

export interface CommentMention {
  userId: string;
  username: string;
  displayName: string;
}

/** Result returned after a successful upload */
export type ReelUploadResult =
  | { status: 'created'; postId: string; postFileUrl: string }
  | { status: 'processing'; message: string }
  | { status: 'review'; message: string };

export type ReelCaptionSuggestionKind = 'mention' | 'hashtag';

export interface ReelCaptionSuggestion {
  id: string;
  kind: ReelCaptionSuggestionKind;
  label: string;
  value: string;
  backendValue?: string;
  subtitle?: string;
  avatarUrl?: string;
  useCount?: number;
}
