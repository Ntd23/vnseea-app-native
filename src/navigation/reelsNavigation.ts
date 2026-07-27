import { Platform, StatusBar } from 'react-native';
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
  getState?: () => { type?: string };
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

export function shouldOpenReelsInMainTab(params: ReelsNavigationParams) {
  return (
    params.source === 'home' &&
    !params.initialVideoId &&
    !params.post
  );
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

  if (Platform.OS === 'android') {
    // Apply the fullscreen chrome before the navigation commit so the first
    // visible Reel frame already has the correct viewport/status-bar layout.
    StatusBar.setBarStyle('light-content', false);
    StatusBar.setBackgroundColor('transparent', false);
    StatusBar.setTranslucent(true);
  }

  // Opening the generic Video surface from Home should switch to the
  // persistent Reels tab. Reusing that mounted screen keeps both Home and
  // the video player tree warm, so moving back and forth is immediate.
  if (shouldOpenReelsInMainTab(params)) {
    if (navigation.getState?.().type === 'tab') {
      navigation.navigate(ROUTES.REELS, target.params);
      return;
    }

    rootNavigator.navigate(ROUTES.MAIN_TABS, {
      screen: ROUTES.REELS,
      params: target.params,
    });
    return;
  }

  if (typeof rootNavigator.push === 'function') {
    rootNavigator.push(target.name, target.params);
    return;
  }

  rootNavigator.navigate(target.name, target.params);
}
