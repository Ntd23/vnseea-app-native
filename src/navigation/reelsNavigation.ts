import { Platform } from 'react-native';
import { ROUTES } from './constants/routes';
import type { MainTabParamList } from './types';

export type ReelsNavigationParams = NonNullable<MainTabParamList[typeof ROUTES.REELS]>;

/**
 * Target for opening the Reels surface.
 *
 * Reels belongs to the bottom-tab surface. Opening it through
 * `MAIN_TABS` keeps the iOS native tab bar visible and selects
 * the Video tab instead of pushing a full-screen legacy route.
 */
type ReelsNavigationTarget = {
 name: typeof ROUTES.MAIN_TABS;
 params: {
  screen: typeof ROUTES.REELS;
  params: ReelsNavigationParams;
 };
};

/**
 * Build a navigation target for the Reels screen.
 *
 * The `_platform` argument is kept for backwards compatibility
 * with callers that historically branched on iOS / Android.
 * Both platforms now enter Reels through the bottom-tab navigator.
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
 * Open Reels through MainTabs. The signature is intentionally
 * loose (`any`) so any `NavigationProp`-like object compiles.
 */
export function navigateToReels(
 // Accept any object that has a `navigate` method (and optionally
 // extra stack methods). We type as `any` to remain compatible
 // with React Navigation's `NavigationProp` family — strict
 // structural typing breaks callers like `SavedPostsScreen` whose
 // typed navigation prop includes methods that we don't need.
 navigation: any,
 params: ReelsNavigationParams,
 platform: typeof Platform.OS = Platform.OS,
) {
 const target = createReelsNavigationTarget(platform, params);
 navigation.navigate(target.name, target.params);
}
