import { Platform } from 'react-native';
import { ROUTES } from './constants/routes';
import type { MainTabParamList } from './types';

export type ReelsNavigationParams = NonNullable<
  MainTabParamList[typeof ROUTES.REELS]
>;

/**
 * Target for opening the Reels surface.
 *
 * Reels belongs to the bottom-tab surface. Opening it through `MAIN_TABS`
 * keeps the iOS bottom bar visible and selects the Video tab. The root
 * `ROUTES.REELS` screen remains registered for legacy/deep-link entrypoints,
 * but this helper intentionally preserves the tab experience.
 */
type ReelsNavigationTarget = {
  name: typeof ROUTES.MAIN_TABS;
  params: {
    screen: typeof ROUTES.REELS;
    params: ReelsNavigationParams;
  };
};

type ReelsNavigatorLike = {
  navigate: (
    name: ReelsNavigationTarget['name'],
    params: ReelsNavigationTarget['params'],
  ) => void;
};

/**
 * Build a navigation target for the Reels screen.
 *
 * The `_platform` argument is kept for backwards compatibility with callers
 * that historically branched on iOS / Android. Both platforms now enter Reels
 * through the bottom-tab navigator.
 */
export function createReelsNavigationTarget(
  _platform: typeof Platform.OS,
  params: ReelsNavigationParams,
): ReelsNavigationTarget {
  return {
    name: ROUTES.MAIN_TABS,
    params: {
      screen: ROUTES.REELS,
      params,
    },
  };
}

/**
 * Open Reels through MainTabs. The signature only requires `navigate` because
 * Reels should not use stack-only `push` when entered from feed cards.
 */
export function navigateToReels(
  navigation: ReelsNavigatorLike,
  params: ReelsNavigationParams,
  platform: typeof Platform.OS = Platform.OS,
) {
  const target = createReelsNavigationTarget(platform, params);
  navigation.navigate(target.name, target.params);
}
