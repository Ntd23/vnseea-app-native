import { Platform } from 'react-native';

const IOS_STATUS_BAR_FALLBACK = 47;

export function resolveFeedChromeTopInset(
  safeAreaTop: number,
  initialSafeAreaTop?: number | null,
) {
  if (Platform.OS === 'android') {
    return 0;
  }

  const fallbackTop = IOS_STATUS_BAR_FALLBACK;
  const rawTopInset = safeAreaTop > 0 ? safeAreaTop : initialSafeAreaTop || fallbackTop;
  return Number.isFinite(rawTopInset)
    ? Math.max(0, rawTopInset)
    : fallbackTop;
}
