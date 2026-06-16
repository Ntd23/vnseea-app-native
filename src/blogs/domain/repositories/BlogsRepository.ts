// Blogs Repository Interface
// Port từ: client/src/blogs/domain/repositories/

import type {
  BlogsItem,
  BlogsListOptions,
  BlogsListPage,
} from '../types/blogs.types';

export interface BlogCreateData {
  title: string;
  content: string;
  description: string;
  category: string;
  tags: string;
  status: 'draft' | 'publish';
  thumbnailFile?: {
    filename?: string;
    type?: string;
    uri: string;
  } | null;
}

export interface BlogCreateResult {
  id: number;
  status: string;
  url: string;
}

export interface BlogsRepository {
  getArticles(options?: BlogsListOptions): Promise<BlogsListPage>;
  getArticleById(blogId: string | number): Promise<BlogsItem>;
  createBlog(data: BlogCreateData): Promise<BlogCreateResult>;
}
