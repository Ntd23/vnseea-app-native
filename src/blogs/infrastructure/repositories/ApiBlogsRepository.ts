// Description: Loads real WoWonder blog articles for the Settings article screens.
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { normalizeConfiguredUrl } from '../../../shared-kernel/infrastructure/config/url';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type { BlogsRepository, BlogCreateData, BlogCreateResult } from '../../domain/repositories/BlogsRepository';
import type { BlogCategoryOption, BlogComment, BlogsItem } from '../../domain/types/blogs.types';

type RawRecord = Record<string, unknown>;

type ArticlesResponse = {
  api_status: number | string;
  articles?: RawRecord[];
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

type BlogCommentsResponse = {
  api_status: number | string;
  data?: RawRecord[];
  message?: string;
  errors?: {
    error_text?: string;
  };
};

type BlogDeleteResponse = {
  api_status?: number | string;
  status?: number | string;
  action?: string;
  message?: string;
  errors?: {
    error_text?: string;
  };
};

type BlogPostLookupResponse = {
  api_status: number | string;
  data?: RawRecord[];
};
const BLOG_CATEGORY_OPTIONS: BlogCategoryOption[] = [
  { id: 'vehicles', label: 'Xe c\u1ed9' },
  { id: 'comedy', label: 'H\u00e0i k\u1ecbch' },
  { id: 'business', label: 'Kinh doanh' },
  { id: 'education', label: 'Gi\u00e1o d\u1ee5c' },
  { id: 'entertainment', label: 'Gi\u1ea3i tr\u00ed' },
  { id: 'movies', label: 'Phim \u1ea3nh' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'history', label: 'L\u1ecbch s\u1eed' },
  { id: 'lifestyle', label: '\u0110\u1eddi s\u1ed1ng' },
  { id: 'nature', label: 'Thi\u00ean nhi\u00ean' },
  { id: 'news', label: 'Tin t\u1ee9c' },
  { id: 'people', label: 'Con ng\u01b0\u1eddi' },
  { id: 'pets', label: 'Th\u00fa c\u01b0ng' },
  { id: 'places', label: '\u0110\u1ecba \u0111i\u1ec3m' },
  { id: 'science', label: 'Khoa h\u1ecdc' },
  { id: 'sports', label: 'Th\u1ec3 thao' },
  { id: 'travel', label: 'Du l\u1ecbch' },
  { id: 'other', label: 'Kh\u00e1c' },
];

const blogCategoryValueToId: Record<string, number> = {
  vehicles: 2,
  comedy: 3,
  business: 4,
  education: 5,
  entertainment: 6,
  movies: 7,
  gaming: 8,
  history: 9,
  lifestyle: 10,
  nature: 11,
  news: 12,
  people: 13,
  pets: 14,
  places: 15,
  science: 16,
  sports: 17,
  travel: 18,
  other: 1,
};

const blogCategoryIdToValue: Record<string, string> = Object.fromEntries(
  Object.entries(blogCategoryValueToId).map(([value, id]) => [String(id), value]),
);

function normalizeCategoryForApi(category?: string | number | null) {
  const value = String(category ?? '').trim();

  if (!value || value === 'all') {
    return undefined;
  }

  return blogCategoryValueToId[value]
    ? String(blogCategoryValueToId[value])
    : value;
}

function readString(raw: RawRecord | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = raw?.[key];
    if (typeof value === 'string' && value.length > 0) return value;
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function readArticleCategoryAlias(raw: RawRecord | undefined) {
  const category = readString(raw, 'category_id', 'category_key', 'category_raw') || readString(raw, 'category');
  const normalized = category.toLowerCase();

  if (blogCategoryIdToValue[normalized]) {
    return blogCategoryIdToValue[normalized];
  }

  if (blogCategoryValueToId[normalized]) {
    return normalized;
  }

  return 'other';
}

function readArticleCategoryLabel(raw: RawRecord | undefined, categoryAlias: string) {
  const backendLabel = readString(raw, 'category_name') || readString(raw, 'category');
  const backendLabelIsNumeric = backendLabel.length > 0 && /^\d+$/.test(backendLabel);
  const categoryOption = BLOG_CATEGORY_OPTIONS.find(category => category.id === categoryAlias);

  return backendLabel && !backendLabelIsNumeric
    ? backendLabel
    : categoryOption?.label || '';
}

function readArticleThumbnail(raw: RawRecord | undefined) {
  return normalizeUrl(
    readString(
      raw,
      'thumbnail',
      'thumbnail_url',
      'thumbnail_full',
      'image',
      'image_url',
      'cover',
      'cover_url',
      'postFileThumb',
      'postFile',
    ),
  ) || undefined;
}

function readNumber(raw: RawRecord | undefined, ...keys: string[]) {
  for (const key of keys) {
    const number = Number(raw?.[key]);
    if (Number.isFinite(number)) return number;
  }
  return undefined;
}

function normalizeUrl(url: string) {
  return normalizeConfiguredUrl(url) ?? '';
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

function mapBlogComment(raw: RawRecord | undefined): BlogComment {
  const user = (raw?.user_data as RawRecord | undefined) ?? (raw?.publisher as RawRecord | undefined) ?? {};
  const firstName = readString(user, 'first_name');
  const lastName = readString(user, 'last_name');
  const username = readString(user, 'username');
  const name =
    firstName ||
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    readString(user, 'name') ||
    username ||
    'Ng\u01b0\u1eddi d\u00f9ng';

  return {
    id: readString(raw, 'id', 'comment_id'),
    text: cleanText(readString(raw, 'Orginaltext', 'text', 'comment')),
    createdAt: readString(raw, 'time_text', 'time') || undefined,
    author: {
      id: readString(user, 'user_id', 'id'),
      name,
      username: username || undefined,
      avatarUrl: normalizeUrl(readString(user, 'avatar_full', 'avatar')) || undefined,
    },
    raw,
  };
}
function mapArticle(raw: RawRecord | undefined): BlogsItem {
  const author = (raw?.author as RawRecord | undefined) ?? {};
  const firstName = readString(author, 'first_name');
  const lastName = readString(author, 'last_name');
  const username = readString(author, 'username');
  const name =
    firstName ||
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    readString(author, 'name') ||
    username ||
    'Ng\u01b0\u1eddi d\u00f9ng';
  const categoryAlias = readArticleCategoryAlias(raw);
  const categoryLabel = readArticleCategoryLabel(raw, categoryAlias);

  return {
    id: readString(raw, 'id', 'blog_id'),
    postId: readString(raw, 'post_id', 'postId', 'post'),
    title: cleanText(readString(raw, 'title')) || 'B\u00e0i vi\u1ebft',
    description: cleanText(readString(raw, 'description')) || undefined,
    content: cleanText(readString(raw, 'content')) || undefined,
    thumbnailUrl: readArticleThumbnail(raw),
    category: categoryLabel || undefined,
    categoryId: categoryAlias,
    url: normalizeUrl(readString(raw, 'url')) || undefined,
    postedAt: readNumber(raw, 'posted'),
    postedLabel: readString(raw, 'time_text', 'posted') || undefined,
    views: readNumber(raw, 'view', 'views') ?? 0,
    author: {
      id: readString(author, 'user_id', 'id'),
      name,
      username: username || undefined,
      avatarUrl: normalizeUrl(readString(author, 'avatar_full', 'avatar')) || undefined,
    },
    raw,
  };
}

function isSuccess(status: number | string | undefined) {
  return status === 200 || status === '200';
}

function mapError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('Article not found')) return 'Kh\u00f4ng t\u00ecm th\u1ea5y b\u00e0i vi\u1ebft.';
  return message || 'Kh\u00f4ng th\u1ec3 t\u1ea3i b\u00e0i vi\u1ebft. Vui l\u00f2ng th\u1eed l\u1ea1i.';
}

async function findPostIdForBlog(blogId: string | number) {
  const currentUserId = sessionStorage.getSession()?.userId;

  if (!currentUserId) {
    return '';
  }

  const response = await apiBridge.post<BlogPostLookupResponse>(
    apiRoutes.feed.posts,
    {
      type: 'get_user_posts',
      id: currentUserId,
      limit: 50,
    },
  );

  if (!isSuccess(response.api_status) || !Array.isArray(response.data)) {
    return '';
  }

  const matched = response.data.find(post => (
    String(readString(post, 'blog_id')) === String(blogId)
  ));

  return matched ? readString(matched, 'post_id', 'id') : '';
}

export function createBlogsRepository(): BlogsRepository {
  return {
    async getCategories() {
      return [...BLOG_CATEGORY_OPTIONS];
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
            category: normalizeCategoryForApi(options.category),
            user_id: options.userId ? String(options.userId) : undefined,
          },
        );
        console.log('[ApiBlogsRepository] getArticles response:', response);

        if (!isSuccess(response.api_status)) {
          throw new Error(
            response.errors?.error_text ||
              response.message ||
              'Kh\u00f4ng th\u1ec3 t\u1ea3i danh s\u00e1ch b\u00e0i vi\u1ebft.',
          );
        }

        const rawArticles = Array.isArray(response.articles)
          ? response.articles
          : [];
        const items = rawArticles.map(mapArticle).filter(article => article.id);
        const lastArticle = items[items.length - 1];

        return {
          items,
          categories: [...BLOG_CATEGORY_OPTIONS],
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
              'Kh\u00f4ng t\u00ecm th\u1ea5y b\u00e0i vi\u1ebft.',
          );
        }

        return mapArticle(response.data);
      } catch (error) {
        console.warn('[ApiBlogsRepository] get article failed', error);
        throw new Error(mapError(error));
      }
    },

    async getBlogComments(blogId) {
      try {
        const response = await apiBridge.post<BlogCommentsResponse>(
          apiRoutes.blogs.comments,
          {
            type: 'get_comments',
            blog_id: String(blogId),
            limit: '20',
          },
        );

        if (!isSuccess(response.api_status)) {
          throw new Error(
            response.errors?.error_text ||
              response.message ||
              'Kh\u00f4ng th\u1ec3 t\u1ea3i b\u00ecnh lu\u1eadn.',
          );
        }

        return Array.isArray(response.data)
          ? response.data.map(mapBlogComment).filter(comment => comment.id)
          : [];
      } catch (error) {
        console.warn('[ApiBlogsRepository] get blog comments failed', error);
        return [];
      }
    },

    async addBlogComment(blogId, text) {
      const response = await apiBridge.post<BlogCommentsResponse>(
        apiRoutes.blogs.comments,
        {
          type: 'add_comment',
          blog_id: String(blogId),
          text,
        },
      );

      if (!isSuccess(response.api_status)) {
        throw new Error(
          response.errors?.error_text ||
            response.message ||
            'Kh\u00f4ng th\u1ec3 g\u1eedi b\u00ecnh lu\u1eadn.',
        );
      }

      const comment = Array.isArray(response.data) ? response.data[0] : undefined;

      if (!comment) {
        throw new Error('Kh\u00f4ng th\u1ec3 g\u1eedi b\u00ecnh lu\u1eadn.');
      }

      return mapBlogComment(comment);
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
            blog_category: normalizeCategoryForApi(data.category) || data.category,
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
              blog_category: normalizeCategoryForApi(data.category) || data.category,
              blog_tags: data.tags,
              status: data.status,
            },
          );
        }

        if (!isSuccess(response.api_status)) {
          throw new Error(
            response.errors?.error_text ||
              'Kh\u00f4ng th\u1ec3 t\u1ea1o b\u00e0i vi\u1ebft. Vui l\u00f2ng th\u1eed l\u1ea1i.',
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
          error instanceof Error ? error.message : 'Kh\u00f4ng th\u1ec3 t\u1ea1o b\u00e0i vi\u1ebft.',
        );
      }
    },
    async deleteBlog(blogId, postId): Promise<void> {
      const normalizedPostId = postId ? String(postId) : await findPostIdForBlog(blogId);

      if (normalizedPostId) {
        const response = await apiBridge.post<BlogDeleteResponse>(
          apiRoutes.feed.postActions,
          {
            action: 'delete',
            post_id: normalizedPostId,
          },
        );

        if (response.action === 'deleted') {
          return;
        }

        throw new Error(
          response.errors?.error_text ||
            response.message ||
            'Kh\u00f4ng th\u1ec3 x\u00f3a b\u00e0i vi\u1ebft.',
        );
      }

      const response = await apiBridge.post<BlogDeleteResponse>(
        apiRoutes.blogs.delete,
        {
          id: String(blogId),
          blog_id: String(blogId),
        },
      );

      if (isSuccess(response.api_status) || response.status === 200 || response.status === '200') {
        return;
      }

      throw new Error(
        response.errors?.error_text ||
          response.message ||
          'Kh\u00f4ng th\u1ec3 x\u00f3a b\u00e0i vi\u1ebft.',
      );
    },
  };
}
