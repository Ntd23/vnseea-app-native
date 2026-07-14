// Description: Defines forum catalog, member, search, thread, and reply domain models.
// Port từ: client/src/forum/domain/types/

export type ForumSectionKey = 'all' | 'announcements' | 'support' | 'marketplace' | 'events' | 'jobs' | 'showcase';
export type ForumPageTab = 'browse' | 'members' | 'search' | 'my_threads' | 'my_messages';

export type ForumMember = {
  id: number;
  username: string;
  name: string;
  avatarUrl: string;
  joined: number;
  lastSeen: number;
  postCount: number;
  referrals: number;
  isAdmin: boolean;
};

export type ForumMemberList = {
  members: ForumMember[];
  totalMembers: number;
  hasMore: boolean;
  nextOffset: number | null;
};

export type ForumMemberQuery = ForumCatalogQuery & {
  key?: string;
};

export type ForumSearchScope = 'forums' | 'threads' | 'messages';

export type ForumSearchQuery = {
  terms: string;
  scope: ForumSearchScope;
  searchContent: boolean;
  sectionId?: number;
  limit?: number;
};

export type ForumSearchResult = {
  sections: ForumSummarySection[];
  threads: ForumThread[];
  replies: ForumReply[];
};

export type ForumSection = {
  label: string;
  value: ForumSectionKey;
  icon: string;
  description: string;
};

export type ForumReply = {
  id: number;
  threadId: number;
  forumId: number;
  author: string;
  authorAvatarUrl: string;
  authorUrl: string;
  initials: string;
  role: string;
  subject: string;
  message: string;
  time: string;
  canManage: boolean;
  accepted?: boolean;
};

export type ForumThread = {
  id: number;
  forumId: number;
  title: string;
  section: Exclude<ForumSectionKey, 'all'> | 'support';
  sectionLabel: string;
  author: string;
  authorAvatarUrl: string;
  authorUrl: string;
  authorInitials: string;
  authorRole: string;
  status: 'open' | 'solved' | 'pinned';
  createdAt: string;
  views: number;
  repliesCount: number;
  excerpt: string;
  tags: string[];
  replies: ForumReply[];
  url: string;
  canManage: boolean;
};

export type ForumThreadPayload = {
  title: string;
  forumId: number;
  message: string;
};

export type ForumReplyPayload = {
  threadId: number;
  forumId: number;
  subject?: string;
  message: string;
};

export type ForumSummaryForum = {
  id: number;
  sectionId: number;
  title: string;
  description: string;
  posts: number;
  url: string;
};

export type ForumSummarySection = {
  id: number;
  title: string;
  description: string;
  forums: ForumSummaryForum[];
};

export type ForumCatalog = {
  sections: ForumSummarySection[];
  searchSections: ForumSummarySection[];
  canCreate: boolean;
  hasMore: boolean;
  nextOffset: number | null;
};

export type ForumCatalogQuery = {
  q?: string;
  offset?: number | null;
  limit?: number;
};

export type ForumThreadList = {
  forum: ForumSummaryForum | null;
  threads: ForumThread[];
  canCreate: boolean;
  hasMore: boolean;
  nextOffset: number | null;
};

export type ForumThreadQuery = {
  forumId?: number;
  q?: string;
  offset?: number | null;
  limit?: number;
};

export type ForumThreadDetail = {
  thread: ForumThread | null;
  canCreate: boolean;
};

export type ForumMutationResult = {
  ok: boolean;
  thread?: ForumThread | null;
  reply?: ForumReply | null;
};

export interface ForumItem {
  id: string | number;
  // Legacy interface for backward compatibility
}
