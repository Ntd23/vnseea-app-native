import { Platform } from 'react-native';
import { ROUTES } from './constants/routes';
import type { RootStackParamList } from './types';

export type ReelsNavigationParams = NonNullable<RootStackParamList[typeof ROUTES.REELS]>;

/**
 * Target for opening the Reels surface.
 *
 * We push `ROUTES.REELS` directly onto the Root Stack (NOT the
 * `MAIN_TABS` tab navigator) so that `AppNavigator` can run the
 * `slide_from_right` animation defined for that route. Pushing
 * onto the Root Stack also makes the Reels surface a true
 * full-screen push — it can be popped with the system back
 * gesture / button and it sits ABOVE the tab navigator (so the
 * bottom tab bar is hidden until the user pops back to it).
 */
type ReelsNavigationTarget = {
 name: typeof ROUTES.REELS;
 params: NonNullable<RootStackParamList[typeof ROUTES.REELS]>;
};

/**
 * Build a navigation target for the Reels screen.
 *
 * The `_platform` argument is kept for backwards compatibility
 * with callers that historically branched on iOS / Android — it
 * is unused now that the Root Stack handles the animation
 * uniformly.
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
 * Open the Reels surface via the Root Stack (not the MainTabs
 * tab navigator). This is what makes the transition feel like
 * a native iOS push — the new screen slides in from the right
 * edge with the `slide_from_right` animation configured in
 * `AppNavigator`, instead of the tab "snap" you'd get from
 * `navigation.navigate(MAIN_TABS, { screen: REELS })`.
 *
 * We try `push` first (preferred — adds a new entry on the
 * stack) and fall back to `navigate` if the navigation object
 * doesn't expose `push` (e.g. older typed wrappers or test
 * mocks). The signature is intentionally loose (`any`) so any
 * `NavigationProp`-like object compiles.
 */
export function navigateToReels(
 // Accept any object that has a `navigate` method (and optionally
 // `push`). We type as `any` to remain compatible with
 // React Navigation's `NavigationProp` family — strict structural
 // typing breaks callers like `SavedPostsScreen` whose typed
 // navigation prop includes extra methods (dispatch, reset, …)
 // that we don't need to narrow against.
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
