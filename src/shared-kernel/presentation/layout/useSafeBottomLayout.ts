import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getFixedBottomLayout,
  getSafeBottomPadding,
} from './safeBottomLayout';

type FixedBottomLayoutOptions = Omit<
  Parameters<typeof getFixedBottomLayout>[0],
  'bottomInset'
>;

export function useFixedBottomLayout(options: FixedBottomLayoutOptions) {
  const insets = useSafeAreaInsets();
  const {
    minimumFooterBottomPadding,
    contentBottomPadding,
    includeBottomInset,
  } = options;

  return useMemo(
    () =>
      getFixedBottomLayout({
        bottomInset: insets.bottom,
        minimumFooterBottomPadding,
        contentBottomPadding,
        includeBottomInset,
      }),
    [
      contentBottomPadding,
      includeBottomInset,
      insets.bottom,
      minimumFooterBottomPadding,
    ],
  );
}

export function useSafeBottomPadding(minimumPadding = 0) {
  const insets = useSafeAreaInsets();

  return useMemo(
    () => getSafeBottomPadding(insets.bottom, minimumPadding),
    [insets.bottom, minimumPadding],
  );
}
