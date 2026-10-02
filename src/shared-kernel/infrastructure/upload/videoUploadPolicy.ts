// Description: Reads, from the public site settings, whether chat, post, reel and story videos upload to Bunny Stream and when to skip on-device compression.
import { apiRoutes } from '../../application/constants/route-registry';
import { apiBridge } from '../api/apiBridge';

export type VideoUploadProvider = 'local' | 'bunny_stream';

/** Chat videos use the private Bunny library; the others the public one. */
export type VideoUploadPurpose = 'chat' | 'post' | 'reel' | 'story';

export interface VideoUploadPolicy {
  provider: VideoUploadProvider;
  /** Videos longer than this many seconds upload uncompressed (Bunny only). */
  compressMaxSeconds: number;
}

type RawPolicy = {
  provider?: unknown;
  compress_max_seconds?: unknown;
};

type SiteSettingsResponse = {
  public_config?: {
    video_upload?: Partial<Record<VideoUploadPurpose, RawPolicy>>;
  };
};

type VideoUploadPolicies = Record<VideoUploadPurpose, VideoUploadPolicy>;

const CACHE_TTL_MS = 5 * 60 * 1000;
const LOCAL_POLICY: VideoUploadPolicy = {
  provider: 'local',
  compressMaxSeconds: 0,
};
const LOCAL_POLICIES: VideoUploadPolicies = {
  chat: LOCAL_POLICY,
  post: LOCAL_POLICY,
  reel: LOCAL_POLICY,
  story: LOCAL_POLICY,
};

let cachedPolicies: VideoUploadPolicies | null = null;
let cachedAt = 0;
let inFlight: Promise<VideoUploadPolicies> | null = null;

function toPolicy(raw: RawPolicy | undefined): VideoUploadPolicy {
  if (raw?.provider !== 'bunny_stream') return LOCAL_POLICY;
  const seconds = Number(raw.compress_max_seconds);
  return {
    provider: 'bunny_stream',
    compressMaxSeconds: Number.isFinite(seconds) && seconds >= 0 ? seconds : 180,
  };
}

function toPolicies(raw: SiteSettingsResponse): VideoUploadPolicies {
  const videoUpload = raw.public_config?.video_upload;
  return {
    chat: toPolicy(videoUpload?.chat),
    post: toPolicy(videoUpload?.post),
    reel: toPolicy(videoUpload?.reel),
    story: toPolicy(videoUpload?.story),
  };
}

/**
 * The admin can switch Bunny on or off at any time, so the answer is cached
 * only briefly. Any failure means "upload to this server", which always works.
 */
export async function getVideoUploadPolicy(
  purpose: VideoUploadPurpose,
  now = Date.now(),
): Promise<VideoUploadPolicy> {
  if (cachedPolicies && now - cachedAt < CACHE_TTL_MS) return cachedPolicies[purpose];
  if (!inFlight) {
    inFlight = apiBridge
      .post<SiteSettingsResponse>(apiRoutes.auth.siteSettings)
      .then(response => {
        cachedPolicies = toPolicies(response ?? {});
        cachedAt = Date.now();
        return cachedPolicies;
      })
      .catch(() => LOCAL_POLICIES)
      .finally(() => {
        inFlight = null;
      });
  }
  return (await inFlight)[purpose];
}

export function getChatVideoUploadPolicy(now = Date.now()): Promise<VideoUploadPolicy> {
  return getVideoUploadPolicy('chat', now);
}

export function resetVideoUploadPolicyCache() {
  cachedPolicies = null;
  cachedAt = 0;
  inFlight = null;
}
