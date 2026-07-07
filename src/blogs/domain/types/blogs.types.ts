// Blogs domain types
// Port từ: client/src/blogs/domain/types/

export interface BlogCategoryOption {
  id: string;
  label: string;
}

export interface BlogsItem {
  id: string;
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
