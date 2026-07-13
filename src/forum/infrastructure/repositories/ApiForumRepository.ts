// Description: Maps the existing forum API to catalog, member, search, thread, and reply domain operations.
// Port từ: client/src/forum/infrastructure/repositories/

import type { ForumRepository } from '../../domain/repositories/ForumRepository';
import type {
  ForumCatalog,
  ForumCatalogQuery,
  ForumMember,
  ForumMemberList,
  ForumMemberQuery,
  ForumMutationResult,
  ForumReplyPayload,
  ForumThreadDetail,
  ForumThreadList,
  ForumThreadPayload,
  ForumThreadQuery,
  ForumSearchQuery,
  ForumSearchResult,
} from '../../domain/types/forum.types';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';

type BackendForumResponse = {
  api_status?: number | string;
  can_create?: boolean;
  sections?: any[];
  search_sections?: any[];
  forum?: any;
  threads?: any[];
  thread?: any;
  reply?: any;
  replies?: any[];
  members?: any[];
  total_members?: number | string;
  has_more?: boolean;
  next_offset?: number | string | null;
  errors?: {
    error_text?: string;
  };
};

const asString = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';

const asNumber = (value: unknown): number => {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
};

const asBoolean = (value: unknown): boolean =>
  value === true || value === 1 || value === '1' || value === 'true';

const stripHtml = (value: string): string =>
  value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const stripForumMarkup = (value: string): string =>
  stripHtml(
    value
      .replace(/\[(\/)?[a-z]+(?:=[^\]]+)?\]/gi, ' ')
      .replace(/&nbsp;/g, ' '),
  );

const createInitials = (value: string, fallback = 'VN'): string => {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('');

  return initials || fallback;
};

const formatBackendTimestamp = (value: unknown): string => {
  const numeric = asNumber(value);

  if (!numeric) {
    return asString(value);
  }

  const timestamp = numeric > 9999999999 ? numeric : numeric * 1000;
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return asString(value);
  }

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const mapForum = (item: any, sectionId: number) => ({
  id: asNumber(item.id),
  sectionId,
  title: asString(item.name_lang || item.name),
  description: asString(item.description_lang || item.description),
  posts: asNumber(item.posts),
  url: `/forum?fid=${asNumber(item.id)}`,
});

const mapSection = (item: any) => {
  const id = asNumber(item.id);

  return {
    id,
    title: asString(item.section_name_lang || item.section_name),
    description: asString(item.description_lang || item.description),
    forums: Array.isArray(item.forums)
      ? item.forums.map((forum: any) => mapForum(forum, id))
      : [],
  };
};

const mapMember = (item: any): ForumMember => ({
  id: asNumber(item.user_id || item.id),
  username: asString(item.username),
  name: asString(item.name || item.first_name) || asString(item.username),
  avatarUrl: asString(item.avatar),
  joined: asNumber(item.joined),
  lastSeen: asNumber(item.lastseen),
  postCount: asNumber(item.forum_posts),
  referrals: asNumber(item.referrer),
  isAdmin: asBoolean(item.admin),
});

const mapReply = (item: any) => {
  const user = (item.user_data ?? {}) as any;
  const author = asString(user.name || user.username) || 'Member';

  return {
    id: asNumber(item.id),
    threadId: asNumber(item.thread_id),
    forumId: asNumber(item.forum_id),
    author,
    authorAvatarUrl: asString(user.avatar),
    authorUrl: asString(user.url),
    initials: createInitials(author),
    role: asString(user.working || user.school || user.username) || author,
    subject: stripForumMarkup(asString(item.post_subject)),
    message: stripForumMarkup(asString(item.post_text)),
    time: formatBackendTimestamp(item.posted_time),
    canManage: asBoolean(item.is_owner) || asBoolean(item.is_admin),
    accepted: false,
  };
};

const mapThread = (item: any) => {
  const user = (item.user_data ?? {}) as any;
  const forum = (item.forum_data || item.forum) as any;
  const author = asString(user.name || user.username) || 'Member';
  const title = stripForumMarkup(asString(item.orginal_headline || item.headline));
  const body = stripForumMarkup(asString(item.post));
  const forumId = asNumber(item.forum || item.forum_id);
  const replies = Array.isArray(item.threadreplies)
    ? item.threadreplies.map((reply: any) => mapReply(reply))
    : [];

  return {
    id: asNumber(item.id),
    forumId,
    title,
    section: 'support' as const,
    sectionLabel: asString(forum.name_lang || forum.name) || `Forum #${forumId}`,
    author,
    authorAvatarUrl: asString(user.avatar),
    authorUrl: asString(item.author_url || user.url),
    authorInitials: createInitials(author),
    authorRole: asString(user.working || user.school || user.username) || author,
    status: 'open' as const,
    createdAt: formatBackendTimestamp(item.posted),
    views: asNumber(item.views),
    repliesCount: asNumber(item.replies) || replies.length,
    excerpt: body,
    tags: [],
    replies,
    url: `/forum?fid=${forumId}&tid=${asNumber(item.id)}`,
    canManage: asBoolean(item.is_owner) || asBoolean(item.is_admin),
  };
};

export function createForumRepository(): ForumRepository {
  return {
    async getForumCatalog(query: ForumCatalogQuery): Promise<ForumCatalog> {
      const response = await apiBridge.post<BackendForumResponse>(
        apiRoutes.forum.main,
        {
          keyword: query.q || '',
          offset: query.offset || 0,
          limit: query.limit || 20,
        },
      );

      if (response.api_status !== 200 && response.api_status !== '200') {
        throw new Error(
          response.errors?.error_text || 'Unable to load forum.',
        );
      }

      return {
        sections: (response.sections ?? []).map(mapSection),
        searchSections: (
          response.search_sections?.length
            ? response.search_sections
            : response.sections ?? []
        ).map(mapSection),
        canCreate: Boolean(response.can_create),
        hasMore: Boolean(response.has_more),
        nextOffset: response.next_offset ? asNumber(response.next_offset) : null,
      };
    },

    async getForumMembers(query: ForumMemberQuery): Promise<ForumMemberList> {
      const response = await apiBridge.post<BackendForumResponse>(
        apiRoutes.forum.main,
        {
          action: 'members',
          keyword: query.q || '',
          key: query.key || '',
          offset: query.offset || 0,
          limit: query.limit || 10,
        },
      );

      if (response.api_status !== 200 && response.api_status !== '200') {
        throw new Error(response.errors?.error_text || 'Unable to load forum members.');
      }

      return {
        members: (response.members ?? []).map(mapMember).filter(member => member.id),
        totalMembers: asNumber(response.total_members),
        hasMore: Boolean(response.has_more),
        nextOffset: response.next_offset ? asNumber(response.next_offset) : null,
      };
    },

    async searchForum(query: ForumSearchQuery): Promise<ForumSearchResult> {
      const response = await apiBridge.post<BackendForumResponse>(
        apiRoutes.forum.main,
        {
          action: 'search',
          search_terms: query.terms.trim(),
          search_in: query.scope,
          search_only: query.searchContent ? 1 : 0,
          section: query.sectionId || 0,
          limit: query.limit || 20,
        },
      );

      if (response.api_status !== 200 && response.api_status !== '200') {
        throw new Error(response.errors?.error_text || 'Unable to search the forum.');
      }

      return {
        sections: (response.sections ?? []).map(mapSection),
        threads: (response.threads ?? []).map(mapThread),
        replies: (response.replies ?? []).map(mapReply),
      };
    },

    async getForumThreads(query: ForumThreadQuery): Promise<ForumThreadList> {
      if (!query.forumId) {
        throw new Error('Forum id is required.');
      }

      const response = await apiBridge.post<BackendForumResponse>(
        apiRoutes.forum.main,
        {
          action: 'threads',
          forum_id: query.forumId,
          keyword: query.q || '',
          offset: query.offset || 0,
          limit: query.limit || 10,
        },
      );

      if (response.api_status !== 200 && response.api_status !== '200') {
        throw new Error(
          response.errors?.error_text || 'Unable to load forum threads.',
        );
      }

      return {
        forum: response.forum
          ? mapForum(response.forum, asNumber((response.forum as any).sections))
          : null,
        threads: (response.threads ?? []).map(mapThread),
        canCreate: Boolean(response.can_create),
        hasMore: Boolean(response.has_more),
        nextOffset: response.next_offset ? asNumber(response.next_offset) : null,
      };
    },

    async getMyForumThreads(query: ForumCatalogQuery): Promise<ForumThreadList> {
      const response = await apiBridge.post<BackendForumResponse>(
        apiRoutes.forum.main,
        {
          action: 'my_threads',
          keyword: query.q || '',
          offset: query.offset || 0,
          limit: query.limit || 10,
        },
      );

      if (response.api_status !== 200 && response.api_status !== '200') {
        throw new Error(
          response.errors?.error_text || 'Unable to load your forum threads.',
        );
      }

      return {
        forum: null,
        threads: (response.threads ?? []).map(mapThread),
        canCreate: Boolean(response.can_create),
        hasMore: Boolean(response.has_more),
        nextOffset: response.next_offset ? asNumber(response.next_offset) : null,
      };
    },

    async getMyForumMessages(query: ForumCatalogQuery): Promise<ForumSearchResult> {
      const response = await apiBridge.post<BackendForumResponse>(
        apiRoutes.forum.main,
        {
          action: 'my_messages',
          offset: query.offset || 0,
          limit: query.limit || 20,
        },
      );

      if (response.api_status !== 200 && response.api_status !== '200') {
        throw new Error(response.errors?.error_text || 'Unable to load your forum messages.');
      }

      return {
        sections: [],
        threads: [],
        replies: (response.replies ?? []).map(mapReply),
      };
    },

    async getForumThreadDetail(threadId: number): Promise<ForumThreadDetail> {
      if (!threadId) {
        throw new Error('Thread id is required.');
      }

      const response = await apiBridge.post<BackendForumResponse>(
        apiRoutes.forum.main,
        {
          action: 'thread_detail',
          thread_id: threadId,
        },
      );

      if (response.api_status !== 200 && response.api_status !== '200') {
        throw new Error(
          response.errors?.error_text || 'Unable to load forum thread.',
        );
      }

      return {
        thread: response.thread ? mapThread(response.thread) : null,
        canCreate: Boolean(response.can_create),
      };
    },

    async createThread(payload: ForumThreadPayload): Promise<ForumMutationResult> {
      if (
        !payload.forumId ||
        payload.title.trim().length < 10 ||
        payload.message.trim().length < 32
      ) {
        throw new Error('Thread title and content are required.');
      }

      const response = await apiBridge.post<BackendForumResponse>(
        apiRoutes.forum.main,
        {
          action: 'create_thread',
          forum_id: payload.forumId,
          headline: payload.title.trim(),
          topicpost: payload.message.trim(),
        },
      );

      if (response.api_status !== 200 && response.api_status !== '200') {
        throw new Error(
          response.errors?.error_text || 'Unable to create forum thread.',
        );
      }

      return {
        ok: true,
        thread: response.thread ? mapThread(response.thread) : null,
      };
    },

    async replyThread(payload: ForumReplyPayload): Promise<ForumMutationResult> {
      const message = payload.message.trim();
      const subject = (payload.subject || message.slice(0, 80)).trim();

      if (!payload.threadId || !payload.forumId || subject.length < 10 || message.length < 2) {
        throw new Error('Reply content is required.');
      }

      const response = await apiBridge.post<BackendForumResponse>(
        apiRoutes.forum.main,
        {
          action: 'reply_thread',
          thread_id: payload.threadId,
          forum_id: payload.forumId,
          subject,
          content: message,
        },
      );

      if (response.api_status !== 200 && response.api_status !== '200') {
        throw new Error(
          response.errors?.error_text || 'Unable to reply to forum thread.',
        );
      }

      return {
        ok: true,
        reply: response.reply ? mapReply(response.reply) : null,
      };
    },
  };
}
