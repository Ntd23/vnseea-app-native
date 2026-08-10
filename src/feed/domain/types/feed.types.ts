// Description: Defines feed domain models for posts, media attachments, and feed-specific entities.
// Port from: client/src/feed/domain/types/

import type { ReactionType } from '../../../reels/domain/types/reels.types';
import type { ProductItem } from '../../../product/domain/types/product.types';
import type { EventsItem } from '../../../events/domain/types/events.types';
import type { JobsItem } from '../../../jobs/domain/types/jobs.types';
import type { AudioAttachment } from '../../../shared-kernel/domain/types/audio.types';
import type {
  ContentAudience,
  ContentAudienceWireContract,
} from '../../../shared-kernel/domain/types/contentAudience';

export interface FeedItem {
  id: string | number;
  // TODO: add fields from API response
}

export interface FeedPublisher {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  isFollowing?: boolean;
  /** The public identity that owns the post, not necessarily a user account. */
  entityType?: 'user' | 'page';
  /** Canonical page id when the post was published as a Page. */
  pageId?: string;
  /** Account that manages the Page; never use this as the public post target. */
  ownerId?: string;
}

export interface FeedGroupContext {
  id: string;
  title: string;
  username: string;
  avatarUrl?: string;
  coverUrl?: string;
  url?: string;
  privacy: 'public' | 'private';
}

export interface FeedPostPermissions {
  canDelete: boolean;
  canShare: boolean;
  /** Viewer owns the post (or backend explicitly grants edit permission). */
  canEdit?: boolean;
  /** Set to false when an API snapshot omits both can_share/canShare fields. */
  canShareKnown?: boolean;
}

export type ProfileMediaActivity =
  | 'updated_profile_picture'
  | 'updated_cover_photo';

export interface FeedLiveContext {
  state: 'live' | 'stale' | 'offline';
  streamName?: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  viewerCount?: number;
  startedAt?: number;
}

export interface FeedPostPermissionCarrier {
  permissions?: FeedPostPermissions;
  /** Group identity shown above the member publisher on Home feed cards. */
  groupContext?: FeedGroupContext;
  isAnonymous?: boolean;
  privacyContract?: ContentAudienceWireContract;
  sharedPostId?: string;
  sharedPost?: SharedPostPreviewModel;
  liveContext?: FeedLiveContext;
  activity?: ProfileMediaActivity;
  feeling?: PostFeeling;
  taggedUsers?: PostTaggedUser[];
  location?: PostLocation;
}

export interface PostLinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
}

export type SharedPostPreviewContent =
  | {
      kind: 'text';
      photos: string[];
      audioUrl?: string;
      linkPreview?: PostLinkPreview;
    }
  | {
      kind: 'video';
      videoUrl: string;
      thumbnailUrl?: string;
    }
  | {
      kind: 'live';
      state: FeedLiveContext['state'];
      streamName?: string;
      title: string;
      description?: string;
      thumbnailUrl?: string;
      viewerCount?: number;
    }
  | {
      kind: 'poll';
      question: string;
      options: string[];
    }
  | {
      kind: 'attachment';
      attachmentKind: 'product' | 'event' | 'job' | 'ad';
      title: string;
      subtitle?: string;
      imageUrl?: string;
    };

export interface SharedPostPreviewModel {
  postId: string;
  publisher: FeedPublisher;
  /** Group that owns the source post when a group post is shared elsewhere. */
  groupContext?: FeedGroupContext;
  postedAt?: number;
  privacy: PostPrivacy;
  caption?: string;
  mentionNames?: string[];
  feeling?: PostFeeling;
  taggedUsers?: PostTaggedUser[];
  location?: PostLocation;
  content: SharedPostPreviewContent;
}

// ── Create-post types (Facebook-style composer) ─────────────────────────
//
// WoWonder's `/api/new_post` accepts many fields. The App composer keeps a
// typed subset here so privacy, activity metadata and media stay consistent.

/**
 * Privacy levels mirroring WoWonder's `postPrivacy` numeric field:
 *
 *   public   → 0
 *   friends  → 1
 *   followers → 2
 *   only_me   → 3
 *
 * We use string literals here (not numbers) so the domain stays readable
 * and grep-able. The repository layer is responsible for the mapping.
 */
export type PostPrivacy = ContentAudience;

/**
 * A single photo attached to a draft post. The `uri` is a local
 * `file://...` path coming from the image picker — it gets uploaded via
 * multipart FormData when the user submits, and the server returns a
 * public URL we store in `FeedTextPost.photos`.
 *
 * `name` + `type` are required by React Native's FormData impl —
 * omitting either causes the file to be sent as a string blob.
 */
export interface PostPhotoAttachment {
  uri: string;
  name: string;
  type: string; // MIME, e.g. 'image/jpeg'
  width?: number;
  height?: number;
}

export interface PostVideoAttachment {
  uri: string;
  name: string;
  type: string; // MIME, e.g. 'video/mp4'
  thumbnailUri?: string;
  thumbnailName?: string;
  thumbnailType?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export type PostAudioAttachment = AudioAttachment;

/**
 * Optional "feeling" attached to a post (the FB "đang cảm thấy vui vẻ"
 * row). Maps 1:1 to WoWonder's `feeling_type` + `feeling` POST fields.
 *
 * `type` selects which bucket of feelings the value belongs to:
 *   feelings   → mood emojis (happy, sad, blessed, ...)
 *   traveling  → free-text destination
 *   watching   → movie/show name
 *   playing    → game name
 *   listening  → song/artist
 *
 * `emoji` + `label` are presentational hints — the server only needs
 * `type` + `value`.
 */
export interface PostFeeling {
  type: 'feelings' | 'traveling' | 'watching' | 'playing' | 'listening';
  value: string;
  emoji?: string;
  label?: string;
}

export interface PostTaggedUser {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

export interface PostLocation {
  label: string;
}

export interface FeedMediaGeometry {
  width: number;
  height: number;
  aspectRatio: number;
}

/**
 * The local "draft" the composer screen owns. View-model mutates this as
 * the user types / picks photos / changes privacy. On submit we pass it
 * to the repository which serialises it into FormData.
 */
export interface CreatePostDraft {
  text: string;
  photos: PostPhotoAttachment[];
  audio?: PostAudioAttachment;
  video?: PostVideoAttachment;
  linkPreview?: PostLinkPreview;
  privacy: PostPrivacy;
  isAnonymous?: boolean;
  feeling?: PostFeeling;
  taggedUsers?: PostTaggedUser[];
  location?: PostLocation;
  pageId?: string;
  groupId?: string;
  eventId?: string;
}
/**
 * What the repository returns after a successful create. We always get
 * back the new post itself so the feed can optimistically prepend it —
 * no need for a refetch.
 */
export interface CreatePostResult {
  postId: string;
  post: FeedPost;
}

/**
 * A non-video post (text-only OR text+photos) shown on the home feed.
 * Sibling to `FeedVideoPost` — same publisher / reaction shape, but the
 * media payload is an array of image URLs instead of a single video.
 *
 * `photos.length === 0` → pure text post (FB-style coloured background
 * is a future enhancement, not in MVP).
 */
export interface FeedTextPost extends FeedPostPermissionCarrier {
  /** Discriminator for the `FeedPost` union — see `FeedVideoPost.kind`. */
  kind: 'text';
  id: string;
  caption?: string;
  mentionNames?: string[];
  photos: string[];
  audioUrl?: string;
  postedAt?: number;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  myReaction: ReactionType | null;
  /**
   * Top reaction types sorted by count descending (max 3).
   * Used by the reaction summary row to display stacked emoji badges
   * like Facebook (e.g. 👍❤️😂). Extracted from the WoWonder
   * `reaction` object's per-type counts.
   */
  topReactions: ReactionType[];
  feeling?: PostFeeling;
  privacy: PostPrivacy;
  publisher: FeedPublisher;

  // ── PostDetail-only fields (populated when fetched via getPostById) ──
  viewCount?: number;
  shareCount?: number;
  reactionBreakdown?: Partial<Record<ReactionType, number>>;
  linkPreview?: PostLinkPreview;
  album?: {
    name: string;
    images: string[];
  };
  sharedFrom?: {
    id: string;
    caption?: string;
    mentionNames?: string[];
    isAnonymous?: boolean;
    publisherName: string;
    publisherAvatar?: string;
    postedAt?: number;
    photos?: string[];
  };
  shareUrl?: string;
  isSaved?: boolean;
}

export interface FeedVideoPost extends FeedPostPermissionCarrier {
  /**
   * Discriminator for the `FeedPost` union — lets the UI render the
   * right card type with a single `switch (post.kind)` instead of
   * sniffing other fields.
   */
  kind: 'video';
  id: string;
  caption?: string;
  mentionNames?: string[];
  videoUrl: string;
  thumbnailUrl?: string;
  mediaGeometry?: FeedMediaGeometry;
  postedAt?: number;
  likeCount: number;
  commentCount: number;
  /** True if the viewer has any reaction on the post (love/like/haha/…). */
  isLiked: boolean;
  /**
   * The viewer's current reaction, or `null` if none. Drives the
   * Facebook-style "Thích / Yêu thích / Haha / Wow / Buồn / Phẫn nộ"
   * action-row label + color, and the per-post reaction badge.
   *
   * Sourced from the backend's `reaction.type` when available, falling
   * back to a per-user MMKV cache for installs where the backend doesn't
   * expose reaction state in the posts response.
   */
  myReaction: ReactionType | null;
  /**
   * Top reaction types sorted by count descending (max 3).
   * Same as `FeedTextPost.topReactions` — see its JSDoc.
   */
  topReactions: ReactionType[];
  privacy: PostPrivacy;
  publisher: FeedPublisher;

  // ── PostDetail-only fields (populated when fetched via getPostById) ──
  viewCount?: number;
  shareCount?: number;
  reactionBreakdown?: Partial<Record<ReactionType, number>>;
  linkPreview?: PostLinkPreview;
  sharedFrom?: {
    id: string;
    caption?: string;
    mentionNames?: string[];
    isAnonymous?: boolean;
    publisherName: string;
    publisherAvatar?: string;
    postedAt?: number;
    photos?: string[];
  };
  shareUrl?: string;
  isSaved?: boolean;
}

/**
 * A product post shown on the home feed (Facebook Marketplace-style).
 * Displayed as a card with product image, title, price, and seller info.
 * Links back to a post via `postId` if the product was created as a post.
 */
export interface FeedProductPost extends FeedPostPermissionCarrier {
  kind: 'product';
  id: string;
  product: ProductItem;
  postedAt?: number;
  publisher: FeedPublisher;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  myReaction: ReactionType | null;
  topReactions: ReactionType[];
}

export interface FeedEventPost extends FeedPostPermissionCarrier {
  kind: 'event';
  id: string;
  event: EventsItem;
  postedAt?: number;
  publisher: FeedPublisher;
}

export interface FeedJobPost extends FeedPostPermissionCarrier {
  kind: 'job';
  id: string;
  job: JobsItem;
  postedAt?: number;
  publisher: FeedPublisher;
}

export interface FeedAdPost extends FeedPostPermissionCarrier {
  kind: 'ad';
  id: string;
  adId: string;
  title: string;
  description?: string;
  mediaUrl?: string;
  isVideo: boolean;
  targetUrl?: string;
  appears?: string;
  postedAt?: number;
  publisher: FeedPublisher;
}

/**
 * Poll option with vote counts and percentages
 */
export interface PollOption {
  id: string;
  text: string;
  optionVotes: number;
  percentage: string;
  percentageNum: number;
  all: number;
}

/**
 * A poll post shown on the home feed.
 * Includes question text, options, vote counts, and user's voted option.
 */
export interface FeedPollPost extends FeedPostPermissionCarrier {
  kind: 'poll';
  id: string;
  caption?: string;
  mentionNames?: string[];
  pollQuestion?: string;
  options: PollOption[];
  votedId: string | null; // null = chưa vote, otherwise option id đã vote
  totalVotes: number;
  postedAt?: number;
  likeCount: number;
  privacy: PostPrivacy;
  commentCount: number;
  isLiked: boolean;
  myReaction: ReactionType | null;
  topReactions: ReactionType[];
  publisher: FeedPublisher;
}

/**
 * Unified feed post — anything that can appear in the merged home feed.
 *
 * We render the home screen from a single time-sorted `posts: FeedPost[]`
 * array (Facebook-style). The UI uses `post.kind` to pick the right card
 * component:
 *
 *   if (post.kind === 'video') → <HomeVideoPostCard post={post} />
 *   if (post.kind === 'text')  → <TextPostCard post={post} />
 *   if (post.kind === 'product') → <ProductPostCard product={post.product} />
 *   if (post.kind === 'event') → <EventPostCard event={post.event} />
 *
 * Adding a new post type later (e.g. polls, shares) is just a matter of
 * extending this union with a new `kind` literal — no refactor of the
 * surrounding plumbing needed.
 */
export type FeedPost = (
  | FeedVideoPost
  | FeedTextPost
  | FeedProductPost
  | FeedEventPost
  | FeedJobPost
  | FeedPollPost
  | FeedAdPost
) &
  FeedPostPermissionCarrier;
