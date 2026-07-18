import type { ReelsItem } from '../types/reels.types';

export function isReelShareable(item: ReelsItem | null | undefined): boolean {
  return item?.canShare === true;
}
