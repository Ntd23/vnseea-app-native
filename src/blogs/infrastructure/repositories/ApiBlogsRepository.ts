// Description: Loads real WoWonder blog articles for the Settings article screens.
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import type { BlogsRepository, BlogCreateData, BlogCreateResult } from '../../domain/repositories/BlogsRepository';
import type { BlogCategoryOption, BlogsItem } from '../../domain/types/blogs.types';

type RawRecord = Record<string, unknown>;

type ArticlesResponse = {
  api_status: number | string;
  articles?: RawRecord[];
  blog_categories?: Record<string, unknown> | unknown[];
  message?: string;
  errors?: {
    error_text?: string;
  };
};

type ArticleDetailResponse = {
  api_status: number | string;
  data?: RawRecord;
  message?: string;
  errors?: {
    error_text?: string;
  };
};

const siteRoot = apiConfig.webBaseUrl.replace(/\/+$/, '');

function readString(raw: RawRecord | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = raw?.[key];
    if (typeof value === 'string' && value.length > 0) return value;
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function readNumber(raw: RawRecord | undefined, ...keys: string[]) {
  for (const key of keys) {
    const number = Number(raw?.[key]);
    if (Number.isFinite(number)) return number;
  }
  return undefined;
}

function normalizeUrl(url: string) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${siteRoot}/${url.replace(/^\/+/, '')}`;
}

function cleanText(text: string) {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

function mapArticle(raw: RawRecord | undefined): BlogsItem {
  const author = (raw?.author as RawRecord | undefined) ?? {};
  const firstName = readString(author, 'first_name');
  const lastName = readString(author, 'last_name');
  const username = readString(author, 'username');
  const name =
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    readString(author, 'name') ||
    username ||
    'Người dùng';

  return {
    id: readString(raw, 'id', 'blog_id'),
    title: cleanText(readString(raw, 'title')) || 'Bài viết',
    description: cleanText(readString(raw, 'description')) || undefined,
    content: cleanText(readString(raw, 'content')) || undefined,
    thumbnailUrl: normalizeUrl(readString(raw, 'thumbnail')) || undefined,
    category:
      readString(raw, 'category_name') || readString(raw, 'category') || undefined,
    categoryId: readString(raw, 'category_id') || undefined,
    url: normalizeUrl(readString(raw, 'url')) || undefined,
    postedAt: readNumber(raw, 'posted'),
    postedLabel: readString(raw, 'time_text', 'posted') || undefined,
    views: readNumber(raw, 'view', 'views') ?? 0,
    author: {
      id: readString(author, 'user_id', 'id'),
      name,
      username: username || undefined,
      avatarUrl: normalizeUrl(readString(author, 'avatar')) || undefined,
    },
    raw,
  };
}

function isSuccess(status: number | string | undefined) {
  return status === 200 || status === '200';
}

function mapError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('Article not found')) return 'Không tìm thấy bài viết.';
  return message || 'Không thể tải bài viết. Vui lòng thử lại.';
}

export function createBlogsRepository(): BlogsRepository {
  return {
    async getCategories() {
      if (cachedBlogCategories.length > 0) {
        return cachedBlogCategories;
      }

      try {
        const response = await apiBridge.post<ArticlesResponse>(
          apiRoutes.blogs.get,
          { limit: 1 },
        );

        if (!isSuccess(response.api_status)) {
          throw new Error(
            response.errors?.error_text ||
              response.message ||
              'Unable to load blog categories.',
          );
        }

        const rawArticles = Array.isArray(response.articles)
          ? response.articles
          : [];
        const items = rawArticles.map(mapArticle).filter(article => article.id);
        const categories = normalizeBlogCategories(response.blog_categories);
        updateCachedCategories(categories.length > 0 ? categories : categoriesFromArticles(items));
        return cachedBlogCategories;
      } catch (error) {
        console.warn('[ApiBlogsRepository] get categories failed', error);
        return cachedBlogCategories;
      }
    },
    async getArticles(options = {}) {
      const limit = options.limit ?? 20;

      try {
        console.log('[ApiBlogsRepository] getArticles called with:', options);
        const response = await apiBridge.post<ArticlesResponse>(
          apiRoutes.blogs.get,
          {
            limit,
            offset: options.offset ? String(options.offset) : undefined,
            category: options.category
              ? String(options.category)
              : undefined,
            user_id: options.userId ? String(options.userId) : undefined,
          },
        );
        console.log('[ApiBlogsRepository] getArticles response:', response);

        if (!isSuccess(response.api_status)) {
          throw new Error(
            response.errors?.error_text ||
              response.message ||
              'Không thể tải danh sách bài viết.',
          );
        }

        const rawArticles = Array.isArray(response.articles)
          ? response.articles
          : [];
        const items = rawArticles.map(mapArticle).filter(article => article.id);
        const categories = normalizeBlogCategories(response.blog_categories);
        updateCachedCategories(categories.length > 0 ? categories : categoriesFromArticles(items));
        const lastArticle = items[items.length - 1];

        return {
          items,
          categories: cachedBlogCategories,
          nextOffset: lastArticle?.id || null,
          hasMore: rawArticles.length >= limit && Boolean(lastArticle?.id),
        };
      } catch (error) {
        console.warn('[ApiBlogsRepository] get articles failed', error);
        throw new Error(mapError(error));
      }
    },

    async getArticleById(blogId) {
      try {
        console.log('[ApiBlogsRepository] getArticleById called with:', blogId);
        const response = await apiBridge.post<ArticleDetailResponse>(
          apiRoutes.blogs.getById,
          {
            blog_id: String(blogId),
          },
        );

        console.log('[ApiBlogsRepository] getArticleById response:', response);

        if (!isSuccess(response.api_status) || !response.data) {
          throw new Error(
            response.errors?.error_text ||
              response.message ||
              'Không tìm thấy bài viết.',
          );
        }

        return mapArticle(response.data);
      } catch (error) {
        console.warn('[ApiBlogsRepository] get article failed', error);
        throw new Error(mapError(error));
      }
    },

    async createBlog(data: BlogCreateData): Promise<BlogCreateResult> {
      try {
        let response;
        
        if (data.thumbnailFile && data.thumbnailFile.uri) {
          // Use multipart for file upload
          const multipartBody: Record<string, unknown> = {
            blog_title: data.title,
            blog_content: data.content,
            blog_description: data.description,
            blog_category: data.category,
            blog_tags: data.tags,
            status: data.status,
          };

          // Add thumbnail file if available
          multipartBody.thumbnail = {
            uri: data.thumbnailFile.uri,
            name: data.thumbnailFile.filename || `thumbnail_${Date.now()}.jpg`,
            type: data.thumbnailFile.type || 'image/jpeg',
          };

          response = await apiBridge.multipart<{
            api_status: number | string;
            blog_id?: number | string;
            status?: string;
            url?: string;
            errors?: {
              error_text?: string;
            };
          }>(
            apiRoutes.blogs.create || 'create-blog',
            multipartBody,
          );
        } else {
          // Use regular POST for no file
          response = await apiBridge.post<{
            api_status: number | string;
            blog_id?: number | string;
            status?: string;
            url?: string;
            errors?: {
              error_text?: string;
            };
          }>(
            apiRoutes.blogs.create || 'create-blog',
            {
              blog_title: data.title,
              blog_content: data.content,
              blog_description: data.description,
              blog_category: data.category,
              blog_tags: data.tags,
              status: data.status,
            },
          );
        }

        if (!isSuccess(response.api_status)) {
          throw new Error(
            response.errors?.error_text ||
              'Không thể tạo bài viết. Vui lòng thử lại.',
          );
        }

        return {
          id: Number(response.blog_id ?? 0),
          status: response.status ?? 'published',
          url: response.url ?? '',
        };
      } catch (error) {
        console.warn('[ApiBlogsRepository] create blog failed', error);
        throw new Error(
          error instanceof Error ? error.message : 'Không thể tạo bài viết.',
        );
      }
    },
  };
}
