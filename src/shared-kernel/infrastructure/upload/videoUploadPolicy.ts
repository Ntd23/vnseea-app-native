// Description: Reads, from the public site settings, whether chat videos upload to Bunny Stream and when to skip on-device compression.
import { apiRoutes } from '../../application/constants/route-registry';
import { apiBridge } from '../api/apiBridge';

export type VideoUploadProvider = 'local' | 'bunny_stream';

export interface VideoUploadPolicy {
  provider: VideoUploadProvider;
  /** Videos longer than this many seconds upload uncompressed (Bunny only). */
  compressMaxSeconds: number;
}

type SiteSettingsResponse = {
  public_config?: {
    video_upload?: {
      chat?: {
        provider?: unknown;
        compress_max_seconds?: unknown;
      };
    };
  };
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const LOCAL_POLICY: VideoUploadPolicy = {
  provider: 'local',
  compressMaxSeconds: 0,
};

let cachedPolicy: VideoUploadPolicy | null = null;
let cachedAt = 0;
let inFlight: Promise<VideoUploadPolicy> | null = null;

function toPolicy(raw: SiteSettingsResponse): VideoUploadPolicy {
  const chat = raw.public_config?.video_upload?.chat;
  if (chat?.provider !== 'bunny_stream') return LOCAL_POLICY;
  const seconds = Number(chat.compress_max_seconds);
  return {
    provider: 'bunny_stream',
    compressMaxSeconds: Number.isFinite(seconds) && seconds >= 0 ? seconds : 180,
  };
}

/**
 * The admin can switch Bunny on or off at any time, so the answer is cached
 * only briefly. Any failure means "upload to this server", which always works.
 */
export async function getChatVideoUploadPolicy(
  now = Date.now(),
): Promise<VideoUploadPolicy> {
  if (cachedPolicy && now - cachedAt < CACHE_TTL_MS) return cachedPolicy;
  if (inFlight) return inFlight;

  inFlight = apiBridge
    .post<SiteSettingsResponse>(apiRoutes.auth.siteSettings)
    .then(response => {
      cachedPolicy = toPolicy(response ?? {});
      cachedAt = Date.now();
      return cachedPolicy;
    })
    .catch(() => LOCAL_POLICY)
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function resetVideoUploadPolicyCache() {
  cachedPolicy = null;
  cachedAt = 0;
  inFlight = null;
}
