// Description: Loads and normalizes the public mobile release settings from the backend.
import { apiRoutes } from '../../application/constants/route-registry';
import type {
  MobileReleaseSettings,
  MobilePlatform,
} from '../../application/app-update/appRelease';
import {
  normalizeReleaseVersion,
  resolveStoreUrl,
} from '../../application/app-update/appRelease';
import { apiBridge } from '../api/apiBridge';

type SiteSettingsResponse = {
  public_config?: {
    mobile_app?: Partial<
      Record<
        MobilePlatform,
        {
          version?: unknown;
          store_url?: unknown;
        }
      >
    >;
  };
};

const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedSettings: MobileReleaseSettings | null = null;
let cachedAt = 0;
let inflightRequest: Promise<MobileReleaseSettings> | null = null;

function normalizePlatformSettings(
  platform: MobilePlatform,
  raw: SiteSettingsResponse['public_config'],
) {
  const platformSettings = raw?.mobile_app?.[platform];

  return {
    version: normalizeReleaseVersion(platformSettings?.version),
    storeUrl: resolveStoreUrl(platform, platformSettings?.store_url),
  };
}

export async function fetchMobileReleaseSettings(
  forceRefresh = false,
): Promise<MobileReleaseSettings> {
  const now = Date.now();
  if (
    !forceRefresh &&
    cachedSettings &&
    now - cachedAt < CACHE_TTL_MS
  ) {
    return cachedSettings;
  }

  if (inflightRequest) return inflightRequest;

  inflightRequest = (async () => {
    const response = await apiBridge.post<SiteSettingsResponse>(
      apiRoutes.auth.siteSettings,
      {},
    );
    const publicConfig = response?.public_config;
    const settings: MobileReleaseSettings = {
      ios: normalizePlatformSettings('ios', publicConfig),
      android: normalizePlatformSettings('android', publicConfig),
    };

    cachedSettings = settings;
    cachedAt = Date.now();
    return settings;
  })().finally(() => {
    inflightRequest = null;
  });

  return inflightRequest;
}
