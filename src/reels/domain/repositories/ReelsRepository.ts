// Description: Repository interface for the reels bounded context.
import type {
  ReactionType,
  ReelCaptionSuggestion,
  ReelCaptionSuggestionKind,
  ReelComment,
  ReelDraft,
  ReelUploadResult,
  ReelsItem,
  ReelsPage,
} from '../types/reels.types';

export interface FetchReelsOptions {
  /** Page size — default 10 on the backend */
  limit?: number;
  /** Pass `nextCursor` from a previous page to load older items */
  cursor?: string | null;
  /** When set, only return reels posted by this user id */
  publisherId?: string;
}

export interface ReelsRepository {
  /** Upload a new reel video post */
  createReel(draft: ReelDraft): Promise<ReelUploadResult>;

  /** Fetch a page of reels (TikTok-style infinite feed). */
  fetchReels(options?: FetchReelsOptions): Promise<ReelsPage>;

  /**
   * @deprecated Use `fetchReels` for paginated feed. Kept for backward compatibility.
   * Returns the first page only.
   */
  getReels(): Promise<ReelsItem[]>;

  /** Toggle like — returns the new state + updated like count. */
  toggleLike(postId: string): Promise<{ isLiked: boolean; likeCount: number }>;

  /**
   * Set or clear the viewer's reaction on a reel.
   *
   *   • `reaction = ReactionType` → add (or swap to) that reaction
   *   • `reaction = null` → clear any existing reaction
   *
   * The WoWonder `/api/v2/post-actions` endpoint with `action=reaction` is
   * stateful: calling it without a `reaction` POST param deletes whatever
   * reaction the user currently has. That's the ONLY way to fully clear,
   * so callers must pass `null` explicitly rather than calling with the
   * same reaction twice (which would re-add it).
   */
  setReaction(
    postId: string,
    reaction: ReactionType | null,
  ): Promise<{ reaction: ReactionType | null }>;

  /** Toggle save (bookmark) — returns the new state. */
  toggleSave(postId: string): Promise<{ isSaved: boolean }>;

  /** Delete a reel (only works if user is the owner). */
  deleteReel(postId: string): Promise<void>;

  /**
   * Fetch a page of top-level comments for a reel.
   *
   * Pagination uses a comment-id cursor, not a row offset: the backend
   * applies `WHERE id > offset ORDER BY id ASC LIMIT n`, so callers must
   * pass the highest id from the previous page (NOT the count of items
   * already loaded).
   */
  getComments(
    postId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<ReelComment[]>;

  /** Post a text comment on a reel. */
  addComment(postId: string, text: string): Promise<ReelComment>;

  /**
   * Toggle the viewer's simple-like on a comment (legacy `comment_like`
   * endpoint). Kept for compatibility — the UI prefers `setCommentReaction`
   * which goes through the richer reactions table.
   */
  toggleCommentLike(commentId: string): Promise<{ isLiked: boolean }>;

  /**
   * Add, swap, or clear a reaction on a comment (Facebook-style picker).
   *
   *   reaction = ReactionType  → add (or swap to) this reaction
   *   reaction = null          → clear any existing reaction
   *
   * Note: the WoWonder server has a quirk — `reaction_comment` only
   * deletes when no `reaction` param is sent AND the viewer already has
   * one. Toggling to the same reaction effectively re-adds it.
   */
  setCommentReaction(
    commentId: string,
    reaction: ReactionType | null,
  ): Promise<{ reaction: ReactionType | null }>;

  /** Delete a comment (must be owner or post owner — server enforces). */
  deleteComment(commentId: string): Promise<void>;

  /** Edit the text of a comment the viewer owns. */
  editComment(commentId: string, text: string): Promise<void>;

  /**
   * Fetch a page of replies for a comment. Same cursor rules as
   * `getComments` — `offset` is the highest reply id from the previous
   * page.
   */
  fetchReplies(
    commentId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<ReelComment[]>;

  /** Post a reply on a comment. */
  addReply(commentId: string, text: string): Promise<ReelComment>;

  /** Search mention or hashtag suggestions while composing a reel caption */
  searchCaptionSuggestions(
    kind: ReelCaptionSuggestionKind,
    query: string,
  ): Promise<ReelCaptionSuggestion[]>;
}
