// Description: Centralized i18n copy for the feed bounded context.
//
// Mirrors the AppLanguage + Record<AppLanguage, Record<key, string>> pattern
// used by `storiesCopy.ts` and `notificationCopy.ts`. Screens read
// `FEED_COPY[language]` via `useAppLanguage` to stay consistent with the
// rest of the feed domain.

import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';

/**
 * Tab identifier for the post-reactions screen. `'all'` is the merged
 * view across every reaction type; the other literals map 1:1 to
 * `ReactionType` so the tab key can be passed straight to the
 * repository as a reaction filter.
 */
export type PostReactionTab = 'all' | 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

export interface FeedCopy {
  // ── Post reactions screen ──────────────────────────────────────────
  reactionsHeaderTitle: string;
  reactionsCounterLabel: (n: number) => string;
  reactionsTabAll: string;
  reactionsTabLike: string;
  reactionsTabLove: string;
  reactionsTabHaha: string;
  reactionsTabWow: string;
  reactionsTabSad: string;
  reactionsTabAngry: string;
  reactionsEmptyTitle: string;
  reactionsEmptyDescription: string;
  reactionsErrorTitle: string;
  reactionsFollowButton: string;
  reactionsFollowingButton: string;
  reactionsRequestedButton: string;
  reactionsLoading: string;
  reactionsRetry: string;
  /**
   * Helper that returns the localised label for a specific reaction
   * tab — used by the tab-bar renderer so we never inline the
   * switch in JSX.
   */
  reactionsTabLabel: (tab: PostReactionTab) => string;
  /**
   * Helper that returns the localised empty-state copy for a given
   * tab — "chưa có ai thả cảm xúc" vs "chưa ai thả Yêu thích".
   */
  reactionsEmptyForTab: (tab: PostReactionTab) => string;
  composerPlaceholder?: string;
  library?: string;
  tag?: string;
  feeling?: string;
  photo?: string;
  video?: string;
  product?: string;
  poll?: string;
}

const TAB_LABEL_VI: Record<Exclude<PostReactionTab, 'all'>, string> = {
  like: 'Thích',
  love: 'Yêu thích',
  haha: 'Haha',
  wow: 'Wow',
  sad: 'Buồn',
  angry: 'Phẫn nộ',
};

const TAB_LABEL_EN: Record<Exclude<PostReactionTab, 'all'>, string> = {
  like: 'Like',
  love: 'Love',
  haha: 'Haha',
  wow: 'Wow',
  sad: 'Sad',
  angry: 'Angry',
};

export const FEED_COPY: Record<AppLanguage, FeedCopy> = {
  vi: {
    reactionsHeaderTitle: 'Cảm xúc',
    reactionsCounterLabel: (n: number) =>
      `${n.toLocaleString('vi-VN')} lượt thả cảm xúc`,
    reactionsTabAll: 'Tất cả',
    reactionsTabLike: TAB_LABEL_VI.like,
    reactionsTabLove: TAB_LABEL_VI.love,
    reactionsTabHaha: TAB_LABEL_VI.haha,
    reactionsTabWow: TAB_LABEL_VI.wow,
    reactionsTabSad: TAB_LABEL_VI.sad,
    reactionsTabAngry: TAB_LABEL_VI.angry,
    reactionsEmptyTitle: 'Chưa có ai thả cảm xúc',
    reactionsEmptyDescription:
      'Khi có người thả cảm xúc lên bài viết, họ sẽ xuất hiện ở đây.',
    reactionsErrorTitle: 'Không tải được danh sách cảm xúc',
    reactionsFollowButton: 'Theo dõi',
    reactionsFollowingButton: 'Đang theo dõi',
    reactionsRequestedButton: 'Đã gửi',
    reactionsLoading: 'Đang tải danh sách cảm xúc...',
    reactionsRetry: 'Thử lại',
    reactionsTabLabel: (tab: PostReactionTab) =>
      tab === 'all' ? 'Tất cả' : TAB_LABEL_VI[tab],
    reactionsEmptyForTab: (tab: PostReactionTab) =>
      tab === 'all'
        ? 'Chưa có ai thả cảm xúc'
        : `Chưa có ai thả ${TAB_LABEL_VI[tab]}`,
  },
  en: {
    reactionsHeaderTitle: 'Reactions',
    reactionsCounterLabel: (n: number) =>
      `${n.toLocaleString('en-US')} reactions`,
    reactionsTabAll: 'All',
    reactionsTabLike: TAB_LABEL_EN.like,
    reactionsTabLove: TAB_LABEL_EN.love,
    reactionsTabHaha: TAB_LABEL_EN.haha,
    reactionsTabWow: TAB_LABEL_EN.wow,
    reactionsTabSad: TAB_LABEL_EN.sad,
    reactionsTabAngry: TAB_LABEL_EN.angry,
    reactionsEmptyTitle: 'No reactions yet',
    reactionsEmptyDescription:
      'When someone reacts to this post, they will appear here.',
    reactionsErrorTitle: 'Could not load reactions',
    reactionsFollowButton: 'Follow',
    reactionsFollowingButton: 'Following',
    reactionsRequestedButton: 'Requested',
    reactionsLoading: 'Loading reactions...',
    reactionsRetry: 'Retry',
    reactionsTabLabel: (tab: PostReactionTab) =>
      tab === 'all' ? 'All' : TAB_LABEL_EN[tab],
    reactionsEmptyForTab: (tab: PostReactionTab) =>
      tab === 'all'
        ? 'No reactions yet'
        : `No one has reacted with ${TAB_LABEL_EN[tab]} yet`,
  },
};

export function getFeedCopy(language: AppLanguage): FeedCopy {
  return FEED_COPY[language];
}