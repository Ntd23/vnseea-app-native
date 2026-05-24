// Description: Defines shared domain primitives used across bounded contexts.
export type RawRecord = Record<string, unknown>;

export type EntityId = string;

export type MediaKind = 'image' | 'video' | 'file';

export type MediaAsset = {
  url: string;
  kind: MediaKind;
  thumbnailUrl?: string;
  mimeType?: string;
};

export type UserSummary = {
  id?: EntityId;
  username?: string;
  name?: string;
  avatarUrl?: string;
  verified?: boolean;
};

export type PageSummary = {
  id?: EntityId;
  name?: string;
  username?: string;
  avatarUrl?: string;
  coverUrl?: string;
  liked?: boolean;
};

export type GroupSummary = {
  id?: EntityId;
  name?: string;
  username?: string;
  avatarUrl?: string;
  coverUrl?: string;
  joined?: boolean;
};

export type PostSummary = {
  id?: EntityId;
  author?: UserSummary;
  text?: string;
  media?: MediaAsset[];
  createdAt?: string;
};

export type PaginationInput = {
  limit?: number;
  offset?: number;
  afterPostId?: EntityId;
};

export type PaginationPayload = {
  limit?: number;
  offset?: number;
  after_post_id?: EntityId;
};

export type PaginatedResult<TItem> = {
  items: TItem[];
  nextOffset?: number;
  afterPostId?: EntityId;
  hasMore?: boolean;
};

export type ApiState<TData> = {
  data: TData | null;
  isLoading: boolean;
  error: string | null;
};
