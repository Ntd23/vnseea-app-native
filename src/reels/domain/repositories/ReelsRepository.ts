// Description: Repository interface for the reels bounded context.
import type {
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

  /** Toggle save (bookmark) — returns the new state. */
  toggleSave(postId: string): Promise<{ isSaved: boolean }>;

  /** Delete a reel (only works if user is the owner). */
  deleteReel(postId: string): Promise<void>;

  /** Fetch comments for a reel */
  getComments(
    postId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<ReelComment[]>;

  /** Post a text comment on a reel */
  addComment(postId: string, text: string): Promise<ReelComment>;

  /** Search mention or hashtag suggestions while composing a reel caption */
  searchCaptionSuggestions(
    kind: ReelCaptionSuggestionKind,
    query: string,
  ): Promise<ReelCaptionSuggestion[]>;
}
