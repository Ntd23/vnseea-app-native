import { Platform, StatusBar } from 'react-native';

const IOS_STATUS_BAR_FALLBACK = 47;

export function resolveFeedChromeTopInset(
  safeAreaTop: number,
  initialSafeAreaTop?: number | null,
) {
  const fallbackTop =
    Platform.OS === 'ios'
      ? IOS_STATUS_BAR_FALLBACK
      : StatusBar.currentHeight ?? 0;
  const androidInitialTop =
    Platform.OS === 'android' &&
    typeof initialSafeAreaTop === 'number' &&
    Number.isFinite(initialSafeAreaTop)
      ? Math.max(0, initialSafeAreaTop)
      : undefined;
  const rawTopInset =
    safeAreaTop > 0
      ? safeAreaTop
      : androidInitialTop !== undefined
      ? androidInitialTop
      : initialSafeAreaTop || fallbackTop;
  return Number.isFinite(rawTopInset)
    ? Math.max(0, rawTopInset)
    : fallbackTop;
}
