// Description: Centralized i18n copy for the reels bounded context.
//
// Mirrors the AppLanguage + Record<AppLanguage, Record<key, string>> pattern
// used by `storiesCopy.ts`, `notificationCopy.ts`, and `shareCopy.ts`. The
// screen reads `REELS_COPY[language]` via `useAppLanguage` to stay consistent
// with the rest of the reels domain.
//
// The `filter*` keys are shared by the filter tabs bar (Tất cả / Địa chỉ /
// Ảnh / Video / Thị trường) and the inline auto-scroll label. Keeping all
// reels-domain copy in one file avoids hunting through multiple modules
// when a translator updates a string.

import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';

export interface ReelsCopy {
 // Filter bar labels
 filterAll: string;
 filterLocations: string;
 filterPhotos: string;
 filterVideos: string;
 filterMarket: string;

 // Header / screen chrome
 loading: string;
 failedLoad: string;
 tryAgain: string;
 noReels: string;
 beFirst: string;
 postReel: string;

 // Auto-scroll toggle button
 autoOn: string;
 autoOff: string;
}

export const REELS_COPY: Record<AppLanguage, ReelsCopy> = {
 vi: {
 filterAll: 'Tất cả',
 filterLocations: 'Địa chỉ',
 filterPhotos: 'Ảnh',
 filterVideos: 'Video',
 filterMarket: 'Thị trường',
 loading: 'Đang tải reels...',
 failedLoad: 'Không tải được reels',
 tryAgain: 'Thử lại',
 noReels: 'Chưa có reel nào',
 beFirst: 'Hãy là người đầu tiên đăng một video Reel!',
 postReel: 'Đăng Reel',
 autoOn: 'Tự động: Bật',
 autoOff: 'Tự động: Tắt',
 },
 en: {
 filterAll: 'All',
 filterLocations: 'Locations',
 filterPhotos: 'Photos',
 filterVideos: 'Videos',
 filterMarket: 'Market',
 loading: 'Loading reels...',
 failedLoad: 'Failed to load reels',
 tryAgain: 'Try again',
 noReels: 'No reels yet',
 beFirst: 'Be the first one to post a Reel!',
 postReel: 'Post Reel',
 autoOn: 'Auto: On',
 autoOff: 'Auto: Off',
 },
};

export type ReelsCopyKey = keyof ReelsCopy;

export function getReelsCopy(language: AppLanguage): ReelsCopy {
 return REELS_COPY[language];
}
