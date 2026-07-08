import { Platform } from 'react-native';
import { ROUTES } from './constants/routes';
import type { RootStackParamList } from './types';

export type ReelsNavigationParams = NonNullable<
  RootStackParamList[typeof ROUTES.REELS]
>;

/**
 * Target for opening the Reels surface.
 *
 * We push `ROUTES.REELS` directly onto the Root Stack, not the
 * `MAIN_TABS` tab navigator, so AppNavigator can open it as an instant
 * full-screen video surface. Pushing onto the Root Stack also means it can
 * be popped with the system back gesture / button and it sits above the tab
 * navigator until the user returns.
 */
type ReelsNavigationTarget = {
  name: typeof ROUTES.REELS;
  params: NonNullable<RootStackParamList[typeof ROUTES.REELS]>;
};

/**
 * Build a navigation target for the Reels screen.
 *
 * The `_platform` argument is kept for backwards compatibility with callers
 * that historically branched on iOS / Android. It is unused now that the
 * Root Stack handles the transition uniformly.
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
 * Open the Reels surface via the Root Stack. This keeps tapped feed videos
 * feeling continuous: AppNavigator uses a `none` transition for this route,
 * while ReelsScreen receives the tapped post and can render it immediately.
 */
export function navigateToReels(
  // Accept any object that has a `navigate` method and optionally `push`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any,
  params: ReelsNavigationParams,
  platform: typeof Platform.OS = Platform.OS,
) {
  const target = createReelsNavigationTarget(platform, params);
  if (typeof navigation.push === 'function') {
    navigation.push(target.name, target.params);
  } else {
    navigation.navigate(target.name, target.params);
  }
}
