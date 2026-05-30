// Blogs Repository Interface
// Port từ: client/src/blogs/domain/repositories/

import type {
  BlogsItem,
  BlogsListOptions,
  BlogsListPage,
} from '../types/blogs.types';

export interface BlogsRepository {
  getArticles(options?: BlogsListOptions): Promise<BlogsListPage>;
  getArticleById(blogId: string | number): Promise<BlogsItem>;
}
