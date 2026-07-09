// Description: Defines blog repository operations for articles, comments, and authoring.

import type {
  BlogsItem,
  BlogComment,
  BlogCategoryOption,
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
  getCategories(): Promise<BlogCategoryOption[]>;
  getArticles(options?: BlogsListOptions): Promise<BlogsListPage>;
  getArticleById(blogId: string | number): Promise<BlogsItem>;
  getBlogComments(blogId: string | number): Promise<BlogComment[]>;
  addBlogComment(blogId: string | number, text: string): Promise<BlogComment>;
  createBlog(data: BlogCreateData): Promise<BlogCreateResult>;
  deleteBlog(blogId: string | number, postId?: string | number | null): Promise<void>;
}
