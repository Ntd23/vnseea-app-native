// Description: Defines blog article, comment, category, and pagination types.

export interface BlogCategoryOption {
  id: string;
  label: string;
}

export interface BlogsItem {
  id: string;
  postId?: string;
  title: string;
  description?: string;
  content?: string;
  thumbnailUrl?: string;
  category?: string;
  categoryId?: string;
  url?: string;
  postedAt?: number;
  postedLabel?: string;
  views?: number;
  author: {
    id: string;
    name: string;
    username?: string;
    avatarUrl?: string;
  };
  raw?: unknown;
}

export interface BlogComment {
  id: string;
  text: string;
  createdAt?: string;
  author: {
    id: string;
    name: string;
    username?: string;
    avatarUrl?: string;
  };
  raw?: unknown;
}

export interface BlogsListOptions {
  limit?: number;
  offset?: string | number | null;
  category?: string | number | null;
  userId?: string | number | null;
}

export interface BlogsListPage {
  items: BlogsItem[];
  categories?: BlogCategoryOption[];
  nextOffset: string | null;
  hasMore: boolean;
}
