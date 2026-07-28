import type { ApiFile } from '../../../shared-kernel/domain/types/api.types';
import type {
  ProfileMediaKind,
  ProfileMediaSnapshot,
  ProfileMediaUpdateResult,
} from '../../domain/types/profileMedia.types';

export const PROFILE_MEDIA_CONTRACT = 'canonical_crop_v1';

export type RawProfileMediaResponse = {
  api_status?: number | string;
  error_code?: string;
  message?: string;
  errors?: {
    error_id?: unknown;
    error_text?: string;
  };
  profile_media?: {
    kind?: unknown;
    url?: unknown;
    full_url?: unknown;
    post_id?: unknown;
    post_type?: unknown;
  };
};

type ProfileMediaUploadDependencies = {
  upload: (file: ApiFile) => Promise<ProfileMediaUpdateResult>;
  loadSnapshot: () => Promise<ProfileMediaSnapshot | null>;
  /**
   * Snapshot already rendered by the profile screen. Supplying it avoids a
   * blocking profile refetch before the normal upload path. `loadSnapshot`
   * remains the authoritative fallback when an ambiguous upload must be
   * reconciled.
   */
  beforeSnapshot?: ProfileMediaSnapshot | null;
  wait?: (milliseconds: number) => Promise<void>;
  reconciliationAttempts?: number;
};

type ProfileMediaContractFallbackDependencies = {
  uploadCanonical: () => Promise<ProfileMediaUpdateResult>;
  uploadLegacy: () => Promise<ProfileMediaUpdateResult>;
};

const DEFAULT_RECONCILIATION_ATTEMPTS = 5;
const RECONCILIATION_DELAY_MS = 250;

class ProfileMediaReconciliationRequiredError extends Error {
  readonly code = 'PROFILE_MEDIA_RECONCILIATION_REQUIRED';

  constructor() {
    super('profile_media_invalid_response');
    this.name = 'ProfileMediaReconciliationRequiredError';
  }
}

export function buildProfileMediaUploadPayload(
  kind: ProfileMediaKind,
  file: ApiFile,
) {
  return {
    profile_media_contract: PROFILE_MEDIA_CONTRACT,
    [kind]: file,
  };
}

export function buildLegacyProfileMediaUploadPayload(
  kind: ProfileMediaKind,
  file: ApiFile,
) {
  return {
    [kind]: file,
  };
}

export function shouldRetryProfileMediaUploadWithoutContract(
  kind: ProfileMediaKind,
  error: unknown,
) {
  if (kind !== 'cover' || !error || typeof error !== 'object') {
    return false;
  }

  const response = (
    error as {
      response?: {
        data?: RawProfileMediaResponse;
      };
    }
  ).response;
  const errorCode =
    response?.data?.error_code || response?.data?.errors?.error_id;

  // Some deployed API versions still validate cover photos using the legacy
  // wide geometry. The app exports the newer canonical 16:9 crop, so retry
  // only this explicit compatibility rejection without the contract marker.
  return errorCode === 'profile_media_invalid_geometry';
}

export async function uploadProfileMediaWithContractFallback(
  kind: ProfileMediaKind,
  dependencies: ProfileMediaContractFallbackDependencies,
) {
  try {
    return await dependencies.uploadCanonical();
  } catch (error) {
    if (!shouldRetryProfileMediaUploadWithoutContract(kind, error)) {
      throw error;
    }

    return dependencies.uploadLegacy();
  }
}

function expectedPostType(kind: ProfileMediaKind) {
  return kind === 'avatar' ? 'profile_picture' : 'profile_cover_picture';
}

export function parseProfileMediaUpdateResponse(
  response: RawProfileMediaResponse,
  expectedKind: ProfileMediaKind,
): ProfileMediaUpdateResult {
  const media = response.profile_media;
  const url = typeof media?.url === 'string' ? media.url : '';
  const fullUrl = typeof media?.full_url === 'string' ? media.full_url : '';
  const postId =
    typeof media?.post_id === 'string' || typeof media?.post_id === 'number'
      ? String(media.post_id)
      : '';
  const postType = expectedPostType(expectedKind);

  if (String(response.api_status) !== '200') {
    const serverMessage =
      response.errors?.error_text || response.message || response.error_code;
    throw new Error(serverMessage || 'profile_media_update_failed');
  }

  if (
    media?.kind !== expectedKind ||
    media?.post_type !== postType ||
    !url ||
    !fullUrl ||
    !/^[1-9][0-9]*$/.test(postId)
  ) {
    // Older VNSEEA API deployments only return `api_status: 200` after a
    // successful upload. Treat that response as accepted and reconcile it
    // from the user profile instead of reporting a false failure.
    throw new ProfileMediaReconciliationRequiredError();
  }

  return {
    kind: expectedKind,
    url,
    fullUrl,
    postId,
    postType,
  };
}

function snapshotValue(
  snapshot: ProfileMediaSnapshot | null,
  kind: ProfileMediaKind,
) {
  if (!snapshot) return null;

  return kind === 'avatar'
    ? {
        url: snapshot.avatarUrl,
        postId: snapshot.avatarPostId,
      }
    : {
        url: snapshot.coverUrl,
        postId: snapshot.coverPostId,
      };
}

function isAmbiguousUploadError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return true;
  }

  const candidate = error as {
    code?: string;
    message?: string;
    response?: unknown;
  };
  if (candidate.code === 'PROFILE_MEDIA_RECONCILIATION_REQUIRED') {
    return true;
  }
  if (candidate.response) return false;

  const value = `${candidate.code ?? ''} ${
    candidate.message ?? ''
  }`.toLowerCase();
  return (
    value.includes('network') ||
    value.includes('timeout') ||
    value.includes('econnaborted') ||
    value.includes('err_network') ||
    value.trim() === ''
  );
}

function wasAcceptedByLegacyApi(error: unknown) {
  return (
    error instanceof ProfileMediaReconciliationRequiredError ||
    (typeof error === 'object' &&
      error !== null &&
      (error as { code?: string }).code ===
        'PROFILE_MEDIA_RECONCILIATION_REQUIRED')
  );
}

function wait(milliseconds: number) {
  return new Promise<void>(resolve => setTimeout(resolve, milliseconds));
}

export async function uploadProfileMediaWithReconciliation(
  kind: ProfileMediaKind,
  file: ApiFile,
  dependencies: ProfileMediaUploadDependencies,
): Promise<ProfileMediaUpdateResult> {
  let before: ProfileMediaSnapshot | null = null;
  if (Object.prototype.hasOwnProperty.call(dependencies, 'beforeSnapshot')) {
    before = dependencies.beforeSnapshot ?? null;
  } else {
    try {
      before = await dependencies.loadSnapshot();
    } catch {
      before = null;
    }
  }

  try {
    return await dependencies.upload(file);
  } catch (error) {
    const acceptedByLegacyApi = wasAcceptedByLegacyApi(error);
    if (!isAmbiguousUploadError(error) || (!before && !acceptedByLegacyApi)) {
      throw error;
    }

    const attempts = Math.max(
      1,
      dependencies.reconciliationAttempts ?? DEFAULT_RECONCILIATION_ATTEMPTS,
    );
    const waitForRetry = dependencies.wait ?? wait;
    const previousValue = snapshotValue(before, kind);

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (attempt > 0) {
        await waitForRetry(RECONCILIATION_DELAY_MS * attempt);
      }

      let after: ProfileMediaSnapshot | null = null;
      try {
        after = await dependencies.loadSnapshot();
      } catch {
        continue;
      }

      const nextValue = snapshotValue(after, kind);
      const hasUsableMedia =
        Boolean(nextValue?.url) && Boolean(nextValue?.postId);
      const changed =
        hasUsableMedia &&
        (!previousValue ||
          nextValue?.postId !== previousValue.postId ||
          nextValue?.url !== previousValue.url);

      if (
        (!changed && !(acceptedByLegacyApi && !previousValue)) ||
        !nextValue?.url ||
        !nextValue.postId
      ) {
        continue;
      }

      return {
        kind,
        url: nextValue.url,
        fullUrl: nextValue.url,
        postId: nextValue.postId,
        postType: expectedPostType(kind),
        reconciled: true,
      };
    }

    throw error;
  }
}
