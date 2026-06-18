// Description: Centralized i18n copy + helpers for the stories bounded context.
//
// Mirrors the AppLanguage + Record<AppLanguage, Record<key, string>> pattern
// used by `notificationCopy.ts` and `shareCopy.ts`. The screen reads
// `STORIES_LIST_COPY[language]` via `useAppLanguage` — never `useT` /
// `react-i18next` — to stay consistent with the rest of the stories domain.

import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';

export interface StoriesCopy {
  headerTitle: string;
  seeAll: string;
  emptyTitle: string;
  emptyDescription: string;
  retry: string;
  loading: string;
  pullToRefresh: string;
  timeJustNow: string;
  timeMinutes: (n: number) => string;
  timeHours: (n: number) => string;
  timeYesterday: string;
  timeDays: (n: number) => string;
  errorTitle: string;
}

export const STORIES_LIST_COPY: Record<AppLanguage, StoriesCopy> = {
  vi: {
    headerTitle: 'Tất cả tin',
    seeAll: 'Xem tất cả',
    emptyTitle: 'Chưa có tin nào',
    emptyDescription: 'Khi bạn bè hoặc trang bạn theo dõi đăng tin, chúng sẽ xuất hiện ở đây.',
    retry: 'Thử lại',
    loading: 'Đang tải danh sách tin...',
    pullToRefresh: 'Kéo xuống để làm mới',
    timeJustNow: 'Vừa xong',
    timeMinutes: (n: number) => `${n} phút`,
    timeHours: (n: number) => `${n} giờ`,
    timeYesterday: 'Hôm qua',
    timeDays: (n: number) => `${n} ngày`,
    errorTitle: 'Không tải được danh sách tin',
  },
  en: {
    headerTitle: 'All stories',
    seeAll: 'See all',
    emptyTitle: 'No stories yet',
    emptyDescription: 'When your friends or followed pages post stories, they will appear here.',
    retry: 'Retry',
    loading: 'Loading stories...',
    pullToRefresh: 'Pull down to refresh',
    timeJustNow: 'Just now',
    timeMinutes: (n: number) => `${n} min`,
    timeHours: (n: number) => `${n}h`,
    timeYesterday: 'Yesterday',
    timeDays: (n: number) => `${n}d`,
    errorTitle: 'Could not load stories',
  },
};

export type StoriesCopyKey = keyof StoriesCopy;

export function getStoriesCopy(language: AppLanguage): StoriesCopy {
  return STORIES_LIST_COPY[language];
}

/**
 * Render a unix-seconds timestamp as a localised relative phrase using the
 * stories copy table. Mirrors the formatter in StoryViewerScreen so the rail
 * and the grid render identical text.
 */
export function formatStoriesRelativeTime(
  postedAt: number | undefined,
  copy: StoriesCopy,
  now: number = Math.floor(Date.now() / 1000),
): string {
  if (!postedAt) return copy.timeJustNow;
  const diff = Math.max(0, now - postedAt);
  if (diff < 60) return copy.timeJustNow;
  if (diff < 3600) return copy.timeMinutes(Math.floor(diff / 60));
  if (diff < 86400) return copy.timeHours(Math.floor(diff / 3600));
  if (diff < 86400 * 2) return copy.timeYesterday;
  return copy.timeDays(Math.floor(diff / 86400));
}