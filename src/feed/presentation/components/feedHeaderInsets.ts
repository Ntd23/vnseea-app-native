import { Platform } from 'react-native';

const IOS_STATUS_BAR_FALLBACK = 47;

function normalizeInset(value?: number | null) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
}

export function resolveFeedChromeTopInset(
  safeAreaTop: number,
  initialSafeAreaTop?: number | null,
) {
  const runtimeTopInset = normalizeInset(safeAreaTop);

  if (Platform.OS === 'android') {
    return runtimeTopInset;
  }

  const initialTopInset = normalizeInset(initialSafeAreaTop);
  const rawTopInset =
    runtimeTopInset > 0
      ? runtimeTopInset
      : initialTopInset || IOS_STATUS_BAR_FALLBACK;
  return Number.isFinite(rawTopInset)
    ? Math.max(0, rawTopInset)
    : IOS_STATUS_BAR_FALLBACK;
}
