// Description: Defines the manually maintained mobile release versions and update contract.
import { Platform } from 'react-native';

export type MobilePlatform = 'ios' | 'android';

export interface PlatformReleaseSettings {
  version: string;
  storeUrl: string;
}

export interface MobileReleaseSettings {
  ios: PlatformReleaseSettings;
  android: PlatformReleaseSettings;
}

// Update these values when preparing a new App Store or Google Play release.
export const APP_RELEASE_VERSION: Record<MobilePlatform, string> = {
  ios: '2.0.4',
  android: '9.0.19',
};

export const DEFAULT_STORE_URL: Record<MobilePlatform, string> = {
  ios: 'https://apps.apple.com/vn/app/vnseea/id6767143251?l=vi',
  android:
    'https://play.google.com/store/apps/details?id=com.vnseea.android',
};

export function getMobilePlatform(): MobilePlatform | null {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return Platform.OS;
  }

  return null;
}

export function normalizeReleaseVersion(value: unknown): string {
  if (typeof value !== 'string') return '';

  const normalized = value.trim();
  if (!normalized || normalized.length > 40) return '';

  return /^[0-9A-Za-z][0-9A-Za-z._+-]*$/.test(normalized)
    ? normalized
    : '';
}

export function shouldPromptForUpdate(
  currentVersion: unknown,
  targetVersion: unknown,
): boolean {
  const current = normalizeReleaseVersion(currentVersion);
  const target = normalizeReleaseVersion(targetVersion);

  return Boolean(current && target && current !== target);
}

export function resolveStoreUrl(
  platform: MobilePlatform,
  configuredUrl: unknown,
): string {
  if (typeof configuredUrl !== 'string') return DEFAULT_STORE_URL[platform];

  const normalized = configuredUrl.trim();
  if (!normalized) return DEFAULT_STORE_URL[platform];

  try {
    const parsed = new URL(normalized);
    const allowedHost =
      platform === 'ios' ? 'apps.apple.com' : 'play.google.com';

    if (parsed.protocol === 'https:' && parsed.hostname === allowedHost) {
      return parsed.toString();
    }
  } catch {
    // Fall through to the trusted built-in store URL.
  }

  return DEFAULT_STORE_URL[platform];
}
