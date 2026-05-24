// Description: Domain types for the reels bounded context.

/** Publisher info attached to each reel — derived from the post's user_data. */
export interface ReelPublisher {
  userId: string;
  username: string;
  name: string;
  avatarUrl?: string;
  isVerified: boolean;
  isFollowing?: boolean;
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
  /** Privacy level (0=public, 1=friends, 2=only me) */
  privacy?: number;
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
}

/** Page of reels returned by the API — `nextCursor` is the id of the last item, used for `after_post_id`. */
export interface ReelsPage {
  items: ReelsItem[];
  /** Pass back as `cursor` to load the next page. `null` means no more pages. */
  nextCursor: string | null;
}

/** A single reel comment */
export interface ReelComment {
  id: string;
  text: string;
  postedAt?: number;
  publisher: ReelPublisher;
  likeCount: number;
  replyCount: number;
  isLiked: boolean;
  owner: boolean;
  postOwner: boolean;
}

/** Privacy level matching WoWonder postPrivacy values */
export type ReelPrivacy = 0 | 1 | 2 | 3 | 4;

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
  /** Privacy level, defaults to 0 (public) */
  privacy?: ReelPrivacy;
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
