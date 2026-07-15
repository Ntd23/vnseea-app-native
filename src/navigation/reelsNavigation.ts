import { Platform } from 'react-native';
import { ROUTES } from './constants/routes';
import type { MainTabParamList } from './types';

export type ReelsNavigationParams = NonNullable<
  MainTabParamList[typeof ROUTES.REELS]
>;

/**
 * Target for opening a specific Reels item from another screen.
 *
 * The bottom-tab Video screen still owns the normal tab experience. Tapping a
 * concrete video/post should open the root-stack Reels route instead so the
 * custom left-edge swipe can reveal the screen the user will return to.
 */
type ReelsNavigationTarget = {
  name: typeof ROUTES.REELS;
  params: ReelsNavigationParams;
};

type ReelsNavigatorLike = {
  navigate: (...args: any[]) => void;
  push?: (...args: any[]) => void;
  getParent?: () => ReelsNavigatorLike | undefined;
};

function getRootNavigator(navigation: ReelsNavigatorLike) {
  let current: ReelsNavigatorLike = navigation;
  let parent = current.getParent?.();

  while (parent) {
    current = parent;
    parent = current.getParent?.();
  }

  return current;
}

/**
 * Build a navigation target for the Reels screen.
 *
 * The `_platform` argument is kept for backwards compatibility with callers
 * that historically branched on iOS / Android.
 */
export function createReelsNavigationTarget(
  _platform: typeof Platform.OS,
  params: ReelsNavigationParams,
): ReelsNavigationTarget {
  return {
    name: ROUTES.REELS,
    params,
  };
}

/**
 * Open a tapped reel on top of the current screen. Prefer stack `push` so
 * closing the reel reveals exactly the screen the user came from; fall back to
 * `navigate` for very small test/mock navigators.
 */
export function navigateToReels(
  navigation: ReelsNavigatorLike,
  params: ReelsNavigationParams,
  platform: typeof Platform.OS = Platform.OS,
) {
  const target = createReelsNavigationTarget(platform, params);
  const rootNavigator = getRootNavigator(navigation);

  if (typeof rootNavigator.push === 'function') {
    rootNavigator.push(target.name, target.params);
    return;
  }

  rootNavigator.navigate(target.name, target.params);
}
