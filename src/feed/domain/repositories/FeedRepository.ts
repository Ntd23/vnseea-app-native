// Description: Declares feed repository contracts for source-filtered home feed loading and post actions.
// Port from: client/src/feed/domain/repositories/

import type { ReactionType } from '../../../reels/domain/types/reels.types';
import type {
  CreatePostDraft,
  CreatePostResult,
  FeedPollPost,
  FeedPost,
  FeedTextPost,
  FeedVideoPost,
} from '../types/feed.types';

export type FeedSource = 'all' | 'following';
export type FeedShareDestination = 'timeline' | 'page' | 'group' | 'message';
export type FeedRecommendationEvent =
  | 'impression'
  | 'click'
  | 'reaction'
  | 'comment'
  | 'share'
  | 'video_watch'
  | 'hide'
  | 'report'
  | 'hashtag';

export interface SharePostInput {
  postId: string;
  destination: FeedShareDestination;
  text?: string;
  userId?: string;
  pageId?: string;
  groupId?: string;
  /**
   * For `destination: 'message'` — the user the post will be sent
   * to as a chat message. We pass this through to the chat
   * `send-message` endpoint as `user_id` (or as `id` for group
   * chats). The wire format is the same as the existing
   * `sendMessage` call in `ApiMessagesRepository`.
   */
  recipientUserId?: string;
}

export interface FeedRecommendationEventInput {
  event: FeedRecommendationEvent;
  postId?: string;
  value?: string;
  durationMs?: number;
}

export interface FeedPostsPage<TPost extends FeedPost = FeedPost> {
  posts: TPost[];
  nextCursor?: string;
  reachedEnd: boolean;
}

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
  getAllPosts(
    limit?: number,
    afterPostId?: string,
    source?: FeedSource,
  ): Promise<FeedPost[]>;

  /**
   * Fetch only lightweight feed posts (text/photo/poll/ad). Home uses this
   * first so the user sees content before heavier video/media pages finish.
   */
  getLightPosts(
    limit?: number,
    afterPostId?: string,
    source?: FeedSource,
  ): Promise<FeedPost[]>;

  /**
   * Cursor-aware variant used by Home. The cursor is derived from the
   * primary news-feed stream, not from the last rendered item, because
   * Home mixes discovery/live/product/video cards into the visible list.
   */
  getLightPostsPage(
    limit?: number,
    afterPostId?: string,
    source?: FeedSource,
  ): Promise<FeedPostsPage>;

  getVideoPosts(
    limit?: number,
    afterPostId?: string,
    source?: FeedSource,
  ): Promise<FeedVideoPost[]>;

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
  getTextPosts(
    limit?: number,
    afterPostId?: string,
    source?: FeedSource,
  ): Promise<FeedTextPost[]>;

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
  getUserPosts(
    userId: string,
    limit?: number,
    afterPostId?: string,
  ): Promise<FeedPost[]>;

  getPagePosts(
    pageId: string,
    limit?: number,
    afterPostId?: string,
  ): Promise<FeedPostsPage<FeedTextPost | FeedVideoPost | FeedPollPost>>;

  /**
   * Fetch text/photo posts that contain a hashtag. Uses WoWonder's
   * `/api/posts` endpoint with `type=hashtag` and `hash=<tag>`.
   */
  getHashtagPosts(
    tag: string,
    limit?: number,
    afterPostId?: string,
  ): Promise<FeedTextPost[]>;

  /**
   * Best-effort event tracking for the recommendation ranker. This must never
   * block or break feed rendering; implementations should swallow API errors.
   */
  recordRecommendationEvent(input: FeedRecommendationEventInput): Promise<void>;

  /**
   * Toggle save/unsave a post via WoWonder's post-actions endpoint.
   * Returns { saved: true } when the post was saved, { saved: false } when it was unsaved.
   */
  savePost(postId: string): Promise<{ saved: boolean }>;

  /**
   * Toggle report/unreport a post via WoWonder's post-actions endpoint.
   * Returns { reported: true } when the post was reported, { reported: false } when unreported.
   */
  reportPost(postId: string): Promise<{ reported: boolean }>;

  /**
   * Share an existing post internally to timeline, an owned page, or an owned group.
   * Uses WoWonder's `/api/posts` share_post_on_* actions.
   */
  sharePost(input: SharePostInput): Promise<FeedPost>;

  /**
   * Fetch a single post by id with its comments, used by the PostDetail
   * screen. Calls the public `get-post-data` endpoint, which the
   * backend wires through `Wo_PostData($post_id)` — same shape the
   * feed-list endpoint returns, so the existing mapper works as-is.
   *
   * Returns the post plus the freshly fetched comments. Comments are
   * kept separate (not merged into the post) so the detail screen can
   * paginate them independently of the post body.
   */
  getPostById(
    postId: string,
    options?: { fetchComments?: boolean; addView?: boolean },
  ): Promise<GetPostByIdResult>;
}

export interface GetPostByIdResult {
  post: FeedPost;
  comments: PostComment[];
}

export interface PostComment {
  id: string;
  text: string;
  postedAt?: number;
  publisher: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string;
  };
  likeCount: number;
  isLiked: boolean;
}
