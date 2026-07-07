import { useContext, useMemo } from 'react';
import { Platform } from 'react-native';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type MainTabContentInsets = {
  bottomContentPadding: number;
  scrollIndicatorBottomInset: number;
  tabBarHeight: number;
};

export function useMainTabContentInsets(): MainTabContentInsets {
  const insets = useSafeAreaInsets();
  const tabBarHeightFromContext = useContext(BottomTabBarHeightContext);
  const tabBarHeight = tabBarHeightFromContext ?? 0;

  return useMemo(() => {
    if (Platform.OS !== 'ios') {
      return {
        bottomContentPadding: 0,
        scrollIndicatorBottomInset: 0,
        tabBarHeight: 0,
      };
    }

    const bottomContentPadding = Math.max(tabBarHeight + 16, insets.bottom + 72);

    return {
      bottomContentPadding,
      scrollIndicatorBottomInset: bottomContentPadding,
      tabBarHeight,
    };
  }, [insets.bottom, tabBarHeight]);
}
