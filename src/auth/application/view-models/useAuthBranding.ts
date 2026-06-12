// Description: Fetches the public site settings (logo, siteName) from the
// backend's get-site-settings endpoint so the auth screen can render the
// real brand logo when available.
//
// Falls back to a static "V" mark + "VNSEEA" name when the network is
// unreachable, the response is malformed, or the image fails to load.

import { useEffect, useState } from 'react';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';

export interface SiteBranding {
  logoUrl: string | null;
  siteName: string;
  isLoading: boolean;
  error: string | null;
  /** Increments whenever the image fails to render so the screen can swap to the fallback. */
  imageErrorCount: number;
  notifyImageError: () => void;
}

type SiteSettingsResponse = {
  api_status?: number | string;
  public_config?: {
    siteName?: string;
    logo_url?: string;
  };
};

// Module-level cache so the screen does not re-fetch on every mount within
// the same session. Cleared automatically on next cold start.
let cachedBranding: Pick<SiteBranding, 'logoUrl' | 'siteName'> | null = null;
let inflightPromise: Promise<Pick<SiteBranding, 'logoUrl' | 'siteName'>> | null = null;

async function fetchBranding(): Promise<
  Pick<SiteBranding, 'logoUrl' | 'siteName'>
> {
  if (cachedBranding) return cachedBranding;
  if (inflightPromise) return inflightPromise;

  inflightPromise = (async () => {
    try {
      const response = await apiBridge.post<SiteSettingsResponse>(
        apiRoutes.auth.siteSettings,
        {},
      );
      const publicConfig = response?.public_config ?? {};
      const logoUrl =
        typeof publicConfig.logo_url === 'string' &&
        publicConfig.logo_url.length > 0
          ? publicConfig.logo_url
          : null;
      const siteName =
        typeof publicConfig.siteName === 'string' &&
        publicConfig.siteName.length > 0
          ? publicConfig.siteName
          : 'VNSEEA';
      const next = { logoUrl, siteName };
      cachedBranding = next;
      return next;
    } catch {
      const next = { logoUrl: null, siteName: 'VNSEEA' };
      cachedBranding = next;
      return next;
    } finally {
      inflightPromise = null;
    }
  })();

  return inflightPromise;
}

export function useAuthBranding(): SiteBranding {
  const [logoUrl, setLogoUrl] = useState<string | null>(
    cachedBranding?.logoUrl ?? null,
  );
  const [siteName, setSiteName] = useState<string>(
    cachedBranding?.siteName ?? 'VNSEEA',
  );
  const [isLoading, setIsLoading] = useState<boolean>(!cachedBranding);
  const [error, setError] = useState<string | null>(null);
  const [imageErrorCount, setImageErrorCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (cachedBranding) {
      setLogoUrl(cachedBranding.logoUrl);
      setSiteName(cachedBranding.siteName);
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);
    setError(null);

    fetchBranding()
      .then(result => {
        if (cancelled) return;
        setLogoUrl(result.logoUrl);
        setSiteName(result.siteName);
        setIsLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const notifyImageError = () => {
    setImageErrorCount(prev => prev + 1);
    setLogoUrl(null);
  };

  return {
    logoUrl,
    siteName,
    isLoading,
    error,
    imageErrorCount,
    notifyImageError,
  };
}
