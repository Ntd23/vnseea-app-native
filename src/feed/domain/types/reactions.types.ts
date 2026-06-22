// Description: Domain types for the post reactions list feature.
//
// A `PostReactionUser` is the enriched, view-ready shape returned by
// `FeedRepository.getPostReactions` — one row per user who reacted to
// the post, tagged with the specific reaction they left. The list is
// used by `PostReactionsScreen` to render the "who reacted" tabbed
// screen (Tất cả / Thích / Yêu thích / Haha / Wow / Buồn / Phẫn nộ).
//
// `PostReactionCount` mirrors the per-type count the backend reports
// in the same response — the UI uses these to badge each tab so users
// can see at a glance which emotions dominate the post.
import type { ReactionType } from '../../../reels/domain/types/reels.types';

export interface PostReactionUser {
  /** Numeric/string id the backend assigns to the user. */
  id: string;
  /** Display name (may be composed from `first_name` + `last_name`). */
  name: string;
  /** @handle, used as the secondary line under the display name. */
  username: string;
  /** Absolute URL to the avatar, already normalised through foundation mappers. */
  avatarUrl?: string;
  /** Which reaction the user left on this post. */
  reaction: ReactionType;
  /** True when the viewer is already following this user. Drives the Follow button state. */
  isFollowing: boolean;
}

export interface PostReactionCount {
  reaction: ReactionType;
  count: number;
}