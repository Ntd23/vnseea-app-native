// Feed Repository Interface
// Port from: client/src/feed/domain/repositories/

import type { ReactionType } from '../../../reels/domain/types/reels.types';
import type {
  CreatePostDraft,
  CreatePostResult,
  FeedPost,
  FeedTextPost,
  FeedVideoPost,
} from '../types/feed.types';

export interface FeedRepository {
  /**
   * Fetch the unified home feed (videos + text/photo posts merged and
   * sorted by `postedAt` descending — Facebook-style). This is the
   * preferred entry point for the home screen.
   *
   * The legacy split methods (`getVideoPosts`, `getTextPosts`) remain
   * for narrower consumers (e.g. dedicated video-only carousels) but
   * the home feed should call `getAllPosts` so a single API round-trip
   * powers the whole screen.
   */
  getAllPosts(limit?: number): Promise<FeedPost[]>;

  getVideoPosts(limit?: number): Promise<FeedVideoPost[]>;

  /**
   * Add, swap, or clear the viewer's reaction on a video post.
   *
   *   reaction = ReactionType  → add (or swap to) this reaction
   *   reaction = null          → clear any existing reaction
   *
   * Goes through the same `/api/post-actions` endpoint as Reels does
   * — the wire format is numeric '1'..'6', not the human name. The
   * implementation handles the translation.
   */
  setReaction(
    postId: string,
    reaction: ReactionType | null,
  ): Promise<{ reaction: ReactionType | null }>;

  /**
   * Fetch text + photo posts for the home feed (everything that is NOT
   * a video). Uses the same `/api/posts` endpoint as `getVideoPosts`,
   * just filters the response on the client side. Falls back to the
   * viewer's own posts when the news-feed is empty (fresh accounts).
   */
  getTextPosts(limit?: number): Promise<FeedTextPost[]>;

  /**
   * Create a new text / photo post via WoWonder's `/api/new_post`.
   *
   * The draft contains:
   *   - text       → wire field `postText`
   *   - photos[]   → wire field `postPhotos[]` (single OR multi)
   *   - privacy    → wire field `postPrivacy` (0=public, 1=friends, 2=only me)
   *   - feeling    → wire fields `feeling_type` + `feeling`
   *
   * The repository handles the FormData serialisation + privacy
   * mapping. Returns the newly-created post so the view-model can
   * optimistically prepend it to the feed without a refetch.
   */
  createPost(draft: CreatePostDraft): Promise<CreatePostResult>;
}
