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
};

export function buildProfileMediaUploadPayload(
  kind: ProfileMediaKind,
  file: ApiFile,
) {
  return {
    profile_media_contract: PROFILE_MEDIA_CONTRACT,
    [kind]: file,
  };
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

  if (
    String(response.api_status) !== '200' ||
    media?.kind !== expectedKind ||
    media?.post_type !== postType ||
    !url ||
    !fullUrl ||
    !/^[1-9][0-9]*$/.test(postId)
  ) {
    const serverMessage =
      response.errors?.error_text || response.message || response.error_code;
    throw new Error(serverMessage || 'profile_media_invalid_response');
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

export async function uploadProfileMediaWithReconciliation(
  kind: ProfileMediaKind,
  file: ApiFile,
  dependencies: ProfileMediaUploadDependencies,
): Promise<ProfileMediaUpdateResult> {
  let before: ProfileMediaSnapshot | null = null;
  try {
    before = await dependencies.loadSnapshot();
  } catch {
    before = null;
  }

  try {
    return await dependencies.upload(file);
  } catch (error) {
    if (!isAmbiguousUploadError(error) || !before) {
      throw error;
    }

    let after: ProfileMediaSnapshot | null = null;
    try {
      after = await dependencies.loadSnapshot();
    } catch {
      throw error;
    }

    const previousValue = snapshotValue(before, kind);
    const nextValue = snapshotValue(after, kind);
    const changed =
      Boolean(nextValue?.url) &&
      Boolean(nextValue?.postId) &&
      (nextValue?.postId !== previousValue?.postId ||
        nextValue?.url !== previousValue?.url);

    if (!changed || !nextValue?.url || !nextValue.postId) {
      throw error;
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
}
