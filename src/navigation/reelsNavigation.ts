import { Platform } from 'react-native';
import { ROUTES } from './constants/routes';
import type { MainTabParamList, RootStackParamList } from './types';

export type ReelsNavigationParams = NonNullable<RootStackParamList[typeof ROUTES.REELS]>;

type ReelsNavigationTarget = {
  name: typeof ROUTES.MAIN_TABS;
  params: {
    screen: typeof ROUTES.REELS;
    params: NonNullable<MainTabParamList[typeof ROUTES.REELS]>;
  };
};

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

export function navigateToReels(
  navigation: { navigate: (name: string, params?: unknown) => void },
  params: ReelsNavigationParams,
  platform: typeof Platform.OS = Platform.OS,
) {
  const target = createReelsNavigationTarget(platform, params);
  navigation.navigate(target.name, target.params);
}
